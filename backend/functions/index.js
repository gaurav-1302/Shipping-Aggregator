/**
 * Cloud Functions for Umaxship - Shipping and Logistics Management
 */
const cors = require('cors');
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const axios = require("axios");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const serviceAccount = require("./umaxship-firebase.json"); // Keep this for local emulation if needed, but ensure it's gitignored
const Razorpay = require("razorpay");
const crypto = require("crypto");
const functions = require("firebase-functions");
const corsHandler = cors({ origin: true });
const nodemailer = require('nodemailer');
const xml2js = require('xml2js');
const FormData = require("form-data");

// Initialize Firebase Admin SDK
// For deployed functions, environment variables are preferred over serviceAccount file.
// However, initializeApp() without arguments might work if GOOGLE_APPLICATION_CREDENTIALS is set.
// For clarity and explicit control, especially with multiple projects, using config is better.
if (!admin.apps.length) {
  admin.initializeApp({
    // Use environment variables for deployed functions
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID, // Standard Firebase env var
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') // Handle newline characters
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL // Your Realtime Database URL
  });
} else {
  admin.app(); // if already initialized, use that one
}


/**
 * Global variables to store authentication tokens for different courier services.
 */
let delhiveryToken = null;
let XBeesToken = null;
let shiprocketAuthToken = null;

// Function to generate a new Shiprocket authentication token
async function generateShiprocketAuthToken() {
  try {
    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: process.env.SHIPROCKET_EMAIL, // Use environment variable
      password: process.env.SHIPROCKET_PASSWORD // Use environment variable
    });

    shiprocketAuthToken = response.data.token;
    console.log('New Shiprocket authentication token generated.'); // Avoid logging the token itself

    // Schedule this function to run again after 9 days
    // Note: Scheduling within a function like this might lead to multiple schedules if the function restarts.
    // Consider using a single scheduled function definition outside this function.
    // scheduleGenerateAuthToken(); // Commenting out for potential duplication issue
  } catch (error) {
    console.error('Error generating Shiprocket authentication token:', error.response ? error.response.data : error.message);
  }
}

// Function to schedule generating authentication token after 9 days
// It's better to define this as a separate scheduled function
// function scheduleGenerateAuthToken() {
//   const currentTime = new Date().getTime();
//   const nineDaysInMillis = 9 * 24 * 60 * 60 * 1000;
//   const nextRunTime = currentTime + nineDaysInMillis;

//   // Schedule the function to run again after 9 days
//   functions.pubsub.schedule(new Date(nextRunTime)).onRun((context) => {
//     generateShiprocketAuthToken();
//   });
// }

// Initialize shiprocketAuthToken initially
// generateShiprocketAuthToken(); // Call this from a reliable initialization point or scheduled function

/**
 * Fetches and stores the Delhivery B2B API token.
 * @returns {Promise<string>} The Delhivery API token.
 */
async function getDelhiveryToken() {
  try {
    const response = await fetch('https://btob.api.delhivery.com/ums/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: process.env.DELHIVERY_B2B_USERNAME, // Use environment variable
        password: process.env.DELHIVERY_B2B_PASSWORD  // Use environment variable
      })
    });

    if (!response.ok) {
      const errorResponse = await response.json();
      throw new Error(`Error: ${errorResponse.message}`);
    }

    const data = await response.json();
    delhiveryToken = data.jwt;
    console.log('Delhivery B2B Token retrieved and stored.'); // Avoid logging the token
    return delhiveryToken;
  } catch (error) {
    console.error("Error during Delhivery B2B login:", error);
    throw error;
  }
}

/**
 * Fetches and stores the XpressBees API token.
 * @returns {Promise<string>} The XpressBees API token.
 */
async function getXpreessBeesToken() {
  try {
    const response = await fetch('https://shipment.xpressbees.com/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: process.env.XPRESSBEES_EMAIL, // Use environment variable
        password: process.env.XPRESSBEES_PASSWORD // Use environment variable
      })
    });

    if (!response.ok) {
      const errorResponse = await response.json();
      throw new Error(`Error: ${errorResponse.message}`);
    }

    const token = await response.json();
    XBeesToken = token.data;
    console.log('XpressBees Token retrieved and stored.'); // Avoid logging the token
    return XBeesToken;
  } catch (error) {
    console.error("Error during XpressBees login:", error);
    throw error;
  }
}

/**
 * Generates a random pickup ID.
 * @returns {string} A random pickup ID.
 */
function generateRandomPickupId() {
  const randomPart = Math.floor(1000 + Math.random() * 9000); // Generates a 4-digit random number
  return `123${randomPart}`;
}

/**
 * Fetches tracking details for an order based on the courier ID.
 * @param {string} orderId - The ID of the order.
 * @param {string} waybill - The waybill number.
 * @param {number} courierId - The ID of the courier.
 * @param {string} LRno - The LR number (for B2B Delhivery).
 */
async function fetchTrackingDetails(orderId, waybill, courierId, LRno) {
  try {
    if (courierId === 999) {
      await trackDelhivery(orderId, waybill);
    } else if ([1, 6, 8, 12298, 4, 2, 3, 12939, 12938].includes(courierId)) {
      await trackXpressBees(orderId, waybill);
    } else if (courierId === 5) {
      await trackB2BDelhivery(orderId, LRno);
    } else {
      console.error(`Invalid courierId: ${courierId} for orderId: ${orderId}`);
    }
  } catch (error) {
    console.error(`Error fetching tracking details for waybill ${waybill}:`, error);
  }
}

/**
 * Tracks a shipment using the Delhivery API.
 * @param {string} orderId - The ID of the order.
 * @param {string} waybill - The waybill number.
 */
async function trackDelhivery(orderId, waybill) {
  const apiUrl = `https://track.delhivery.com/api/v1/packages/json/?waybill=${waybill}`;
  const apiKey = process.env.DELHIVERY_API_KEY; // Use environment variable

  if (!apiKey) {
      console.error("DELHIVERY_API_KEY environment variable not set.");
      return;
  }

  const fetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${apiKey}`
    }
  };

  const response = await fetch(apiUrl, fetchOptions);
  const responseData = await response.json();

  if (responseData && responseData.ShipmentData && responseData.ShipmentData.length > 0 && responseData.ShipmentData[0].Shipment && responseData.ShipmentData[0].Shipment.Status) {
    const currentStatus = responseData.ShipmentData[0].Shipment.Status.Status.toUpperCase();
    await admin.firestore().collection('orders').doc(orderId).update({
      current_status: currentStatus
    });
    console.log(`Current status updated for order ${orderId}: ${currentStatus}`);
  } else {
    console.error(`Could not parse status for Delhivery waybill ${waybill}. Response:`, responseData);
  }
}

/**
 * Tracks a shipment using the XpressBees API.
 * @param {string} orderId - The ID of the order.
 * @param {string} waybill - The waybill number.
 */
async function trackXpressBees(orderId, waybill) {
  if (!XBeesToken) {
    await getXpreessBeesToken();
  }
  if (!XBeesToken) { // Check again if token fetch failed
      console.error("XpressBees token is not available.");
      return;
  }

  const apiUrl = `https://shipment.xpressbees.com/api/shipments2/track/${waybill}`;

  const fetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${XBeesToken}` // Note: XpressBees might use 'Bearer' or other schemes, verify their docs
    }
  };

  const response = await fetch(apiUrl, fetchOptions);
  const responseData = await response.json();

  if (responseData && responseData.data && responseData.data.status) {
    const currentStatus = responseData.data.status.toUpperCase();
    const id = responseData.data.order_number; // Assuming this matches your Firestore orderId

    // Ensure the ID matches the expected orderId before updating
    if (id === orderId) {
        await admin.firestore().collection('orders').doc(id).update({
            current_status: currentStatus
        });
        console.log(`Current status updated for order ${orderId}: ${currentStatus}`);
    } else {
        console.warn(`Order ID mismatch for XpressBees waybill ${waybill}. Expected ${orderId}, got ${id}.`);
        // Optionally update based on waybill if order_number isn't reliable
        // const orderQuery = await admin.firestore().collection('orders').where('awb_id', '==', waybill).limit(1).get();
        // if (!orderQuery.empty) {
        //     const docId = orderQuery.docs[0].id;
        //     await admin.firestore().collection('orders').doc(docId).update({ current_status: currentStatus });
        //     console.log(`Current status updated for order ${docId} (found by waybill): ${currentStatus}`);
        // }
    }
  } else {
      console.error(`Could not parse status for XpressBees waybill ${waybill}. Response:`, responseData);
  }
}

/**
 * Tracks a B2B shipment using the Delhivery API.
 * @param {string} orderId - The ID of the order.
 * @param {string} LRno - The LR number.
 */
async function trackB2BDelhivery(orderId, LRno) {
  if (!delhiveryToken) {
    await getDelhiveryToken();
  }
  if (!delhiveryToken) { // Check again if token fetch failed
      console.error("Delhivery B2B token is not available.");
      return;
  }

  const apiUrl = `https://btob.api.delhivery.com/v3/track/${LRno}`;

  const fetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${delhiveryToken}`
    }
  };

  const response = await fetch(apiUrl, fetchOptions);
  const responseData = await response.json();

  if (responseData && responseData.data && responseData.data.status) {
    const detailedStatus = responseData.data.status.toUpperCase();

    // Mapping detailed statuses to simplified statuses
    let currentStatus;
    switch (detailedStatus) {
      case 'MANIFESTED':
        currentStatus = 'MANIFESTED';
        break;
      case 'PICKED_UP':
        currentStatus = 'PICKED';
        break;
      case 'LEFT_ORIGIN':
      case 'REACH_DESTINATION':
      case 'UNDEL_REATTEMPT':
      case 'PART_DEL':
      case 'OFD':
        currentStatus = 'IN TRANSIT';
        break;
      case 'DELIVERED':
        currentStatus = 'DELIVERED';
        break;
      default:
        currentStatus = 'IN TRANSIT'; // Default for other statuses
        break;
    }

    await admin.firestore().collection('orders').doc(orderId).update({
      current_status: currentStatus
    });

    console.log(`Current status updated for order ${orderId}: ${currentStatus}`);
  } else {
      console.error(`Could not parse status for Delhivery B2B LRNo ${LRno}. Response:`, responseData);
  }
}

/**
 * Generates a Razorpay order ID.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.generateRazorpayOrderId = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {

    const { order_id, order_amount, customer_id, customer_name, customer_email, customer_phone, } = req.body;

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
        console.error("Razorpay credentials are not set in environment variables.");
        return res.status(500).send('Server configuration error.');
    }

    if (order_amount < 500) {
      return res.status(400).send("Order Amount should be greater than or equal to 500.") // Corrected amount and status code
    }
    const options = {
      amount: order_amount, // Amount is in paise
      currency: "INR",
      receipt: order_id
    }

    try {
      const razorpay = new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret
      })

      const order = await razorpay.orders.create(options);

      if (!order) {
        return res.status(500).send("Error creating Razorpay order")
      }

      res.status(200).json(order)

    } catch (error) {
      console.error("Error generating Razorpay order ID:", error);
      res.status(500).send('Error generating order ID');
    }
  });
});

/**
 * Validates a Razorpay payment.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.validateRazorpayPayment = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
        console.error("Razorpay credentials are not set in environment variables.");
        return res.status(500).send('Server configuration error.');
    }

    try {
      console.log('Request received:', req.body);

      const { order_id, payment_id, signature, userId } = req.body;

      // Check if all required fields are present
      if (!order_id || !payment_id || !signature || !userId) {
        console.error('Missing required fields:', { order_id, payment_id, signature, userId });
        return res.status(400).json({ message: 'Missing required fields' });
      }

      console.log('Fields present:', { order_id, payment_id, signature, userId });

      const secretKey = razorpayKeySecret; // Use the secret from env
      const sha = crypto.createHmac('sha256', secretKey);
      sha.update(`${order_id}|${payment_id}`);
      const digest = sha.digest('hex');

      // Verify signature
      if (digest !== signature) {
        console.error('Signature mismatch:', { digest, signature });
        return res.status(400).json({ message: 'Transaction is not legit' });
      }

      console.log('Signature verified');

      const instance = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
      const paymentDetails = await instance.payments.fetch(payment_id);

      if (!paymentDetails) {
        console.error('Payment details not found:', payment_id);
        return res.status(403).send("Payment details not found"); // 403 might not be the best status, maybe 404 or 400
      }

      console.log('Payment details fetched:', paymentDetails);

      if (paymentDetails.status === "captured" && paymentDetails.captured === true) {
        const amount = Number(paymentDetails.amount / 100); // Amount from Razorpay is in paise

        // Calculate the discount based on the amount
        let discount = 0;
        if (amount >= 5000 && amount < 10000) {
          discount = amount * 0.01;
        } else if (amount >= 10000 && amount < 20000) {
          discount = amount * 0.02;
        } else if (amount >= 20000 && amount < 30000) {
          discount = amount * 0.04;
        } else if (amount >= 30000 && amount < 50000) {
          discount = amount * 0.06;
        } else if (amount >= 50000) {
          discount = amount * 0.08;
        }
        discount = Number(discount.toFixed(2)); // Ensure discount is rounded

        console.log('Discount calculated:', discount);

        const userWalletRef = admin.firestore().collection('wallets').doc(userId);
        const transactionRefBase = admin.firestore().collection('transactions'); // Base ref for transactions

        await admin.firestore().runTransaction(async (transaction) => {
          const walletDoc = await transaction.get(userWalletRef);

          let currentBalance = 0;
          if (walletDoc.exists) {
              currentBalance = walletDoc.data().balance || 0;
          } else {
              console.log('Wallet document does not exist. Creating new document.');
          }

          const newBalance = Number((currentBalance + amount + discount).toFixed(2)); // Calculate new balance

          // Set or Update wallet balance
          if (!walletDoc.exists) {
              transaction.set(userWalletRef, { balance: newBalance });
          } else {
              transaction.update(userWalletRef, { balance: newBalance });
          }

          // Construct transaction data for the payment
          const transactionDataPayment = {
            amount: amount,
            created_at: admin.firestore.Timestamp.now(),
            status: "Success",
            transaction_details: `Payment received via Razorpay (ID: ${payment_id})`,
            transaction_type: "Credit",
            user_id: userId
          };
          // Add transaction record for the payment using a generated ID
          transaction.set(transactionRefBase.doc(), transactionDataPayment);

          // Construct transaction data for the discount
          if (discount > 0) {
            const transactionDataDiscount = {
              amount: discount,
              created_at: admin.firestore.Timestamp.now(),
              status: "Success",
              transaction_details: `Discount applied for Razorpay payment (ID: ${payment_id})`,
              transaction_type: "Credit",
              user_id: userId
            };
            // Add transaction record for the discount using a generated ID
            transaction.set(transactionRefBase.doc(), transactionDataDiscount);
          }
        });

        console.log("Updated wallet and added transaction records");

        // If the transaction is legit, respond with success
        return res.json({
          message: 'success',
          orderId: order_id,
          paymentId: payment_id,
        });
      } else {
        console.error('Payment not captured:', paymentDetails);
        return res.status(400).json({ message: 'Payment not captured' });
      }
    } catch (error) {
      console.error('Error validating payment:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
});

/**
 * Creates warehouses dynamically in B2B Delhivery and Shiprocket portals.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.dynamicWarehouse = onRequest(async (req, res) => {
  // Note: This function seems designed for manual triggering to sync all warehouses.
  // Consider if this is still needed or if the onDocumentCreated trigger is sufficient.
  try {
    // Get all warehouses from Firestore
    const warehousesSnapshot = await admin.firestore().collection('warehouses').get();
    const warehouses = warehousesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const responseArray = [];
    const delhiveryB2BApiUrl = 'https://track.delhivery.com/api/backend/clientwarehouse/create/'; // Verify this URL, might be B2B specific
    const shiprocketApiUrl = 'https://apiv2.shiprocket.in/v1/external/settings/company/addpickup';

    /**
     * Creates a warehouse in the B2B Delhivery portal.
     */
    async function createWarehouseInB2B(warehouseData) {
      if (!delhiveryToken) {
        await getDelhiveryToken();
      }
      if (!delhiveryToken) return; // Skip if token fetch failed

      const requestData = {
        name: warehouseData.pickup_location,
        registered_name: warehouseData.name,
        email: warehouseData.email,
        phone: warehouseData.phone,
        address: warehouseData.address,
        city: warehouseData.city,
        country: warehouseData.country,
        pin: String(warehouseData.pin_code),
        return_address: warehouseData.address,
        return_pin: String(warehouseData.pin_code),
        return_city: warehouseData.city,
        return_state: warehouseData.state, // Use state field
        return_country: warehouseData.country,
      };

      const request = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${delhiveryToken}`
        },
        body: JSON.stringify(requestData)
      };

      try {
          const response = await fetch(delhiveryB2BApiUrl, request); // Use B2B URL
          const responseText = await response.text();

          if (response.ok) {
            responseArray.push(`Warehouse creation for B2B Delhivery successful: ${warehouseData.pickup_location}`);
          } else {
            responseArray.push(`Error creating warehouse for B2B Delhivery: ${responseText}`);
          }
          console.log("B2B Delhivery Response:", response.status, responseText);
      } catch (error) {
          console.error(`Error creating B2B Delhivery warehouse ${warehouseData.pickup_location}:`, error);
          responseArray.push(`Error creating B2B Delhivery warehouse: ${error.message}`);
      }
    }

    /**
     * Creates a warehouse in the Shiprocket portal.
     */
    async function createWarehouseShiprocket(warehouseData) {
      if (!shiprocketAuthToken) {
        await generateShiprocketAuthToken();
      }
      if (!shiprocketAuthToken) return; // Skip if token fetch failed

      const data = JSON.stringify({
        "pickup_location": warehouseData.pickup_location,
        "name": warehouseData.name,
        "email": warehouseData.email,
        "phone": warehouseData.phone,
        "address": warehouseData.address,
        "address_2": warehouseData.address_2 || "", // Include address_2 if available
        "city": warehouseData.city,
        "state": warehouseData.state, // Use state field
        "country": warehouseData.country,
        "pin_code": String(warehouseData.pin_code),
      });

      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${shiprocketAuthToken}`
        },
        body: data,
        redirect: 'follow'
      };

      try {
          const response = await fetch(shiprocketApiUrl, requestOptions);
          const responseText = await response.text(); // Read as text first

          let responseJson = {};
          try {
              responseJson = JSON.parse(responseText); // Try parsing as JSON
          } catch (e) {
              console.warn("Shiprocket response was not valid JSON:", responseText);
          }

          if (response.ok && responseJson.status_code === 1) { // Check Shiprocket's success indicator
            responseArray.push(`Warehouse creation for Shiprocket successful: ${warehouseData.pickup_location}`);
          } else {
            responseArray.push(`Error creating warehouse for Shiprocket: ${responseText}`);
          }
          console.log("Shiprocket Response:", response.status, responseText);
      } catch (error) {
          console.error(`Error creating Shiprocket warehouse ${warehouseData.pickup_location}:`, error);
          responseArray.push(`Error creating Shiprocket warehouse: ${error.message}`);
      }
    }

    // Iterate through each warehouse and create
    for (const warehouse of warehouses) {
      await createWarehouseInB2B(warehouse);
      await createWarehouseShiprocket(warehouse);
    }

    res.status(200).send(responseArray);
  } catch (error) {
    console.error('Error in dynamicWarehouse:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});


/**
 * Creates warehouses in different courier portals when a new warehouse document is created in Firestore.
 * @param {object} event - The event object.
 */
exports.createWarehouses = onDocumentCreated('warehouses/{warehouseId}', async (event) => {
  try {
    const warehouseId = event.params.warehouseId;
    const pickupLocationData = event.data.data();

    if (!pickupLocationData) {
        console.error(`No data found for warehouse ${warehouseId}`);
        return;
    }

    const responseArray = [];
    const delhiveryApiKey = process.env.DELHIVERY_API_KEY; // B2C Key
    const delhiveryB2BApiUrl = 'https://track.delhivery.com/api/backend/clientwarehouse/create/'; // Verify this URL
    const shiprocketApiUrl = 'https://apiv2.shiprocket.in/v1/external/settings/company/addpickup';

    const baseRequestData = {
      name: pickupLocationData.pickup_location,
      registered_name: pickupLocationData.name,
      email: pickupLocationData.email,
      phone: String(pickupLocationData.phone), // Ensure phone is string
      address: pickupLocationData.address,
      city: pickupLocationData.city,
      country: pickupLocationData.country,
      pin: String(pickupLocationData.pin_code), // Ensure pin is string
      return_address: pickupLocationData.address,
      return_pin: String(pickupLocationData.pin_code),
      return_city: pickupLocationData.city,
      return_state: pickupLocationData.state,
      return_country: pickupLocationData.country,
    };

    // --- B2C Delhivery Warehouse Creation ---
    async function warehouseForDelhiveryB2C() {
      if (!delhiveryApiKey) {
        console.error("DELHIVERY_API_KEY not set for B2C warehouse creation.");
        responseArray.push("Skipped B2C Delhivery: API Key missing.");
        return;
      }

      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Token ${delhiveryApiKey}`
        },
        body: JSON.stringify(baseRequestData) // Use base data
      };

      try {
          const response = await fetch(delhiveryB2BApiUrl, requestOptions); // Assuming same URL for B2C? Verify.
          const responseText = await response.text();
          console.log("B2C Delhivery Response:", response.status, responseText);
          if (response.ok) {
            responseArray.push("Warehouse creation for B2C Delhivery successful");
          } else {
            responseArray.push(`Error creating B2C Delhivery warehouse: ${responseText}`);
          }
      } catch (error) {
          console.error('Error creating B2C Delhivery warehouse:', error);
          responseArray.push(`Error creating B2C Delhivery warehouse: ${error.message}`);
      }
    }

    // --- B2B Delhivery Warehouse Creation ---
    async function warehouseForDelhiveryB2B() {
      if (!delhiveryToken) {
        await getDelhiveryToken();
      }
      if (!delhiveryToken) {
          responseArray.push("Skipped B2B Delhivery: Token unavailable.");
          return; // Skip if token fetch failed
      }

      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${delhiveryToken}`
        },
        body: JSON.stringify(baseRequestData) // Use base data
      };

      try {
        const response = await fetch(delhiveryB2BApiUrl, requestOptions); // Use B2B URL
        const responseText = await response.text();
        console.log("B2B Delhivery Response:", response.status, responseText);
        if (response.ok) {
          responseArray.push("Warehouse creation for B2B Delhivery successful");
        } else {
          responseArray.push(`Error creating B2B Delhivery warehouse: ${responseText}`);
        }
      } catch (error) {
        console.error('Error creating B2B Delhivery warehouse:', error);
        responseArray.push(`Error creating B2B Delhivery warehouse: ${error.message}`);
      }
    }

    // --- Shiprocket Warehouse Creation ---
    async function createWarehouseShiprocket() {
      if (!shiprocketAuthToken) {
        await generateShiprocketAuthToken();
      }
      if (!shiprocketAuthToken) {
          responseArray.push("Skipped Shiprocket: Token unavailable.");
          return; // Skip if token fetch failed
      }

      const shiprocketData = JSON.stringify({
        "pickup_location": pickupLocationData.pickup_location,
        "name": pickupLocationData.name,
        "email": pickupLocationData.email,
        "phone": String(pickupLocationData.phone), // Ensure string
        "address": pickupLocationData.address,
        "address_2": pickupLocationData.address_2 || "",
        "city": pickupLocationData.city,
        "state": pickupLocationData.state,
        "country": pickupLocationData.country,
        "pin_code": String(pickupLocationData.pin_code), // Ensure string
      });

      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${shiprocketAuthToken}`
        },
        body: shiprocketData,
        redirect: 'follow'
      };

      try {
          const response = await fetch(shiprocketApiUrl, requestOptions);
          const responseText = await response.text(); // Read as text first
          console.log("Shiprocket Response:", response.status, responseText);

          let responseJson = {};
          try {
              responseJson = JSON.parse(responseText);
          } catch (e) {
              console.warn("Shiprocket response was not valid JSON:", responseText);
          }

          if (response.ok && responseJson.status_code === 1) {
            responseArray.push("Warehouse creation for Shiprocket successful");
          } else {
            responseArray.push(`Error creating Shiprocket warehouse: ${responseText}`);
          }
      } catch (error) {
          console.error('Error creating Shiprocket warehouse:', error);
          responseArray.push(`Error creating Shiprocket warehouse: ${error.message}`);
      }
    }

    // Execute creation functions
    await warehouseForDelhiveryB2C();
    await warehouseForDelhiveryB2B();
    await createWarehouseShiprocket();

    // Save the combined response in the corresponding warehouse document
    const warehouseRef = admin.firestore().collection('warehouses').doc(warehouseId);
    await warehouseRef.update({ creation_responses: responseArray }); // Use a different field name
    console.log('Warehouse creation responses saved in Firestore.');

  } catch (error) {
    console.error('Error in createWarehouses trigger:', error);
    // Optionally update the Firestore doc with an error status
    const warehouseId = event.params.warehouseId;
    const warehouseRef = admin.firestore().collection('warehouses').doc(warehouseId);
    try {
        await warehouseRef.update({ creation_error: error.message });
    } catch (updateError) {
        console.error("Failed to update warehouse doc with error:", updateError);
    }
  }
});


/**
 * Creates an order in the respective courier portal when an order document is updated in Firestore.
 * @param {object} event - The event object.
 */
exports.createOrder = onDocumentUpdated('orders/{orderId}', async (event) => {
  try {
    const newValue = event.data.after.data();
    const previousValue = event.data.before.data();
    const orderId = event.params.orderId; // This is the Firestore document ID

    // Check if the status transition is correct and courier is assigned
    if (previousValue.current_status === 'UNSHIPPED' && newValue.current_status === 'READY TO SHIP' && newValue.courier_id != null) {
      const courierId = newValue.courier_id;
      const orderDataJsonString = newValue.data; // The JSON string containing order details

      if (!orderDataJsonString) {
          console.error(`Order data string is missing for order ${orderId}`);
          await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: "Order data missing" });
          return;
      }

      let orderjson;
      try {
          orderjson = JSON.parse(orderDataJsonString);
      } catch (parseError) {
          console.error(`Failed to parse order data for order ${orderId}:`, parseError);
          await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: "Invalid order data format" });
          return;
      }

      console.log("Parsed Order data:", orderjson);

      const pickupLocationRefrence = orderjson.pickup_location;
      if (!pickupLocationRefrence) {
          console.error(`Pickup location reference missing in order data for ${orderId}`);
          await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: "Pickup location missing" });
          return;
      }

      // Fetch pickup location details
      const pickupLocationSnapshot = await admin.firestore().collection('warehouses').where('pickup_location', '==', pickupLocationRefrence).limit(1).get();
      if (pickupLocationSnapshot.empty) {
        console.error(`Pickup location '${pickupLocationRefrence}' not found in warehouses collection for order ${orderId}`);
        await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: "Pickup location not found" });
        return;
      }
      const pickupLocationData = pickupLocationSnapshot.docs[0].data();
      console.log("Pickup data:", pickupLocationData);

      const order_items = orderjson.order_items;
      if (!order_items || order_items.length === 0) {
          console.error(`Order items missing for order ${orderId}`);
          await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: "Order items missing" });
          return;
      }
      console.log("Order items:", order_items);

      const current_date = new Date().toISOString(); // Use ISO format for consistency
      const orderSubTotal = Number(orderjson.sub_total) || 0;
      const paymentMethod = orderjson.payment_method || "Prepaid"; // Default to Prepaid if missing
      const orderWeightKg = Number(orderjson.weight) || 0.1; // Default weight if missing
      const orderLength = Number(orderjson.length) || 10; // Default dimensions
      const orderBreadth = Number(orderjson.breadth) || 10;
      const orderHeight = Number(orderjson.height) || 10;

      // Common function to handle wallet deduction and transaction logging
      const handleSuccessfulOrderCreation = async (awb, courierName) => {
          const rate = Number((newValue.courier_charges || 0).toFixed(2));
          if (rate <= 0) {
              console.warn(`Courier charges are zero or invalid for order ${orderId}. Skipping wallet deduction.`);
              return;
          }

          const userId = newValue.user_id;
          if (!userId) {
              console.error(`User ID missing for order ${orderId}. Cannot deduct from wallet.`);
              // Consider how to handle this - maybe revert status or flag for manual review
              return;
          }

          const walletDocRef = admin.firestore().collection('wallets').doc(userId);

          try {
              await admin.firestore().runTransaction(async (transaction) => {
                  const walletDoc = await transaction.get(walletDocRef);
                  if (!walletDoc.exists) {
                      throw new Error(`User wallet ${userId} not found.`);
                  }

                  const walletData = walletDoc.data();
                  const currentWalletAmount = Number(walletData.balance || 0);

                  if (currentWalletAmount < rate) {
                      throw new Error(`Insufficient funds in wallet ${userId}. Required: ${rate}, Available: ${currentWalletAmount}`);
                  }

                  const newWalletAmount = Number((currentWalletAmount - rate).toFixed(2));
                  transaction.update(walletDocRef, { balance: newWalletAmount });

                  // Create a transaction document
                  const transactionData = {
                      user_id: userId,
                      amount: rate,
                      transaction_details: `Order created (${courierName}) - AWB: ${awb}`,
                      transaction_type: 'Debit',
                      status: "Success",
                      created_at: admin.firestore.Timestamp.now(),
                      order_doc_id: orderId // Link transaction to the order document ID
                  };
                  // Add transaction document to the transactions collection
                  transaction.set(admin.firestore().collection('transactions').doc(), transactionData);

                  console.log(`Deducted ${rate} from wallet ${userId}. New balance: ${newWalletAmount}. AWB: ${awb}`);
              });
          } catch (walletError) {
              console.error(`Wallet transaction failed for order ${orderId} (AWB: ${awb}):`, walletError);
              // IMPORTANT: Decide how to handle this failure.
              // Should the order status be reverted? Should it be flagged?
              // Reverting the order status might be safest.
              await event.data.after.ref.update({
                  current_status: "UNSHIPPED",
                  error_message: `Wallet deduction failed: ${walletError.message}`,
                  // Optionally clear courier_id, courier_charges, awb_id if appropriate
                  // courier_id: null,
                  // courier_charges: null,
                  // awb_id: null,
              });
              throw walletError; // Re-throw to indicate the overall function failed
          }
      };

      // --- Courier Specific Logic ---

      if (courierId === 999) { // Delhivery B2C
        const apiKey = process.env.DELHIVERY_API_KEY;
        if (!apiKey) {
            console.error("DELHIVERY_API_KEY not set for B2C order creation.");
            await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: "Server config error (Delhivery Key)" });
            return;
        }
        const apiUrl = 'https://track.delhivery.com/api/cmu/create.json';

        const requestData = {
          shipments: [
            {
              name: orderjson.billing_customer_name,
              add: orderjson.billing_address,
              pin: Number(orderjson.billing_pincode),
              city: orderjson.billing_city,
              state: orderjson.billing_state,
              country: orderjson.billing_country,
              phone: String(orderjson.billing_phone),
              order: orderjson.order_id, // Use the original order ID from the JSON
              payment_mode: paymentMethod,
              return_pin: pickupLocationData.pin_code,
              return_city: pickupLocationData.city,
              return_phone: String(pickupLocationData.phone),
              return_add: pickupLocationData.address,
              return_state: pickupLocationData.state,
              return_country: pickupLocationData.country,
              products_desc: order_items.map(item => item.name).join(', ') || "Product", // Combine item names
              hsn_code: order_items[0]?.hsn || "", // Use HSN from first item or empty
              cod_amount: paymentMethod === "COD" ? orderSubTotal : "",
              order_date: current_date,
              total_amount: order_items.reduce((sum, item) => sum + (Number(item.selling_price) * (Number(item.units) || 1)), 0) || orderSubTotal, // Calculate total or use sub_total
              seller_add: pickupLocationData.address, // Use pickup address as seller address
              seller_name: pickupLocationData.name, // Use pickup name as seller name
              seller_inv: orderjson.order_id, // Use order ID as invoice number
              quantity: order_items.reduce((sum, item) => sum + (Number(item.units) || 1), 0) || 1, // Sum of units or 1
              waybill: "", // Let Delhivery assign
              shipment_width: orderBreadth,
              shipment_height: orderHeight,
              shipment_length: orderLength,
              weight: orderWeightKg, // Delhivery expects weight in KG for this API
              seller_gst_tin: pickupLocationData.gstin || "", // Add GSTIN if available
              shipping_mode: "Surface", // Or determine based on weight/service
              address_type: "home", // Or determine based on address if possible
            }
          ],
          pickup_location: {
            name: pickupLocationData.pickup_location,
            add: pickupLocationData.address,
            city: pickupLocationData.city,
            pin_code: Number(pickupLocationData.pin_code),
            country: pickupLocationData.country,
            phone: String(pickupLocationData.phone)
          }
        };

        console.log("Delhivery B2C Request Data:", JSON.stringify(requestData));

        const requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Token ${apiKey}`
          },
          // Delhivery's quirky format for this specific endpoint
          body: `format=json&data=${encodeURIComponent(JSON.stringify(requestData))}`
        };

        try {
            const response = await fetch(apiUrl, requestOptions);
            const responseData = await response.json();
            console.log('Response from Delhivery B2C API:', responseData);

            if (responseData.success && responseData.packages && responseData.packages.length > 0 && responseData.packages[0].status === "Success") {
                const awb = responseData.packages[0].waybill;
                await event.data.after.ref.update({
                    delhivery_response: responseData, // Store the raw response
                    awb_id: awb,
                    // order_id field in Firestore seems redundant if doc ID is orderId, but update if needed
                    // order_id: orderjson.order_id,
                    error_message: null // Clear previous errors
                });
                console.log(`Delhivery B2C order created successfully for ${orderId}. AWB: ${awb}`);
                await handleSuccessfulOrderCreation(awb, "Delhivery B2C");
            } else {
                const errorMessage = responseData.rmk || responseData.error || JSON.stringify(responseData);
                console.error(`Delhivery B2C API error for order ${orderId}:`, errorMessage);
                await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: `Delhivery B2C Error: ${errorMessage}` });
            }
        } catch (error) {
            console.error(`Error calling Delhivery B2C API for order ${orderId}:`, error);
            await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: `Network/Fetch Error (Delhivery B2C): ${error.message}` });
        }

      } else if (courierId === 5) { // Delhivery B2B (LTL)
        if (!delhiveryToken) {
          await getDelhiveryToken();
        }
        if (!delhiveryToken) {
            console.error("Delhivery B2B token is not available for order creation.");
            await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: "Server config error (Delhivery B2B Token)" });
            return;
        }
        const apiUrl = 'https://btob.api.delhivery.com/v3/manifest';

        // Calculate total count and weight for B2B
        const totalCount = order_items.reduce((sum, item) => sum + (Number(item.count) || 1), 0) || 1;
        const totalWeightKg = orderWeightKg; // Use the main weight

        const requestData = {
          ident: orderjson.order_id, // Unique identifier for the manifest request
          pickup_location: pickupLocationData.pickup_location,
          dropoff_location: {
            refnum: orderjson.order_id, // Reference number for dropoff
            consignee: orderjson.billing_customer_name,
            address: orderjson.billing_address,
            city: orderjson.billing_city,
            region: orderjson.billing_state,
            zip: String(orderjson.billing_pincode),
            phone: String(orderjson.billing_phone)
          },
          d_mode: paymentMethod === "COD" ? "CoD" : "Prepaid",
          amount: paymentMethod === "COD" ? orderSubTotal : 0,
          rov_insurance: orderjson.insurance || false, // Assuming insurance flag in orderjson
          invoices: [
            {
              ident: orderjson.order_id, // Invoice identifier
              n_value: orderSubTotal, // Invoice value
              ewaybill: orderjson.ewaybill || "" // Eway bill number if available
            }
          ],
          weight: totalWeightKg, // Total weight in KG
          suborders: [ // Details about the items being shipped
            {
              ident: orderjson.order_id, // Identifier for this suborder/package group
              count: totalCount, // Total number of packages/items
              description: orderjson.product_desc || order_items.map(item => item.name).join(', ') || "Goods",
              waybills: [] // Let Delhivery assign waybills
            }
          ],
          // Dimensions per item type if available, otherwise use overall dimensions
          dimensions: order_items.length > 0 ? order_items.map((item) => ({
            width: Number(item.breadth) || orderBreadth,
            height: Number(item.height) || orderHeight,
            length: Number(item.length) || orderLength,
            count: Number(item.count) || 1, // Count for this specific item type
          })) : [{ width: orderBreadth, height: orderHeight, length: orderLength, count: totalCount }],
          consignee_gst_tin: orderjson.billing_gstin || "", // Consignee GSTIN if available
          seller_gst_tin: pickupLocationData.gstin || "", // Seller GSTIN if available
          cb: {} // Callback details if needed
        };

        console.log("Delhivery B2B Request Data:", JSON.stringify(requestData));

        const requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${delhiveryToken}`
          },
          body: JSON.stringify(requestData)
        };

        try {
            const response = await fetch(apiUrl, requestOptions);
            const responseData = await response.json();
            console.log('Response from Delhivery B2B Manifest API:', responseData);

            if (responseData.job_id) {
                const jobId = responseData.job_id;
                // Store job_id temporarily, AWB/LRN will come later via polling or webhook
                await event.data.after.ref.update({ job_id: jobId, error_message: null });
                console.log(`Delhivery B2B manifest job created for ${orderId}. Job ID: ${jobId}. Waiting for AWB/LRN.`);
                // Note: Wallet deduction should happen *after* AWB/LRN is confirmed.
                // This requires modifying the logic, perhaps polling the job status or using a webhook.
                // For now, we won't deduct wallet here. It needs a separate mechanism.
                // --- Placeholder for future AWB/LRN confirmation and wallet deduction ---
                // await pollOrWaitForB2BManifestCompletion(orderId, jobId); // Implement this function
            } else {
                const errorMessage = responseData.error || JSON.stringify(responseData);
                console.error(`Delhivery B2B API error for order ${orderId}:`, errorMessage);
                await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: `Delhivery B2B Error: ${errorMessage}` });
            }
        } catch (error) {
            console.error(`Error calling Delhivery B2B API for order ${orderId}:`, error);
            await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: `Network/Fetch Error (Delhivery B2B): ${error.message}` });
        }

      } else if ([1, 6, 8, 12298, 4, 2, 3, 12939, 12938].includes(courierId)) { // XpressBees
        if (!XBeesToken) {
          await getXpreessBeesToken();
        }
        if (!XBeesToken) {
            console.error("XpressBees token is not available for order creation.");
            await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: "Server config error (XpressBees Token)" });
            return;
        }
        const apiUrl = 'https://shipment.xpressbees.com/api/shipments2';

        const requestData = {
          order_number: orderjson.order_id, // Use original order ID
          shipping_charges: Number(orderjson.shipping_charges) || 0,
          discount: Number(orderjson.discount) || 0,
          cod_charges: Number(orderjson.cod_charges) || 0,
          payment_type: paymentMethod === "COD" ? "cod" : "prepaid",
          order_amount: orderSubTotal,
          package_weight: orderWeightKg * 1000, // Weight in grams
          package_length: orderLength,
          package_breadth: orderBreadth,
          package_height: orderHeight,
          request_auto_pickup: "yes",
          consignee: {
            name: orderjson.billing_customer_name,
            address: orderjson.billing_address,
            address_2: orderjson.billing_address_2 || '',
            city: orderjson.billing_city,
            state: orderjson.billing_state,
            pincode: String(orderjson.billing_pincode), // Ensure string
            phone: String(orderjson.billing_phone)
          },
          pickup: {
            warehouse_name: pickupLocationData.pickup_location,
            name: pickupLocationData.name,
            address: pickupLocationData.address,
            address_2: pickupLocationData.address_2 || '',
            city: pickupLocationData.city,
            state: pickupLocationData.state,
            pincode: String(pickupLocationData.pin_code), // Ensure string
            phone: String(pickupLocationData.phone)
          },
          order_items: order_items.map(item => ({
            name: item.name,
            qty: String(Number(item.units) || 1), // Ensure string quantity
            price: String(Number(item.selling_price) || 0), // Ensure string price
            sku: item.sku || orderjson.order_id // Use SKU or order ID as fallback
          })),
          courier_id: Number(courierId),
          collectable_amount: paymentMethod === "COD" ? String(orderSubTotal) : "0" // Ensure string
        };

        console.log("XpressBees Request Data:", JSON.stringify(requestData));

        const requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${XBeesToken}` // Verify if 'Token' or 'Bearer'
          },
          body: JSON.stringify(requestData)
        };

        try {
            const response = await fetch(apiUrl, requestOptions);
            const responseData = await response.json();
            console.log('Response from XpressBees API:', responseData);

            if (responseData.status === true && responseData.data && responseData.data.awb_number) {
                const awb = responseData.data.awb_number;
                const xpressbeesOrderId = responseData.data.order_id; // XpressBees internal order ID

                await event.data.after.ref.update({
                    xpressbees_response: responseData, // Store raw response
                    awb_id: awb,
                    // Optionally store xpressbeesOrderId if needed
                    // xpressbees_order_id: xpressbeesOrderId,
                    error_message: null // Clear previous errors
                });
                console.log(`XpressBees order created successfully for ${orderId}. AWB: ${awb}`);
                await handleSuccessfulOrderCreation(awb, "XpressBees");
            } else {
                const errorMessage = responseData.message || JSON.stringify(responseData);
                console.error(`XpressBees API error for order ${orderId}:`, errorMessage);
                await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: `XpressBees Error: ${errorMessage}` });
            }
        } catch (error) {
            console.error(`Error calling XpressBees API for order ${orderId}:`, error);
            await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: `Network/Fetch Error (XpressBees): ${error.message}` });
        }

      } else if ([32, 225, 217, 170, 54, 14, 346, 19, 18, 29, 55, 58, 82, 142].includes(courierId)) { // Shiprocket
        if (!shiprocketAuthToken) {
          await generateShiprocketAuthToken();
        }
        if (!shiprocketAuthToken) {
            console.error("Shiprocket token is not available for order creation.");
            await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: "Server config error (Shiprocket Token)" });
            return;
        }

        const createOrderEndpoint = 'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc';
        const generateAwbEndpoint = 'https://apiv2.shiprocket.in/v1/external/courier/assign/awb';

        const orderPayload = {
          order_id: orderjson.order_id, // Use original order ID
          order_date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD format
          pickup_location: pickupLocationData.pickup_location,
          channel_id: "", // Optional: Your channel ID if integrated
          comment: orderjson.comment || "",
          billing_customer_name: orderjson.billing_customer_name,
          billing_last_name: orderjson.billing_last_name || "", // Optional
          billing_address: orderjson.billing_address,
          billing_address_2: orderjson.billing_address_2 || "",
          billing_city: orderjson.billing_city,
          billing_pincode: String(orderjson.billing_pincode), // Ensure string
          billing_state: orderjson.billing_state,
          billing_country: orderjson.billing_country,
          billing_email: orderjson.billing_email || "", // Optional but recommended
          billing_phone: String(orderjson.billing_phone), // Ensure string
          shipping_is_billing: true, // Assuming shipping = billing for simplicity
          // shipping_customer_name: "", // Fill if different
          // shipping_last_name: "",
          // shipping_address: "",
          // shipping_address_2: "",
          // shipping_city: "",
          // shipping_pincode: "",
          // shipping_country: "",
          // shipping_state: "",
          // shipping_email: "",
          // shipping_phone: "",
          order_items: order_items.map(item => ({
            name: item.name,
            sku: item.sku || orderjson.order_id, // Use SKU or order ID
            units: Number(item.units) || 1,
            selling_price: Number(item.selling_price) || 0,
            discount: "", // Optional
            tax: "", // Optional
            hsn: Number(item.hsn) || "" // Optional, ensure number if provided
          })),
          payment_method: paymentMethod,
          shipping_charges: 0, // Let Shiprocket calculate or use pre-negotiated rates
          giftwrap_charges: 0,
          transaction_charges: 0,
          total_discount: 0,
          sub_total: orderSubTotal,
          length: orderLength,
          breadth: orderBreadth,
          height: orderHeight,
          weight: orderWeightKg // Weight in KG
        };

        console.log("Shiprocket Create Order Request:", JSON.stringify(orderPayload));

        const createOrderOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${shiprocketAuthToken}`
          },
          body: JSON.stringify(orderPayload),
        };

        try {
            // Step 1: Create the order in Shiprocket
            const createOrderResponse = await fetch(createOrderEndpoint, createOrderOptions);
            const createOrderData = await createOrderResponse.json();
            console.log('Response from Shiprocket Create Order API:', createOrderData);

            if (createOrderData && createOrderData.status_code === 1 && createOrderData.shipment_id) {
                const shipment_id = createOrderData.shipment_id;
                const shiprocket_order_id = createOrderData.order_id; // Shiprocket's internal order ID

                // Store intermediate response
                await event.data.after.ref.update({
                    shiprocket_create_response: createOrderData,
                    shipment_id: shipment_id,
                    shiprocket_order_id: shiprocket_order_id,
                    error_message: null
                });
                console.log(`Shiprocket order created for ${orderId}. Shipment ID: ${shipment_id}`);

                // Step 2: Generate AWB number
                const generateAwbBody = {
                  shipment_id: Number(shipment_id),
                  courier_id: Number(courierId), // The selected courier ID
                  // Optional: is_return, weight, dimensions if overriding
                };
                console.log("Shiprocket Generate AWB Request:", JSON.stringify(generateAwbBody));

                const generateAwbOptions = {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${shiprocketAuthToken}`
                  },
                  body: JSON.stringify(generateAwbBody),
                };

                const generateAwbResponse = await fetch(generateAwbEndpoint, generateAwbOptions);
                const generateAwbData = await generateAwbResponse.json();
                console.log('Response from Shiprocket Generate AWB API:', generateAwbData);

                if (generateAwbData.awb_assign_status === 1 && generateAwbData.response && generateAwbData.response.data && generateAwbData.response.data.awb_code) {
                    const awb = generateAwbData.response.data.awb_code;

                    // Update Firestore with final AWB details
                    await event.data.after.ref.update({
                        shiprocket_awb_response: generateAwbData.response.data, // Store AWB response
                        awb_id: awb,
                        // order_id: shiprocket_order_id, // Update if you want Shiprocket's order ID here
                    });
                    console.log(`Shiprocket AWB generated for ${orderId}. AWB: ${awb}`);
                    await handleSuccessfulOrderCreation(awb, "Shiprocket");
                } else {
                    const errorMessage = generateAwbData.message || JSON.stringify(generateAwbData);
                    console.error(`Shiprocket AWB generation failed for order ${orderId} (Shipment ID: ${shipment_id}):`, errorMessage);
                    // Revert status, keep shipment_id for potential manual retry
                    await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: `Shiprocket AWB Error: ${errorMessage}` });
                }
            } else {
                const errorMessage = createOrderData.message || JSON.stringify(createOrderData);
                console.error(`Shiprocket order creation failed for order ${orderId}:`, errorMessage);
                await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: `Shiprocket Create Error: ${errorMessage}` });
            }
        } catch (error) {
            console.error(`Error calling Shiprocket API for order ${orderId}:`, error);
            await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: `Network/Fetch Error (Shiprocket): ${error.message}` });
        }
      } else {
          console.warn(`Courier ID ${courierId} not handled for order creation.`);
          await event.data.after.ref.update({ current_status: "UNSHIPPED", error_message: `Unsupported courier ID: ${courierId}` });
      }
    } else {
        console.log(`Order ${orderId} status change from ${previousValue.current_status} to ${newValue.current_status} does not trigger order creation.`);
    }
  } catch (error) {
    console.error(`Error processing order update for ${event.params.orderId}:`, error);
    // Attempt to update Firestore with error, but be cautious of infinite loops if the update itself fails
    try {
        await event.data.after.ref.update({ error_message: `General Error: ${error.message}` });
    } catch (updateError) {
        console.error(`Failed to update order ${event.params.orderId} with error message:`, updateError);
    }
  }
});


/**
 * Handles COD remittances when an order is updated in Firestore.
 * @param {object} event - The event object.
 */
exports.handleCODRemittances = onDocumentUpdated('orders/{orderId}', async (event) => {
  const newValue = event.data.after.data();
  const previousValue = event.data.before.data();
  const orderId = event.params.orderId;

  if (!newValue || !previousValue) {
      console.error(`Missing data for order update ${orderId}`);
      return;
  }

  let orderDataPrevious, orderDataNew;
  try {
      orderDataPrevious = JSON.parse(previousValue.data || '{}');
      orderDataNew = JSON.parse(newValue.data || '{}');
  } catch (e) {
      console.error(`Failed to parse order data for remittance handling on order ${orderId}:`, e);
      return; // Cannot proceed without valid order data
  }

  const isCod = (orderDataNew.payment_method === 'COD');
  const userId = newValue.user_id;

  if (!userId) {
      console.error(`User ID missing for order ${orderId}, cannot handle remittance.`);
      return;
  }

  // --- Create Remittance Record on 'READY TO SHIP' for COD orders ---
  if (previousValue.current_status === 'UNSHIPPED' && newValue.current_status === 'READY TO SHIP' && isCod) {
    const userRef = admin.firestore().collection('users').doc(userId);
    let earlyCodSetting = "Standard"; // Default

    try {
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            earlyCodSetting = userDoc.data().earlyCod || "Standard";
        } else {
            console.warn(`User document ${userId} not found for remittance setting.`);
        }
    } catch (userError) {
        console.error(`Error fetching user ${userId} for remittance setting:`, userError);
    }

    const remittanceInfo = {
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      order_doc_id: orderId, // Link to the Firestore order document ID
      order_id: orderDataNew.order_id, // The original order ID from the JSON data
      cod_amount: Number(orderDataNew.sub_total) || 0,
      transfered_amount: 0,
      status: "Pending Delivery", // Initial status
      early_cod: earlyCodSetting,
      deduction: 0, // Will be calculated later
      remark: "Order shipped, awaiting delivery confirmation.",
      user_id: userId,
      awb_id: newValue.awb_id || null, // Include AWB if available
      courier_id: newValue.courier_id || null,
      created_at: admin.firestore.Timestamp.now() // Explicit creation timestamp
    };

    try {
      // Use the order document ID as the remittance document ID for easy lookup
      const remittanceRef = admin.firestore().collection('remittances').doc(orderId);
      await remittanceRef.set(remittanceInfo);
      console.log(`Remittance record created for COD order ${orderId}.`);
    } catch (error) {
      console.error(`Error creating remittance record for order ${orderId}:`, error);
    }
  }

  // --- Update Remittance Record on 'DELIVERED' for COD orders ---
  if (newValue.current_status === 'DELIVERED' && previousValue.current_status !== 'DELIVERED' && isCod) {
    const deliveryTimestamp = newValue.delivery_timestamp || admin.firestore.Timestamp.now(); // Use actual delivery time if available
    const deliveryDateString = deliveryTimestamp.toDate().toLocaleDateString();

    const remittanceInfoUpdate = {
      status: "Delivered - Pending Remittance", // Update status
      remark: `Order delivered on ${deliveryDateString}. Awaiting payment confirmation from courier.`,
      delivered_at: deliveryTimestamp // Store delivery timestamp
    };

    try {
      const remittanceRef = admin.firestore().collection('remittances').doc(orderId);
      await remittanceRef.update(remittanceInfoUpdate);
      console.log(`Remittance record updated for delivered COD order ${orderId}.`);
    } catch (error) {
      // Check if the error is because the document doesn't exist (e.g., if the READY TO SHIP step failed)
      if (error.code === 5) { // Firestore 'NOT_FOUND' error code
          console.warn(`Remittance record for order ${orderId} not found. It might not have been created or was deleted.`);
      } else {
          console.error(`Error updating remittance record for delivered order ${orderId}:`, error);
      }
    }
  }

  // --- Handle RTO (Return To Origin) Status ---
  if (newValue.current_status === 'RTO' && previousValue.current_status !== 'RTO' && isCod) {
      const rtoTimestamp = admin.firestore.Timestamp.now();
      const rtoDateString = rtoTimestamp.toDate().toLocaleDateString();

      const remittanceInfoUpdate = {
          status: "Returned To Origin",
          remark: `Order marked as RTO on ${rtoDateString}. Remittance cancelled.`,
          rto_at: rtoTimestamp,
          transfered_amount: 0, // Ensure transferred amount is zero
          deduction: 0 // Ensure deduction is zero
      };

      try {
          const remittanceRef = admin.firestore().collection('remittances').doc(orderId);
          await remittanceRef.update(remittanceInfoUpdate);
          console.log(`Remittance record updated for RTO order ${orderId}.`);
      } catch (error) {
          if (error.code === 5) {
              console.warn(`Remittance record for RTO order ${orderId} not found.`);
          } else {
              console.error(`Error updating remittance record for RTO order ${orderId}:`, error);
          }
      }
  }

  // --- Handle Cancellation After Shipping for COD orders ---
  if (newValue.current_status === 'CANCELLED' && previousValue.current_status !== 'UNSHIPPED' && isCod) {
      const cancelTimestamp = admin.firestore.Timestamp.now();
      const cancelDateString = cancelTimestamp.toDate().toLocaleDateString();

      const remittanceInfoUpdate = {
          status: "Cancelled After Shipping",
          remark: `Order cancelled after shipping on ${cancelDateString}. Remittance voided.`,
          cancelled_at: cancelTimestamp,
          transfered_amount: 0,
          deduction: 0
      };

      try {
          const remittanceRef = admin.firestore().collection('remittances').doc(orderId);
          await remittanceRef.update(remittanceInfoUpdate);
          console.log(`Remittance record updated for cancelled (post-ship) order ${orderId}.`);
      } catch (error) {
          if (error.code === 5) {
              console.warn(`Remittance record for cancelled order ${orderId} not found.`);
          } else {
              console.error(`Error updating remittance record for cancelled order ${orderId}:`, error);
          }
      }
  }
});


/**
 * Updates transactions and wallet balance when a new Cashfree payment is created.
 * @param {object} event - The event object.
 */
exports.updateTransactions = onDocumentCreated('cashfreepayments/{paymentId}', async (event) => {
  try {
    const paymentSnapshot = event.data;
    if (!paymentSnapshot) {
        console.error("No data found in the created document event.");
        return;
    }
    const paymentData = paymentSnapshot.data();
    console.log("Processing Cashfree Payment:", paymentData);

    // Validate essential data structure
    if (!paymentData || !paymentData.data || !paymentData.data.customer_details || !paymentData.data.order || !paymentData.data.payment) {
        console.error("Invalid Cashfree payment data structure:", paymentData);
        return;
    }

    const customerDetails = paymentData.data.customer_details;
    const { customer_id } = customerDetails; // This should be the Firebase User ID
    const { order_id } = paymentData.data.order; // Cashfree's order ID
    const { payment_amount, payment_status, cf_payment_id } = paymentData.data.payment; // Cashfree's payment ID

    if (!customer_id) {
        console.error("Customer ID (Firebase User ID) missing in Cashfree payment data:", paymentData);
        return; // Cannot update wallet without user ID
    }

    // Only process successful payments
    if (payment_status !== 'SUCCESS') {
      console.log(`Cashfree payment ${cf_payment_id} status is ${payment_status}. Skipping wallet update.`);
      // Optionally, create a transaction record with 'Failed' status
      // const failedTransactionData = { ... };
      // await admin.firestore().collection('transactions').add(failedTransactionData);
      return;
    }

    const amount = Number(payment_amount);
    if (isNaN(amount) || amount <= 0) {
        console.error(`Invalid payment amount ${payment_amount} for Cashfree payment ${cf_payment_id}.`);
        return;
    }

    // Calculate discount (same logic as Razorpay)
    let discount = 0;
    if (amount >= 5000 && amount < 10000) {
        discount = amount * 0.01;
    } else if (amount >= 10000 && amount < 20000) {
        discount = amount * 0.02;
    } else if (amount >= 20000 && amount < 30000) {
        discount = amount * 0.04;
    } else if (amount >= 30000 && amount < 50000) {
        discount = amount * 0.06;
    } else if (amount >= 50000) {
        discount = amount * 0.08;
    }
    discount = Number(discount.toFixed(2)); // Ensure discount is rounded

    console.log(`Cashfree Payment: Amount=${amount}, Discount=${discount}`);

    const walletDocRef = admin.firestore().collection('wallets').doc(customer_id);
    const transactionRefBase = admin.firestore().collection('transactions');

    // Use a Firestore transaction for atomicity
    await admin.firestore().runTransaction(async (transaction) => {
        const walletDoc = await transaction.get(walletDocRef);

        let currentBalance = 0;
        if (walletDoc.exists) {
            currentBalance = walletDoc.data().balance || 0;
        } else {
            console.log(`Wallet for user ${customer_id} does not exist. Creating new wallet.`);
        }

        const newBalance = Number((currentBalance + amount + discount).toFixed(2));

        // Set or Update wallet balance
        if (!walletDoc.exists) {
            transaction.set(walletDocRef, { balance: newBalance, userId: customer_id }); // Add userId if creating
        } else {
            transaction.update(walletDocRef, { balance: newBalance });
        }

        // Create transaction record for the payment
        const transactionDataPayment = {
            amount: amount,
            created_at: admin.firestore.Timestamp.now(),
            status: "Success",
            transaction_details: `Payment received via Cashfree (ID: ${cf_payment_id})`,
            transaction_type: "Credit",
            user_id: customer_id,
            payment_gateway: "Cashfree",
            gateway_order_id: order_id,
            gateway_payment_id: cf_payment_id
        };
        transaction.set(transactionRefBase.doc(), transactionDataPayment); // Auto-generate transaction ID

        // Create transaction record for the discount
        if (discount > 0) {
            const transactionDataDiscount = {
                amount: discount,
                created_at: admin.firestore.Timestamp.now(),
                status: "Success",
                transaction_details: `Discount applied for Cashfree payment (ID: ${cf_payment_id})`,
                transaction_type: "Credit",
                user_id: customer_id,
                payment_gateway: "Cashfree",
                gateway_order_id: order_id,
                gateway_payment_id: cf_payment_id
            };
            transaction.set(transactionRefBase.doc(), transactionDataDiscount); // Auto-generate transaction ID
        }
    });

    console.log(`Successfully updated wallet for user ${customer_id} and added transaction(s) for Cashfree payment ${cf_payment_id}.`);

  } catch (error) {
    console.error('Error processing Cashfree payment webhook:', error);
    // Consider adding error details to a specific error log collection if needed
  }
});


/**
 * Calculates the shipping rate for an order.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.calculateRate = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { pickup_postcode, delivery_postcode, cod, weight, length, breadth, height, declared_value } = req.body;

      // Basic validation
      if (!pickup_postcode || !delivery_postcode || !cod || !weight || !length || !breadth || !height || !declared_value) {
        return res.status(400).json({ message: 'Missing required parameters.' });
      }

      const weightKg = Number(weight) || 0.1;
      const lengthCm = Number(length) || 10;
      const breadthCm = Number(breadth) || 10;
      const heightCm = Number(height) || 10;
      const declaredValue = Number(declared_value) || 0;
      const isCod = cod === "1";

      // --- Fetch Delhivery B2C Rates ---
      async function fetchFromDelhiveryB2C() {
        const apiKey = process.env.DELHIVERY_API_KEY;
        if (!apiKey) {
            console.warn("DELHIVERY_API_KEY not set. Skipping Delhivery B2C rates.");
            return null;
        }

        const volumetricWeightKg = (lengthCm * breadthCm * heightCm) / 5000;
        const chargeableWeightKg = Math.max(weightKg, volumetricWeightKg);
        const chargeableWeightGm = Math.ceil(chargeableWeightKg * 1000); // Delhivery uses grams here

        const queryParams = new URLSearchParams({
          md: "S", // Mode: Surface (can also be "E" for Express)
          ss: "Delivered", // Service Speed (check API docs for options)
          d_pin: delivery_postcode,
          o_pin: pickup_postcode,
          cgm: chargeableWeightGm, // Chargeable grams
          pt: isCod ? "COD" : "Pre-paid",
          cod_amount: isCod ? declaredValue : "", // COD amount if applicable
          // Optional params: cl (client ID), cd (current date YYYYMMDD)
        });

        const apiUrl = `https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?${queryParams}`;
        console.log("Delhivery B2C Rate API URL:", apiUrl);

        const fetchOptions = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${apiKey}`
          }
        };

        try {
            const response = await fetch(apiUrl, fetchOptions);
            const data = await response.json();
            console.log("Delhivery B2C Rate Response:", data);

            if (response.ok && data && data.length > 0 && data[0].total_amount) {
                const baseRate = Number(data[0].total_amount);
                // Apply your markup/logic (e.g., +5%)
                const finalRate = Number((baseRate * 1.05).toFixed(2));
                return {
                  courier_company_id: 999, // Your internal ID for Delhivery B2C
                  courier_name: 'Delhivery Surface', // Or adjust based on 'md' param
                  estimated_delivery_days: data[0].etd ? parseInt(data[0].etd.split(' ')[0], 10) : 4, // Example parsing
                  rate: finalRate,
                  logo: "URL_TO_DELHIVERY_LOGO" // Add logo URL
                };
            } else {
                console.warn("Delhivery B2C rate fetch failed or returned no rate:", data);
                return null;
            }
        } catch (error) {
            console.error("Error fetching Delhivery B2C rates:", error);
            return null;
        }
      }

      // --- Fetch XpressBees Rates ---
      async function fetchFromXpressBees() {
        if (!XBeesToken) {
          await getXpreessBeesToken();
        }
        if (!XBeesToken) {
            console.warn("XpressBees token unavailable. Skipping XpressBees rates.");
            return [];
        }

        const bodyData = {
          origin: String(pickup_postcode),
          destination: String(delivery_postcode),
          payment_type: isCod ? "cod" : "prepaid",
          order_amount: isCod ? String(declaredValue) : "", // Ensure string
          weight: weightKg * 1000, // Grams
          length: lengthCm,
          breadth: breadthCm,
          height: heightCm,
        };

        const apiUrl = `https://shipment.xpressbees.com/api/courier/serviceability`;
        console.log("XpressBees Rate API URL:", apiUrl);
        console.log("XpressBees Rate Request Body:", JSON.stringify(bodyData));

        const fetchOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${XBeesToken}` // Verify auth scheme
          },
          body: JSON.stringify(bodyData)
        };

        try {
            const response = await fetch(apiUrl, fetchOptions);
            const data = await response.json();
            console.log("XpressBees Rate Response:", data);

            if (data.status === true && data.data && Array.isArray(data.data)) {
              // Apply markup (e.g., +10%) and format
              return data.data.map(item => {
                const baseRate = Number(item.total_charges);
                const finalRate = Number((baseRate * 1.10).toFixed(2));
                return {
                  courier_company_id: Number(item.id),
                  courier_name: item.name,
                  estimated_delivery_days: item.edd ? parseInt(item.edd.split(' ')[0], 10) : 4, // Example parsing
                  rate: finalRate,
                  logo: "URL_TO_XPRESSBEES_LOGO" // Add logo URL
                };
              });
            } else {
              console.warn("XpressBees rate fetch failed or returned no rates:", data.message || data);
              return [];
            }
        } catch (error) {
            console.error("Error fetching XpressBees rates:", error);
            return [];
        }
      }

      // --- Fetch Shiprocket Rates ---
      async function fetchFromShiprocket() {
        if (!shiprocketAuthToken) {
          await generateShiprocketAuthToken();
        }
        if (!shiprocketAuthToken) {
            console.warn("Shiprocket token unavailable. Skipping Shiprocket rates.");
            return [];
        }

        const queryParams = new URLSearchParams({
          pickup_postcode: pickup_postcode,
          delivery_postcode: delivery_postcode,
          cod: cod, // '1' or '0'
          weight: weightKg, // KG
          length: lengthCm, // CM
          breadth: breadthCm, // CM
          height: heightCm, // CM
          declared_value: declaredValue, // Optional, but good for COD/Insurance
          // is_return: 0 // Assuming forward shipment
        });

        const apiUrl = `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?${queryParams}`;
        console.log("Shiprocket Rate API URL:", apiUrl);

        const fetchOptions = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${shiprocketAuthToken}`,
          },
        };

        try {
            const response = await fetch(apiUrl, fetchOptions);
            const responseData = await response.json();
            console.log("Shiprocket Rate Response:", responseData);

            if (responseData.status === 200 && responseData.data && responseData.data.available_courier_companies) {
              // Filter for desired couriers and apply markup (e.g., +5%)
              const validCourierIds = [32, 225, 217, 170, 54, 14, 346, 19, 18, 29, 55, 58, 82, 142]; // Your preferred Shiprocket couriers
              return responseData.data.available_courier_companies
                .filter(item => validCourierIds.includes(Number(item.courier_company_id)))
                .map(item => {
                  // Shiprocket rate includes freight, COD, insurance if applicable
                  const baseRate = Number(item.rate);
                  const finalRate = Number((baseRate * 1.05).toFixed(2));
                  return {
                    courier_company_id: Number(item.courier_company_id),
                    courier_name: item.courier_name,
                    estimated_delivery_days: item.etd ? parseInt(item.etd.split(' ')[0], 10) : 4, // Example parsing
                    rate: finalRate,
                    logo: item.logo_url || "URL_TO_DEFAULT_SHIPROCKET_LOGO" // Use provided logo or default
                  };
                });
            } else {
              console.warn("Shiprocket rate fetch failed or returned no rates:", responseData.message || responseData);
              return [];
            }
        } catch (error) {
            console.error('Error fetching Shiprocket rates:', error);
            return [];
        }
      }

      // --- Execute all rate fetches in parallel ---
      const [delhiveryRatesB2C, xpressBeesRatesList, shiprocketRatesList] = await Promise.all([
        fetchFromDelhiveryB2C(),
        fetchFromXpressBees(),
        fetchFromShiprocket()
      ]);

      // --- Combine and format results ---
      const availableCourierCompanies = [];
      if (delhiveryRatesB2C) {
        availableCourierCompanies.push(delhiveryRatesB2C);
      }
      availableCourierCompanies.push(...xpressBeesRatesList);
      availableCourierCompanies.push(...shiprocketRatesList);

      // Sort by rate (ascending)
      availableCourierCompanies.sort((a, b) => a.rate - b.rate);

      const finalResponse = {
        status: 200, // Indicate success
        data: {
            available_courier_companies: availableCourierCompanies,
        }
      };

      res.status(200).json(finalResponse);

    } catch (error) {
      console.error('Error in calculateRate function:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  });
});


/**
 * Creates a pickup request with the selected courier.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.createPickupRequest = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { pickup_time, pickup_date, pickup_location, expected_package_count, courierId, documentId } = req.body; // documentId likely refers to the Firestore order ID
      const courier_id = Number(courierId); // Ensure numeric type

      // Validate parameters
      if (!pickup_time || !pickup_date || !pickup_location || !expected_package_count || !courier_id) {
        return res.status(400).json({ message: 'Missing required parameters.' });
      }
      if (expected_package_count <= 0) {
          return res.status(400).json({ message: 'Expected package count must be positive.' });
      }

      // --- Delhivery B2C Pickup ---
      if (courier_id === 999) {
        const apiKey = process.env.DELHIVERY_API_KEY;
        if (!apiKey) {
            console.error("DELHIVERY_API_KEY not set for B2C pickup request.");
            return res.status(500).json({ message: "Server configuration error (Delhivery Key)." });
        }
        const apiUrl = `https://track.delhivery.com/fm/request/new/`;
        const payload = { pickup_time, pickup_date, pickup_location, expected_package_count };

        console.log("Delhivery B2C Pickup Request:", JSON.stringify(payload));

        const fetchOptions = {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${apiKey}`
          }
        };

        try {
            const response = await fetch(apiUrl, fetchOptions);
            const responseData = await response.json();
            console.log("Delhivery B2C Pickup Response:", responseData);

            if (response.ok && responseData.pickup_id) {
                // Optionally store pickup_id in the order document
                if (documentId) {
                    await admin.firestore().collection('orders').doc(documentId).update({ pickup_request_id: responseData.pickup_id, pickup_status: 'Requested' });
                }
                return res.status(200).json({ pickup_id: responseData.pickup_id, message: "Pickup requested successfully (Delhivery B2C)." });
            } else {
                const errorMessage = responseData.message || JSON.stringify(responseData);
                console.error('Failed to create pickup request with Delhivery B2C API:', errorMessage);
                return res.status(response.status || 500).json({ message: `Failed to create pickup request (Delhivery B2C): ${errorMessage}` });
            }
        } catch (error) {
            console.error('Error calling Delhivery B2C Pickup API:', error);
            return res.status(500).json({ message: `Error creating pickup request (Delhivery B2C): ${error.message}` });
        }
      }
      // --- XpressBees Pickup (Manifest) ---
      else if ([1, 6, 8, 12298, 4, 2, 3, 12939, 12938].includes(courier_id)) {
        if (!XBeesToken) {
          await getXpreessBeesToken();
        }
        if (!XBeesToken) {
            console.error("XpressBees token unavailable for pickup request.");
            return res.status(500).json({ message: "Server configuration error (XpressBees Token)." });
        }

        if (!documentId) {
          return res.status(400).json({ message: 'Missing required parameter: documentId for XpressBees.' });
        }

        try {
            const orderDoc = await admin.firestore().collection('orders').doc(documentId).get();
            if (!orderDoc.exists) {
                return res.status(404).json({ message: 'Order document not found for XpressBees pickup.' });
            }

            const orderData = orderDoc.data();
            const awb = orderData.awb_id;
            if (!awb) {
                return res.status(400).json({ message: 'No AWB ID found in the order document for XpressBees pickup.' });
            }

            // XpressBees uses a "manifest" endpoint which acts like a pickup request for specific AWBs
            const payload = { awbs: [awb] };
            const apiUrl = 'https://shipment.xpressbees.com/api/shipments2/manifest';
            console.log("XpressBees Manifest Request:", JSON.stringify(payload));

            const fetchOptions = {
              method: 'POST',
              body: JSON.stringify(payload),
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${XBeesToken}` // Verify auth scheme
              }
            };

            const response = await fetch(apiUrl, fetchOptions);
            const responseData = await response.json();
            console.log("XpressBees Manifest Response:", responseData);

            if (response.ok && responseData.status === true) {
                // XpressBees doesn't return a specific pickup_id here, the manifest confirms pickup intention.
                const pseudoPickupId = `XB-${awb}`; // Create a reference ID
                await admin.firestore().collection('orders').doc(documentId).update({ pickup_request_id: pseudoPickupId, pickup_status: 'Manifested' });
                return res.status(200).json({ pickup_id: pseudoPickupId, message: "Shipment manifested successfully (XpressBees)." });
            } else {
                const errorMessage = responseData.message || JSON.stringify(responseData);
                console.error('XpressBees manifest/pickup request failed:', errorMessage);
                return res.status(response.status || 500).json({ message: `XpressBees manifest failed: ${errorMessage}` });
            }
        } catch (error) {
            console.error('Error processing XpressBees pickup request:', error);
            return res.status(500).json({ message: `Error processing XpressBees pickup: ${error.message}` });
        }
      }
      // --- Delhivery B2B Pickup ---
      else if (courier_id === 5) {
        if (!delhiveryToken) {
          await getDelhiveryToken();
        }
        if (!delhiveryToken) {
            console.error("Delhivery B2B token unavailable for pickup request.");
            return res.status(500).json({ message: "Server configuration error (Delhivery B2B Token)." });
        }

        // Determine pickup date based on time (e.g., cutoff at 2 PM)
        let pickupDateToUse = pickup_date;
        const pickupTimeParts = pickup_time.split(':');
        const pickupHour = parseInt(pickupTimeParts[0], 10);

        const requestDate = new Date(pickup_date); // Date pickup is requested *for*
        const now = new Date(); // Current time

        // Example cutoff logic: If requesting pickup for today after 2 PM, schedule for tomorrow
        if (requestDate.toDateString() === now.toDateString() && now.getHours() >= 14) {
            const nextDay = new Date(now);
            nextDay.setDate(now.getDate() + 1);
            pickupDateToUse = nextDay.toISOString().split('T')[0];
            console.log(`Pickup requested after cutoff. Scheduling for next day: ${pickupDateToUse}`);
        }
        // You might need more sophisticated logic based on courier cutoffs and holidays

        const payload = {
            pickup_time: pickup_time,
            pickup_date: pickupDateToUse,
            pickup_location: pickup_location,
            expected_package_count: expected_package_count
        };
        // Note: Delhivery B2B might use a different endpoint or payload structure than B2C.
        // Using the B2C endpoint here as provided in original code, but VERIFY with Delhivery B2B docs.
        const apiUrl = 'https://track.delhivery.com/fm/request/new/';
        console.log("Delhivery B2B Pickup Request:", JSON.stringify(payload));

        const fetchOptions = {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${delhiveryToken}` // Use Bearer token for B2B
          }
        };

        try {
            const response = await fetch(apiUrl, fetchOptions);
            const responseData = await response.json();
            console.log("Delhivery B2B Pickup Response:", responseData);

            if (response.ok && responseData.pickup_id) {
                if (documentId) { // Assuming documentId is passed for B2B pickups too
                    await admin.firestore().collection('orders').doc(documentId).update({ pickup_request_id: responseData.pickup_id, pickup_status: 'Requested' });
                }
                return res.status(200).json({ pickup_id: responseData.pickup_id, message: "Pickup requested successfully (Delhivery B2B)." });
            } else {
                const errorMessage = responseData.message || JSON.stringify(responseData);
                console.error('Failed to create pickup request with Delhivery B2B API:', errorMessage);
                return res.status(response.status || 500).json({ message: `Failed to create pickup request (Delhivery B2B): ${errorMessage}` });
            }
        } catch (error) {
            console.error('Error calling Delhivery B2B Pickup API:', error);
            return res.status(500).json({ message: `Error creating pickup request (Delhivery B2B): ${error.message}` });
        }
      }
      // --- Shiprocket Pickup ---
      else if ([32, 225, 217, 170, 54, 14, 346, 19, 18, 29, 55, 58, 82, 142].includes(courier_id)) {
          if (!shiprocketAuthToken) {
              await generateShiprocketAuthToken();
          }
          if (!shiprocketAuthToken) {
              console.error("Shiprocket token unavailable for pickup request.");
              return res.status(500).json({ message: "Server configuration error (Shiprocket Token)." });
          }

          if (!documentId) {
              return res.status(400).json({ message: 'Missing required parameter: documentId for Shiprocket.' });
          }

          try {
              const orderDoc = await admin.firestore().collection('orders').doc(documentId).get();
              if (!orderDoc.exists) {
                  return res.status(404).json({ message: 'Order document not found for Shiprocket pickup.' });
              }
              const orderData = orderDoc.data();
              const shipmentId = orderData.shipment_id; // Get Shiprocket's shipment ID

              if (!shipmentId) {
                  return res.status(400).json({ message: 'Shipment ID not found in the order document for Shiprocket pickup.' });
              }

              // Shiprocket pickup request endpoint
              const apiUrl = 'https://apiv2.shiprocket.in/v1/external/courier/generate/pickup';
              const payload = {
                  shipment_id: [Number(shipmentId)] // Expects an array of shipment IDs
              };
              console.log("Shiprocket Pickup Request:", JSON.stringify(payload));

              const fetchOptions = {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${shiprocketAuthToken}`
                  },
                  body: JSON.stringify(payload)
              };

              const response = await fetch(apiUrl, fetchOptions);
              const responseData = await response.json();
              console.log("Shiprocket Pickup Response:", responseData);

              if (response.ok && responseData.pickup_status === 1) {
                  // Shiprocket returns pickup details including a pickup_token_no
                  const pickupToken = responseData.pickup_token_no || `SR-${shipmentId}`;
                  await admin.firestore().collection('orders').doc(documentId).update({ pickup_request_id: pickupToken, pickup_status: 'Requested', shiprocket_pickup_response: responseData });
                  return res.status(200).json({ pickup_id: pickupToken, message: "Pickup requested successfully (Shiprocket)." });
              } else {
                  const errorMessage = responseData.message || JSON.stringify(responseData);
                  console.error('Shiprocket pickup request failed:', errorMessage);
                  return res.status(response.status || 500).json({ message: `Shiprocket pickup failed: ${errorMessage}` });
              }
          } catch (error) {
              console.error('Error processing Shiprocket pickup request:', error);
              return res.status(500).json({ message: `Error processing Shiprocket pickup: ${error.message}` });
          }
      }
      // --- Invalid Courier ID ---
      else {
        return res.status(400).json({ message: `Invalid or unsupported courierId: ${courier_id}.` });
      }

    } catch (error) {
      console.error('Error in createPickupRequest function:', error);
      res.status(500).json({ message: 'An internal error occurred while processing the pickup request.' });
    }
  });
});


/**
 * Generates a shipping label for an order.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.generateShippingLabel = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { waybill, courier_id } = req.body; // AWB number and courier ID

      if (!waybill || courier_id === undefined || courier_id === null) {
        return res.status(400).json({ message: 'AWB number (waybill) and courier_id are required.' });
      }

      const courierId = Number(courier_id);

      console.log(`Generating label for AWB: ${waybill}, Courier ID: ${courierId}`);

      // --- Delhivery B2C Label ---
      if (courierId === 999) {
        const apiKey = process.env.DELHIVERY_API_KEY;
        if (!apiKey) {
            console.error("DELHIVERY_API_KEY not set for B2C label generation.");
            return res.status(500).json({ message: "Server configuration error (Delhivery Key)." });
        }
        // Note: Delhivery often provides the label link during order creation response.
        // Check if it's already stored before fetching again.
        const orderSnap = await admin.firestore().collection('orders').where('awb_id', '==', waybill).limit(1).get();
        if (!orderSnap.empty) {
            const orderData = orderSnap.docs[0].data();
            if (orderData.delhivery_response?.packages?.[0]?.pdf_download_link) {
                console.log(`Found stored Delhivery B2C label link for ${waybill}`);
                return res.status(200).json({ label_url: orderData.delhivery_response.packages[0].pdf_download_link });
            }
        }

        // If not stored, fetch it
        const apiUrl = `https://track.delhivery.com/api/p/packing_slip?wbns=${waybill}&pdf=true`;
        console.log("Delhivery B2C Label API URL:", apiUrl);

        const fetchOptions = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json', // Although GET, Delhivery might expect this
            'Authorization': `Token ${apiKey}`
          }
        };

        try {
            const response = await fetch(apiUrl, fetchOptions);
            const responseData = await response.json();
            console.log("Delhivery B2C Label Response:", responseData);

            if (response.ok && responseData.packages && responseData.packages.length > 0 && responseData.packages[0].pdf_download_link) {
                // Optionally store the fetched link back to Firestore
                if (!orderSnap.empty) {
                    await orderSnap.docs[0].ref.update({ 'delhivery_response.packages': responseData.packages });
                }
                return res.status(200).json({ label_url: responseData.packages[0].pdf_download_link });
            } else {
                const errorMessage = responseData.message || JSON.stringify(responseData);
                console.error(`Failed to generate Delhivery B2C label for ${waybill}:`, errorMessage);
                return res.status(response.status || 500).json({ message: `Failed to generate label (Delhivery B2C): ${errorMessage}` });
            }
        } catch (error) {
            console.error(`Error calling Delhivery B2C Label API for ${waybill}:`, error);
            return res.status(500).json({ message: `Error generating label (Delhivery B2C): ${error.message}` });
        }
      }
      // --- XpressBees Label ---
      else if ([1, 6, 8, 12298, 4, 2, 3, 12939, 12938].includes(courierId)) {
        // XpressBees usually provides the label URL in the order creation response.
        try {
            const orderSnap = await admin.firestore().collection('orders').where('awb_id', '==', waybill).limit(1).get();
            if (orderSnap.empty) {
                return res.status(404).json({ message: `Order not found for AWB ${waybill} (XpressBees).` });
            }
            const orderData = orderSnap.docs[0].data();

            if (orderData.xpressbees_response?.data?.label) {
                console.log(`Found stored XpressBees label link for ${waybill}`);
                return res.status(200).json({ label_url: orderData.xpressbees_response.data.label });
            } else {
                console.warn(`XpressBees label URL not found in stored response for AWB ${waybill}. Attempting fetch (if API exists).`);
                // If XpressBees has a separate label fetch API, call it here.
                // Otherwise, return an error indicating it should have been in the creation response.
                return res.status(404).json({ message: `Label URL not found for AWB ${waybill} (XpressBees). Check order creation response.` });
            }
        } catch (error) {
            console.error(`Error retrieving XpressBees label for AWB ${waybill}:`, error);
            return res.status(500).json({ message: `Error retrieving label (XpressBees): ${error.message}` });
        }
      }
      // --- Shiprocket Label ---
      else if ([32, 225, 217, 170, 54, 14, 346, 19, 18, 29, 55, 58, 82, 142].includes(courierId)) {
        if (!shiprocketAuthToken) {
          await generateShiprocketAuthToken();
        }
        if (!shiprocketAuthToken) {
            console.error("Shiprocket token unavailable for label generation.");
            return res.status(500).json({ message: "Server configuration error (Shiprocket Token)." });
        }

        try {
            // Find the order using AWB to get the Shiprocket shipment_id
            const orderSnap = await admin.firestore().collection('orders').where('awb_id', '==', waybill).limit(1).get();
            if (orderSnap.empty) {
                return res.status(404).json({ message: `Order not found for AWB ${waybill} (Shiprocket).` });
            }
            const orderData = orderSnap.docs[0].data();
            const shipmentId = orderData.shipment_id;

            if (!shipmentId) {
                return res.status(400).json({ message: `Shipment ID not found for AWB ${waybill} (Shiprocket). Cannot generate label.` });
            }

            // Check if label URL is already stored from AWB generation step
            if (orderData.shiprocket_awb_response?.label_url) {
                 console.log(`Found stored Shiprocket label link for ${waybill}`);
                 return res.status(200).json({ label_url: orderData.shiprocket_awb_response.label_url });
            }

            // If not stored, call the label generation endpoint
            const apiUrl = `https://apiv2.shiprocket.in/v1/external/courier/generate/label`;
            const requestData = {
              shipment_id: [Number(shipmentId)], // Expects an array
            };
            console.log("Shiprocket Label Request:", JSON.stringify(requestData));

            const fetchOptions = {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${shiprocketAuthToken}`,
              },
              body: JSON.stringify(requestData),
            };

            const response = await fetch(apiUrl, fetchOptions);
            const responseData = await response.json(); // Shiprocket usually responds with JSON
            console.log("Shiprocket Label Response:", responseData);

            if (response.ok && responseData.label_created === 1 && responseData.label_url) {
                // Store the fetched label URL
                await orderSnap.docs[0].ref.update({ 'shiprocket_awb_response.label_url': responseData.label_url });
                return res.status(200).json({ label_url: responseData.label_url });
            } else {
                const errorMessage = responseData.message || JSON.stringify(responseData);
                console.error(`Failed to generate Shiprocket label for AWB ${waybill} (Shipment ${shipmentId}):`, errorMessage);
                return res.status(response.status || 500).json({ message: `Failed to generate label (Shiprocket): ${errorMessage}` });
            }
        } catch (error) {
            console.error(`Error generating Shiprocket label for AWB ${waybill}:`, error);
            return res.status(500).json({ message: `Error generating label (Shiprocket): ${error.message}` });
        }
      }
      // --- Delhivery B2B Label ---
      else if (courierId === 5) {
        if (!delhiveryToken) {
          await getDelhiveryToken();
        }
        if (!delhiveryToken) {
            console.error("Delhivery B2B token unavailable for label generation.");
            return res.status(500).json({ message: "Server configuration error (Delhivery B2B Token)." });
        }

        const callbackUrl = process.env.DELHIVERY_B2B_LABEL_CALLBACK_URL; // Use environment variable
        if (!callbackUrl) {
            console.error("DELHIVERY_B2B_LABEL_CALLBACK_URL environment variable not set.");
            return res.status(500).json({ message: "Server configuration error (Callback URL)." });
        }

        try {
            // Find the order using AWB to get the LRN
            const orderSnap = await admin.firestore().collection('orders').where('awb_id', '==', waybill).limit(1).get();
            if (orderSnap.empty) {
                return res.status(404).json({ message: `Order not found for AWB ${waybill} (Delhivery B2B).` });
            }
            const orderData = orderSnap.docs[0].data();
            const lrn = orderData.lrnum;

            if (!lrn) {
                return res.status(400).json({ message: `LRN not found for AWB ${waybill} (Delhivery B2B). Cannot generate label.` });
            }

            // Check if PDF URL is already stored (from webhook or previous fetch)
            if (orderData.pdf_url) {
                console.log(`Found stored Delhivery B2B label link for ${waybill} (LRN: ${lrn})`);
                return res.status(200).json({ label_url: orderData.pdf_url });
            }

            // Initiate label generation job via API
            const apiUrl = 'https://btob.api.delhivery.com/docket/generate_label_pdf';
            const payload = {
              lrn: lrn,
              size: 'a4', // Or '4x6' etc.
              callback: {
                uri: callbackUrl,
                method: 'POST',
              }
            };
            console.log("Delhivery B2B Label Request:", JSON.stringify(payload));

            const fetchOptions = {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${delhiveryToken}`
              },
              body: JSON.stringify(payload)
            };

            const response = await fetch(apiUrl, fetchOptions);
            const responseData = await response.json();
            console.log("Delhivery B2B Label Initiation Response:", responseData);

            if (response.ok && responseData.job_id) {
              // Job initiated, label will arrive via webhook. Inform the user to wait.
              // Store job_id if needed for tracking
              await orderSnap.docs[0].ref.update({ label_generation_job_id: responseData.job_id });
              return res.status(202).json({ message: `Label generation initiated for LRN ${lrn}. Label will be available shortly via webhook.` });
            } else {
              const errorMessage = responseData.message || JSON.stringify(responseData);
              console.error(`Failed to initiate Delhivery B2B label generation for LRN ${lrn}:`, errorMessage);
              return res.status(response.status || 500).json({ message: `Failed to initiate label generation (Delhivery B2B): ${errorMessage}` });
            }
        } catch (error) {
            console.error(`Error generating Delhivery B2B label for AWB ${waybill}:`, error);
            return res.status(500).json({ message: `Error generating label (Delhivery B2B): ${error.message}` });
        }
      }
      // --- Invalid Courier ID ---
      else {
        return res.status(400).json({ message: `Invalid or unsupported courierId for label generation: ${courierId}.` });
      }

    } catch (error) {
      console.error('Error in generateShippingLabel function:', error);
      res.status(500).json({ message: 'An internal error occurred while processing the label request.' });
    }
  });
});


/**
 * Handles the B2B Delhivery label webhook.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.B2BDelhiveryLabel = onRequest(async (req, res) => {
  try {
    console.log("Received Delhivery B2B Label Webhook:", req.body);
    const { status, lrn, job_id, success, pdf_url } = req.body;

    // Basic validation of webhook payload
    if (!lrn) {
      console.error('Missing LRN in Delhivery B2B label webhook payload.');
      return res.status(400).send('Missing LRN in payload.');
    }
    if (status !== 'Generated' || !success || !pdf_url) {
        console.warn(`Label generation failed or incomplete for LRN ${lrn}. Status: ${status}, Success: ${success}`);
        // Optionally update Firestore with failure status
        const failedOrderSnap = await admin.firestore().collection('orders').where('lrnum', '==', lrn).limit(1).get();
        if (!failedOrderSnap.empty) {
            await failedOrderSnap.docs[0].ref.update({
                label_generation_status: 'Failed',
                label_generation_error: `Webhook indicated failure: Status=${status}, Success=${success}`
            });
        }
        return res.status(200).send('Webhook received but indicated failure.'); // Acknowledge receipt even on failure
    }

    // Find the order document with the specified LRN
    const orderSnapshot = await admin.firestore().collection('orders').where('lrnum', '==', lrn).limit(1).get();
    if (orderSnapshot.empty) {
      console.warn(`No order found with LRN ${lrn} for B2B label webhook.`);
      // Still acknowledge receipt to Delhivery
      return res.status(200).send('Webhook received but no matching order found.');
    }

    // Extract the order ID and update the order document
    const orderId = orderSnapshot.docs[0].id;
    const orderRef = admin.firestore().collection('orders').doc(orderId);

    // Update the order document with the PDF URL and status
    await orderRef.update({
      pdf_url: pdf_url,
      label_generation_status: 'Success', // Add a status field
      label_generation_job_id: job_id || null // Store job ID for reference
    });

    console.log(`Successfully stored PDF URL for LRN ${lrn} (Order ID: ${orderId}).`);
    return res.status(200).send('Webhook processed successfully.');

  } catch (error) {
    console.error('Error handling Delhivery B2B label webhook:', error);
    // Avoid sending detailed errors back in the webhook response
    res.status(500).send('Internal Server Error processing webhook.');
  }
});


/**
 * Handles the Cashfree webhook.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.cashfreeWebhookHandler = onRequest(async (req, res) => {
  // Use corsHandler only if this endpoint needs to be called from a browser frontend (unlikely for webhooks)
  // corsHandler(req, res, async () => { ... });
  // If only Cashfree calls this, CORS is not needed.

  try {
    // Verify that the request contains data
    if (!req.body) {
      console.error('No data received in the Cashfree webhook request.');
      return res.status(400).send('No data received.'); // Keep response minimal
    }

    console.log("Received Cashfree Webhook:", req.body);

    // TODO: Add webhook signature verification for security
    // const receivedSignature = req.headers['x-webhook-signature'];
    // const timestamp = req.headers['x-webhook-timestamp'];
    // const payload = JSON.stringify(req.body);
    // const secret = process.env.CASHFREE_WEBHOOK_SECRET;
    // if (!verifyCashfreeSignature(payload, receivedSignature, timestamp, secret)) {
    //     console.error("Invalid Cashfree webhook signature.");
    //     return res.status(401).send("Invalid signature.");
    // }
    // console.log("Cashfree webhook signature verified.");

    const responseData = req.body;

    // Generate a unique ID or use one from the payload if suitable (e.g., cf_payment_id)
    const docId = responseData?.data?.payment?.cf_payment_id || responseData?.data?.order?.order_id || admin.firestore().collection('cashfreepayments').doc().id;

    // Store the response data in the Firestore collection
    // Use set with merge: true to avoid overwriting if the webhook is sent multiple times for the same event
    await admin.firestore().collection('cashfreepayments').doc(String(docId)).set(responseData, { merge: true });

    // Log success and send response to Cashfree
    console.log(`Cashfree webhook data stored/merged successfully for ID: ${docId}`);
    // Cashfree expects a 200 OK response to acknowledge receipt.
    return res.status(200).send('OK');

  } catch (error) {
    // Log error and send error response
    console.error('Error storing Cashfree webhook response:', error);
    return res.status(500).send('Error processing webhook.'); // Keep response minimal
  }
  // }); // End corsHandler if used
});


/**
 * Scheduled function to track shipments.
 * Runs every 3 hours.
 * @param {object} context - The context object.
 */
exports.trackShipments = functions.pubsub.schedule('every 3 hours').onRun(async (context) => {
  console.log('Starting scheduled shipment tracking job.');
  let trackedCount = 0;
  let errorCount = 0;
  try {
    // Query Firestore for orders that need tracking
    // Exclude final statuses and potentially statuses where tracking isn't possible yet (e.g., UNSHIPPED)
    const ordersSnapshot = await admin.firestore().collection('orders')
      .where('current_status', 'not-in', ['UNSHIPPED', 'DELIVERED', 'CANCELLED', 'RTO']) // Add RTO if it's a final state
      .where('awb_id', '!=', null) // Only track orders with an AWB
      .get();

    if (ordersSnapshot.empty) {
        console.log("No orders found requiring tracking updates.");
        return null;
    }

    console.log(`Found ${ordersSnapshot.size} orders to track.`);

    const trackingPromises = [];
    ordersSnapshot.forEach(doc => {
      const data = doc.data();
      const orderDocId = doc.id; // Use Firestore document ID for logging/updates
      const waybill = data.awb_id;
      const courierId = data.courier_id;
      const LRno = data.lrnum; // For B2B

      if (!waybill && !LRno) {
          console.warn(`Skipping order ${orderDocId}: Missing AWB/LRN.`);
          return; // Skip if no tracking identifier
      }

      // Wrap the fetchTrackingDetails call in a promise that handles its own errors
      const trackPromise = fetchTrackingDetails(orderDocId, waybill, courierId, LRno)
          .then(() => {
              trackedCount++;
          })
          .catch(error => {
              errorCount++;
              console.error(`Failed to track order ${orderDocId} (AWB/LRN: ${waybill || LRno}):`, error.message);
              // Optionally update the order document with a tracking error status/message
              // admin.firestore().collection('orders').doc(orderDocId).update({ tracking_error: error.message }).catch(err => console.error("Failed to update tracking error status:", err));
          });
      trackingPromises.push(trackPromise);
    });

    // Wait for all tracking attempts to complete (or fail)
    await Promise.all(trackingPromises);

    console.log(`Shipment tracking job finished. Successfully tracked: ${trackedCount}, Errors: ${errorCount}.`);
    return null;
  } catch (error) {
    console.error('Critical error during trackShipments job execution:', error);
    // This error is likely during the Firestore query itself
    // Firebase Functions automatically logs this, but re-throwing might be desired for monitoring
    throw error; // Re-throw for Cloud Logging/Error Reporting
  }
});


/**
 * Gets the tracking details for a specific shipment via HTTP request.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getTrackingDelhivery = onRequest(async (req, res) => { // Renaming might be good, e.g., getTrackingDetailsHttp
  corsHandler(req, res, async () => {
    try {
      const { waybill } = req.body; // Expect AWB in request body

      if (!waybill) {
        return res.status(400).json({ message: "AWB number (waybill) is required in the request body." });
      }

      // Find the order associated with the AWB to determine the courier
      const orderSnap = await admin.firestore().collection('orders').where('awb_id', '==', waybill).limit(1).get();

      if (orderSnap.empty) {
          // Maybe try searching by LRN if it's a B2B request?
          const orderSnapLrn = await admin.firestore().collection('orders').where('lrnum', '==', waybill).limit(1).get();
          if (orderSnapLrn.empty) {
              return res.status(404).json({ message: `No order found with AWB or LRN: ${waybill}` });
          }
          // If found by LRN, proceed using that document
          orderDoc = orderSnapLrn.docs[0];
      } else {
          orderDoc = orderSnap.docs[0];
      }

      const orderData = orderDoc.data();
      const courierId = orderData.courier_id;
      const lrn = orderData.lrnum; // Get LRN if available

      console.log(`Fetching tracking for AWB/LRN: ${waybill}, Courier ID: ${courierId}`);

      // --- Delhivery B2C Tracking ---
      if (courierId === 999) {
        const apiKey = process.env.DELHIVERY_API_KEY;
        if (!apiKey) return res.status(500).json({ message: "Server config error (Delhivery Key)." });

        const apiUrl = `https://track.delhivery.com/api/v1/packages/json/?waybill=${waybill}`;
        const fetchOptions = { method: 'GET', headers: { 'Authorization': `Token ${apiKey}` } };

        const response = await fetch(apiUrl, fetchOptions);
        const responseData = await response.json();

        if (!response.ok || !responseData.ShipmentData || responseData.ShipmentData.length === 0) {
          return res.status(response.status || 500).json({ message: `Failed to get tracking (Delhivery B2C): ${responseData.message || 'Unknown error'}` });
        }

        const shipment = responseData.ShipmentData[0].Shipment;
        const formattedResponse = {
          current_status: shipment.Status?.Status?.toUpperCase() || 'UNKNOWN',
          shipment_track_activities: shipment.Scans || [], // Assuming Scans is the array of activities
          // Add other relevant details like origin, destination, expected date if available
          origin: shipment.Origin || null,
          destination: shipment.Destination || null,
          expected_date: shipment.Status?.ExpectedDeliveryDate || null,
        };
        return res.status(200).json(formattedResponse);
      }
      // --- XpressBees Tracking ---
      else if ([1, 6, 8, 12298, 4, 2, 3, 12939, 12938].includes(courierId)) {
        if (!XBeesToken) await getXpreessBeesToken();
        if (!XBeesToken) return res.status(500).json({ message: "Server config error (XpressBees Token)." });

        const apiUrl = `https://shipment.xpressbees.com/api/shipments2/track/${waybill}`;
        const fetchOptions = { method: 'GET', headers: { 'Authorization': `Token ${XBeesToken}` } }; // Verify auth scheme

        const response = await fetch(apiUrl, fetchOptions);
        const responseData = await response.json();

        if (!response.ok || !responseData.status || !responseData.data) {
          return res.status(response.status || 500).json({ message: `Failed to get tracking (XpressBees): ${responseData.message || 'Unknown error'}` });
        }

        // Format XpressBees response to a consistent structure
        const formattedResponse = {
          current_status: responseData.data.status?.toUpperCase() || 'UNKNOWN',
          shipment_track_activities: (responseData.data.history || []).map(item => ({
            // Map XpressBees fields to your standard ScanDetail structure
            ScanDetail: {
              ScanDateTime: item.event_time ? new Date(item.event_time).toISOString() : null,
              ScanType: item.status_code || 'INFO', // Provide a default type
              Scan: item.message || 'No details',
              StatusDateTime: item.event_time ? new Date(item.event_time).toISOString() : null,
              ScannedLocation: item.location || 'Unknown Location',
              StatusCode: item.status_code || 'INFO',
              Instructions: item.message || '',
            },
          })),
          origin: responseData.data.origin || null,
          destination: responseData.data.destination || null,
          expected_date: responseData.data.edd || null,
        };
        return res.status(200).json(formattedResponse);
      }
      // --- Delhivery B2B Tracking ---
      else if (courierId === 5) {
          const trackingId = lrn || waybill; // Use LRN if available, otherwise assume waybill might be LRN
          if (!trackingId) return res.status(400).json({ message: "LRN or AWB required for Delhivery B2B tracking." });

          if (!delhiveryToken) await getDelhiveryToken();
          if (!delhiveryToken) return res.status(500).json({ message: "Server config error (Delhivery B2B Token)." });

          const apiUrl = `https://btob.api.delhivery.com/v3/track/${trackingId}`;
          const fetchOptions = { method: 'GET', headers: { 'Authorization': `Bearer ${delhiveryToken}` } };

          const response = await fetch(apiUrl, fetchOptions);
          const responseData = await response.json();

          if (!response.ok || !responseData.data) {
              return res.status(response.status || 500).json({ message: `Failed to get tracking (Delhivery B2B): ${responseData.message || 'Unknown error'}` });
          }

          // Format B2B response
          const data = responseData.data;
          const formattedResponse = {
              current_status: data.status?.toUpperCase() || 'UNKNOWN',
              shipment_track_activities: (data.scans || []).map(scan => ({
                  ScanDetail: {
                      ScanDateTime: scan.time ? new Date(scan.time).toISOString() : null,
                      ScanType: scan.type || 'INFO',
                      Scan: scan.remarks || 'No details',
                      StatusDateTime: scan.time ? new Date(scan.time).toISOString() : null,
                      ScannedLocation: scan.location || 'Unknown Location',
                      StatusCode: scan.type || 'INFO',
                      Instructions: scan.remarks || '',
                  }
              })),
              origin: data.origin || null,
              destination: data.destination || null,
              expected_date: data.edd || null,
          };
          return res.status(200).json(formattedResponse);
      }
      // --- Shiprocket Tracking (Requires Shiprocket Shipment ID) ---
      else if ([32, 225, 217, 170, 54, 14, 346, 19, 18, 29, 55, 58, 82, 142].includes(courierId)) {
          const shipmentId = orderData.shipment_id;
          if (!shipmentId) {
              return res.status(400).json({ message: `Shipment ID needed for Shiprocket tracking (AWB: ${waybill}).` });
          }
          if (!shiprocketAuthToken) await generateShiprocketAuthToken();
          if (!shiprocketAuthToken) return res.status(500).json({ message: "Server config error (Shiprocket Token)." });

          // Shiprocket tracking API endpoint
          const apiUrl = `https://apiv2.shiprocket.in/v1/external/tracking/${shipmentId}`;
          const fetchOptions = { method: 'GET', headers: { 'Authorization': `Bearer ${shiprocketAuthToken}` } };

          const response = await fetch(apiUrl, fetchOptions);
          const responseData = await response.json();

          if (!response.ok || responseData.tracking_data?.track_status !== 1) {
              return res.status(response.status || 500).json({ message: `Failed to get tracking (Shiprocket): ${responseData.message || 'Unknown error'}` });
          }

          // Format Shiprocket response
          const trackingData = responseData.tracking_data;
          const formattedResponse = {
              current_status: trackingData.shipment_status_text || trackingData.shipment_status || 'UNKNOWN',
              shipment_track_activities: (trackingData.scan || []).map(scan => ({
                  ScanDetail: {
                      ScanDateTime: scan.date ? new Date(scan.date).toISOString() : null,
                      ScanType: scan.status_code || 'INFO',
                      Scan: scan.activity || 'No details',
                      StatusDateTime: scan.date ? new Date(scan.date).toISOString() : null,
                      ScannedLocation: scan.location || 'Unknown Location',
                      StatusCode: scan.status_code || 'INFO',
                      Instructions: scan.activity || '',
                  }
              })),
              origin: trackingData.origin || null,
              destination: trackingData.destination || null,
              expected_date: trackingData.etd || null,
          };
          return res.status(200).json(formattedResponse);
      }
      // --- Fallback/Unknown Courier ---
      else {
        return res.status(400).json({ message: `Tracking not supported for Courier ID: ${courierId}` });
      }

    } catch (error) {
      console.error(`Error getting tracking details for ${req.body.waybill}:`, error);
      res.status(500).json({ message: 'An internal error occurred while fetching tracking details.' });
    }
  });
});


/**
 * Scheduled function to refresh the Delhivery B2B token every 24 hours.
 * @param {object} context - The context object.
 */
exports.scheduledTokenRefreshB2B = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  console.log("Running scheduled Delhivery B2B token refresh.");
  try {
    await getDelhiveryToken(); // This function now logs success internally
    console.log('Delhivery B2B token refresh attempt finished.');
  } catch (error) {
    // Error is logged within getDelhiveryToken, but log here too for job context
    console.error('Error during scheduled Delhivery B2B token refresh:', error);
  }
  return null; // Indicate successful completion of the scheduled function run
});

// Consider adding scheduled functions for XpressBees and Shiprocket tokens too, if they expire.
// Example for Shiprocket (runs less frequently):
exports.scheduledTokenRefreshShiprocket = functions.pubsub.schedule('every 7 days').onRun(async (context) => {
    console.log("Running scheduled Shiprocket token refresh.");
    try {
        await generateShiprocketAuthToken();
        console.log('Shiprocket token refresh attempt finished.');
    } catch (error) {
        console.error('Error during scheduled Shiprocket token refresh:', error);
    }
    return null;
});

// Example for XpressBees (assuming it expires daily, adjust schedule as needed):
exports.scheduledTokenRefreshXpressBees = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    console.log("Running scheduled XpressBees token refresh.");
    try {
        await getXpreessBeesToken();
        console.log('XpressBees token refresh attempt finished.');
    } catch (error) {
        console.error('Error during scheduled XpressBees token refresh:', error);
    }
    return null;
});


/**
 * Cancels an order in the respective courier portal when an order document is updated to CANCELLED in Firestore.
 * Handles refunding wallet balance.
 * @param {object} event - The event object.
 */
exports.cancelOrder = onDocumentUpdated('orders/{orderId}', async (event) => {
  const newValue = event.data.after.data();
  const previousValue = event.data.before.data();
  const orderId = event.params.orderId; // Firestore document ID

  if (!newValue || !previousValue) {
      console.error(`Missing data for order cancellation check ${orderId}`);
      return;
  }

  const currentStatus = newValue.current_status;
  const previousStatus = previousValue.current_status;

  // Only trigger if status changes TO "CANCELLED"
  if (currentStatus === 'CANCELLED' && previousStatus !== 'CANCELLED') {
    console.log(`Processing cancellation for order ${orderId}. Previous status: ${previousStatus}`);

    const courierId = newValue.courier_id;
    const waybill = newValue.awb_id;
    const userId = newValue.user_id;
    const rate = Number((newValue.courier_charges || 0).toFixed(2));

    // If the order was never shipped (no AWB), just ensure status is CANCELLED.
    // No API call needed, no refund applicable yet.
    if (!waybill || previousStatus === 'UNSHIPPED') {
        console.log(`Order ${orderId} cancelled before shipping or AWB generation. No API cancellation needed.`);
        // Ensure cancel_response is clear if needed
        // await event.data.after.ref.update({ cancel_response: "Cancelled before shipment." });
        return;
    }

    if (!userId) {
        console.error(`User ID missing for order ${orderId}. Cannot process refund.`);
        // Update status but flag the refund issue
        await event.data.after.ref.update({ cancel_response: "Cancellation processed, but refund failed (missing user ID)." });
        return;
    }

    // Common function to handle wallet refund
    const handleRefund = async (successMessage, failureMessage) => {
        if (rate <= 0) {
            console.warn(`Courier charges are zero or invalid for cancelled order ${orderId}. Skipping refund.`);
            await event.data.after.ref.update({ cancel_response: successMessage + " (No charges to refund)." });
            return true; // Indicate cancellation was processed, even if no refund needed
        }

        const walletDocRef = admin.firestore().collection('wallets').doc(userId);
        try {
            await admin.firestore().runTransaction(async (transaction) => {
                const walletDoc = await transaction.get(walletDocRef);
                if (!walletDoc.exists) {
                    throw new Error(`User wallet ${userId} not found for refund.`);
                }
                const walletData = walletDoc.data();
                const currentWalletAmount = Number(walletData.balance || 0);
                const newWalletAmount = Number((currentWalletAmount + rate).toFixed(2));

                transaction.update(walletDocRef, { balance: newWalletAmount });

                // Create refund transaction record
                const transactionData = {
                    user_id: userId,
                    amount: rate,
                    transaction_details: `Refund for cancelled order - AWB: ${waybill}`,
                    transaction_type: 'Credit',
                    status: "Success",
                    created_at: admin.firestore.Timestamp.now(),
                    order_doc_id: orderId
                };
                transaction.set(admin.firestore().collection('transactions').doc(), transactionData);

                console.log(`Refunded ${rate} to wallet ${userId}. New balance: ${newWalletAmount}.`);
            });
            // Update order with success message after successful refund
            await event.data.after.ref.update({ cancel_response: successMessage });
            return true; // Refund successful
        } catch (refundError) {
            console.error(`Wallet refund failed for cancelled order ${orderId}:`, refundError);
            // Update order with failure message
            await event.data.after.ref.update({ cancel_response: failureMessage + ` (Refund Error: ${refundError.message})` });
            return false; // Refund failed
        }
    };

    // --- Courier Specific Cancellation Logic ---

    // Delhivery B2C Cancellation
    if (courierId === 999) {
      const apiKey = process.env.DELHIVERY_API_KEY;
      if (!apiKey) {
          console.error("DELHIVERY_API_KEY not set for B2C cancellation.");
          await event.data.after.ref.update({ current_status: previousStatus, cancel_response: "Cancellation failed (Server config error)." });
          return;
      }
      const apiUrl = 'https://track.delhivery.com/api/p/edit';
      const requestData = { waybill: waybill, cancellation: true }; // Boolean true
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${apiKey}` },
        body: JSON.stringify(requestData)
      };

      try {
          console.log(`Attempting Delhivery B2C cancellation for AWB: ${waybill}`);
          const response = await fetch(apiUrl, requestOptions);
          const responseText = await response.text(); // Read as text first
          console.log("Delhivery B2C Cancel Response Text:", responseText);

          // Delhivery often returns simple "true" or "false" as text/plain
          const isSuccess = responseText.toLowerCase().includes("true");

          if (response.ok && isSuccess) {
              console.log(`Delhivery B2C cancellation successful for AWB: ${waybill}`);
              await handleRefund("Shipment cancelled successfully (Delhivery B2C).", "Cancellation successful, but refund failed (Delhivery B2C).");
          } else {
              console.error(`Delhivery B2C cancellation failed for AWB: ${waybill}. Response: ${responseText}`);
              await event.data.after.ref.update({ current_status: previousStatus, cancel_response: `Cancellation failed (Delhivery B2C): ${responseText}` });
          }
      } catch (error) {
          console.error(`Error calling Delhivery B2C Cancel API for ${waybill}:`, error);
          await event.data.after.ref.update({ current_status: previousStatus, cancel_response: `Cancellation failed (Delhivery B2C Network Error): ${error.message}` });
      }
    }
    // Delhivery B2B Cancellation (Uses same endpoint as B2C but with Bearer token)
    else if (courierId === 5) {
      if (!delhiveryToken) await getDelhiveryToken();
      if (!delhiveryToken) {
          console.error("Delhivery B2B token unavailable for cancellation.");
          await event.data.after.ref.update({ current_status: previousStatus, cancel_response: "Cancellation failed (Server config error)." });
          return;
      }
      const apiUrl = 'https://track.delhivery.com/api/p/edit'; // Verify if B2B uses a different endpoint
      const requestData = { waybill: waybill, cancellation: true }; // Boolean true
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${delhiveryToken}` }, // Use Bearer
        body: JSON.stringify(requestData)
      };

      try {
          console.log(`Attempting Delhivery B2B cancellation for AWB: ${waybill}`);
          const response = await fetch(apiUrl, requestOptions);
          const responseText = await response.text();
          console.log("Delhivery B2B Cancel Response Text:", responseText);

          const isSuccess = responseText.toLowerCase().includes("true");

          if (response.ok && isSuccess) {
              console.log(`Delhivery B2B cancellation successful for AWB: ${waybill}`);
              await handleRefund("Shipment cancelled successfully (Delhivery B2B).", "Cancellation successful, but refund failed (Delhivery B2B).");
          } else {
              // Attempt to parse as JSON if not simple true/false
              let errorMessage = responseText;
              try {
                  const errorJson = JSON.parse(responseText);
                  errorMessage = errorJson.message || JSON.stringify(errorJson);
              } catch (e) { /* Ignore parse error, use raw text */ }
              console.error(`Delhivery B2B cancellation failed for AWB: ${waybill}. Response: ${errorMessage}`);
              await event.data.after.ref.update({ current_status: previousStatus, cancel_response: `Cancellation failed (Delhivery B2B): ${errorMessage}` });
          }
      } catch (error) {
          console.error(`Error calling Delhivery B2B Cancel API for ${waybill}:`, error);
          await event.data.after.ref.update({ current_status: previousStatus, cancel_response: `Cancellation failed (Delhivery B2B Network Error): ${error.message}` });
      }
    }
    // XpressBees Cancellation
    else if ([1, 6, 8, 12298, 4, 2, 3, 12939, 12938].includes(courierId)) {
      if (!XBeesToken) await getXpreessBeesToken();
      if (!XBeesToken) {
          console.error("XpressBees token unavailable for cancellation.");
          await event.data.after.ref.update({ current_status: previousStatus, cancel_response: "Cancellation failed (Server config error)." });
          return;
      }
      const apiUrl = 'https://shipment.xpressbees.com/api/shipments2/cancel';
      const requestData = { awb: waybill }; // API expects 'awb' field
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${XBeesToken}` }, // Verify auth scheme
        body: JSON.stringify(requestData)
      };

      try {
          console.log(`Attempting XpressBees cancellation for AWB: ${waybill}`);
          const response = await fetch(apiUrl, requestOptions);
          const responseData = await response.json();
          console.log("XpressBees Cancel Response:", responseData);

          if (response.ok && responseData.status === true) {
              console.log(`XpressBees cancellation successful for AWB: ${waybill}`);
              await handleRefund("Shipment cancelled successfully (XpressBees).", "Cancellation successful, but refund failed (XpressBees).");
          } else {
              const errorMessage = responseData.message || JSON.stringify(responseData);
              console.error(`XpressBees cancellation failed for AWB: ${waybill}. Response: ${errorMessage}`);
              await event.data.after.ref.update({ current_status: previousStatus, cancel_response: `Cancellation failed (XpressBees): ${errorMessage}` });
          }
      } catch (error) {
          console.error(`Error calling XpressBees Cancel API for ${waybill}:`, error);
          await event.data.after.ref.update({ current_status: previousStatus, cancel_response: `Cancellation failed (XpressBees Network Error): ${error.message}` });
      }
    }
    // Shiprocket Cancellation
    else if ([32, 225, 217, 170, 54, 14, 346, 19, 18, 29, 55, 58, 82, 142].includes(courierId)) {
      if (!shiprocketAuthToken) await generateShiprocketAuthToken();
      if (!shiprocketAuthToken) {
          console.error("Shiprocket token unavailable for cancellation.");
          await event.data.after.ref.update({ current_status: previousStatus, cancel_response: "Cancellation failed (Server config error)." });
          return;
      }
      const apiUrl = 'https://apiv2.shiprocket.in/v1/external/orders/cancel';
      // Shiprocket cancels based on their Order ID, not AWB directly in this API
      const shiprocketOrderId = newValue.shiprocket_order_id || newValue.order_id; // Use Shiprocket's ID if stored, else fallback
      if (!shiprocketOrderId) {
          console.error(`Shiprocket Order ID not found for order ${orderId} (AWB: ${waybill}). Cannot cancel via API.`);
          await event.data.after.ref.update({ current_status: previousStatus, cancel_response: "Cancellation failed (Missing Shiprocket Order ID)." });
          return;
      }

      const requestData = { ids: [Number(shiprocketOrderId)] }; // Expects array of numeric IDs
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${shiprocketAuthToken}` },
        body: JSON.stringify(requestData)
      };

      try {
          console.log(`Attempting Shiprocket cancellation for Order ID: ${shiprocketOrderId} (AWB: ${waybill})`);
          const response = await fetch(apiUrl, requestOptions);
          const responseData = await response.json();
          console.log("Shiprocket Cancel Response:", responseData);

          // Shiprocket's success indication might vary, check documentation. Assuming status 200 or specific success field.
          if (response.ok && responseData.message?.includes("cancelled successfully")) { // Adjust success check based on actual response
              console.log(`Shiprocket cancellation successful for Order ID: ${shiprocketOrderId}`);
              await handleRefund("Shipment cancelled successfully (Shiprocket).", "Cancellation successful, but refund failed (Shiprocket).");
          } else {
              const errorMessage = responseData.message || JSON.stringify(responseData);
              console.error(`Shiprocket cancellation failed for Order ID: ${shiprocketOrderId}. Response: ${errorMessage}`);
              await event.data.after.ref.update({ current_status: previousStatus, cancel_response: `Cancellation failed (Shiprocket): ${errorMessage}` });
          }
      } catch (error) {
          console.error(`Error calling Shiprocket Cancel API for ${shiprocketOrderId}:`, error);
          await event.data.after.ref.update({ current_status: previousStatus, cancel_response: `Cancellation failed (Shiprocket Network Error): ${error.message}` });
      }
    }
    // Fallback for unhandled couriers
    else {
        console.warn(`Cancellation not implemented for Courier ID: ${courierId} (Order: ${orderId})`);
        // Decide if refund should happen anyway or if manual intervention is needed
        await event.data.after.ref.update({ cancel_response: "Cancellation requested, but courier API not integrated for cancellation." });
        // Maybe attempt refund cautiously?
        // await handleRefund("Order cancelled (API not integrated), refund processed.", "Order cancelled (API not integrated), refund failed.");
    }
  }
  // else: Status did not change to CANCELLED, do nothing.
});


/**
 * Calculates the shipping rate for a B2B order.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.calculateRateBToB = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { pickup_postcode, delivery_postcode, cod, weight, items, declared_value, insaurance } = req.body; // 'insurance' spelling

      // Validate required parameters
      if (!pickup_postcode || !delivery_postcode || cod === undefined || !weight || !items || !Array.isArray(items) || items.length === 0 || declared_value === undefined) {
        return res.status(400).json({ message: 'Missing or invalid required parameters (pickup_postcode, delivery_postcode, cod, weight, items array, declared_value).' });
      }

      const weightKg = Number(weight) || 0.1;
      const declaredValue = Number(declared_value) || 0;
      const isCod = cod === "1";
      const applyInsurance = insaurance === 'carrier'; // Assuming 'carrier' means apply carrier insurance

      // --- Fetch Delhivery B2B (LTL) Rates ---
      async function fetchFromDelhiveryB2B() {
        if (!delhiveryToken) {
          await getDelhiveryToken();
        }
        if (!delhiveryToken) {
            console.warn("Delhivery B2B token unavailable. Skipping B2B rates.");
            return null;
        }

        // Validate and convert item dimensions
        const convertedDimensions = items.map(item => {
            const length = Number(item.length) || 10; // Default dimensions
            const width = Number(item.width) || 10;
            const height = Number(item.height) || 10;
            const count = Number(item.count) || 1;
            if (length <= 0 || width <= 0 || height <= 0 || count <= 0) {
                throw new Error("Invalid item dimensions or count provided.");
            }
            return { length, width, height, count };
        });

        const apiUrl = "https://ltl-billing.delhivery.com/v3/billing/price_breakup"; // Verify endpoint
        const headersList = {
          "Authorization": `Bearer ${delhiveryToken}`,
          "Content-Type": "application/json",
          // "User-Agent": "YourAppName/Version" // Good practice to identify your client
        };

        const bodyContent = JSON.stringify({
          "dimensions": convertedDimensions,
          "weight": weightKg * 1000, // Weight in grams for this API? Verify docs. If KG, use weightKg.
          "cheque_payment": false, // Assuming no cheque payment
          "s_pin": String(pickup_postcode),
          "c_pin": String(delivery_postcode),
          "payment_mode": isCod ? "cod" : "prepaid", // Check if 'cash' or 'cod' is correct
          "cod_amount": isCod ? declaredValue : 0,
          "rov_insurance": applyInsurance, // Risk Of Value insurance
          "inv_amount": declaredValue, // Invoice amount
          "fm_pickup": true, // Assuming first-mile pickup is needed
          // Add other relevant fields if required by API: e.g., product_type, service_type
        });

        console.log("Delhivery B2B Rate Request URL:", apiUrl);
        console.log("Delhivery B2B Rate Request Body:", bodyContent);

        try {
            const response = await fetch(apiUrl, {
              method: "POST",
              body: bodyContent,
              headers: headersList
            });

            const data = await response.json();
            console.log("Delhivery B2B Rate Response:", data);

            if (response.ok && data && data.total !== undefined) {
                // Apply your markup (e.g., +13%)
                const markup = 1.13;
                const formatRate = (value) => Number((Number(value || 0) * markup).toFixed(2));

                return {
                  courier_company_id: 5, // Your internal ID for Delhivery B2B
                  courier_name: 'Delhivery LTL',
                  estimated_delivery_days: data.edd ? parseInt(data.edd.split(' ')[0], 10) : 5, // Example parsing, adjust if needed
                  logo: "URL_TO_DELHIVERY_LTL_LOGO",
                  // Include detailed cost breakdown with markup
                  baseRate: formatRate(data.base?.total),
                  fuelRate: formatRate(data.fuel?.total),
                  codRate: formatRate(data.cod?.total),
                  rovRate: formatRate(data.rov?.total), // Insurance
                  gstRate: formatRate(data.gst?.total),
                  gstPercent: data.gst?.percentile || 0, // GST percentage doesn't need markup
                  demurrageRate: formatRate(data.demurrage?.total),
                  reattemptRate: formatRate(data.reattempt?.total),
                  fmRate: formatRate(data.fm?.total), // First Mile
                  greenRate: formatRate(data.green?.total), // Green Surcharge
                  odaRate: formatRate(data.oda?.total), // Out of Delivery Area
                  handlingRate: formatRate(data.handling?.total),
                  podRate: formatRate(data.pod?.total), // Proof of Delivery
                  processRate: formatRate(data.process), // Processing Fee?
                  sundayRate: formatRate(data.sunday?.total), // Sunday/Holiday Fee
                  rate: formatRate(data.total), // Final rate with markup
                };
            } else {
                const errorMessage = data.message || data.error || JSON.stringify(data);
                console.warn(`Delhivery B2B rate fetch failed: ${errorMessage}`);
                return null;
            }
        } catch (error) {
            console.error("Error fetching Delhivery B2B rates:", error);
            return null;
        }
      }

      // --- Execute B2B rate fetches ---
      // Add other B2B couriers here if needed (e.g., fetchFromRivigoB2B())
      const [delhiveryRatesB2B] = await Promise.all([
        fetchFromDelhiveryB2B(),
        // Add promises for other B2B couriers here
      ]);

      // --- Combine results ---
      const availableCourierCompanies = [];
      if (delhiveryRatesB2B) {
        availableCourierCompanies.push(delhiveryRatesB2B);
      }
      // Add results from other B2B couriers

      // Sort by rate (ascending)
      availableCourierCompanies.sort((a, b) => a.rate - b.rate);

      const finalResponse = {
        status: 200,
        data: {
            available_courier_companies: availableCourierCompanies,
        }
      };

      res.status(200).json(finalResponse);

    } catch (error) {
      console.error('Error in calculateRateBToB function:', error);
      // Send specific error message if it's a validation error from our checks
      if (error.message.includes("Invalid item dimensions")) {
          return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Internal server error calculating B2B rates.' });
    }
  });
});


/**
 * Gets aggregated details of a user from Auth and various Firestore collections.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getUserDetails = onRequest(async (req, res) => {
  // Consider adding authentication/authorization check here
  // Only authorized admins should be able to call this.
  corsHandler(req, res, async () => { // Added corsHandler wrapper
      try {
        const { phone, userId, email } = req.body;

        // Ensure at least one identifier is provided
        if (!phone && !userId && !email) {
          return res.status(400).json({ message: 'Please provide at least one identifier (phone, userId, or email).' });
        }

        let userRecord;
        let targetUserId = userId; // Use provided userId first

        // Find user by phone number
        if (!targetUserId && phone) {
          try {
            userRecord = await admin.auth().getUserByPhoneNumber(phone);
            targetUserId = userRecord.uid; // Get userId from phone lookup
            console.log(`Found user by phone ${phone}: UID ${targetUserId}`);
          } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log(`User not found for phone: ${phone}`);
            } else {
                console.error('Error fetching user by phone number:', error);
            }
          }
        }

        // Find user by email
        if (!targetUserId && email) {
          try {
            userRecord = await admin.auth().getUserByEmail(email);
            targetUserId = userRecord.uid; // Get userId from email lookup
            console.log(`Found user by email ${email}: UID ${targetUserId}`);
          } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log(`User not found for email: ${email}`);
            } else {
                console.error('Error fetching user by email:', error);
            }
          }
        }

        // If targetUserId is still not found, and wasn't provided initially, return error
        if (!targetUserId) {
            return res.status(404).json({ message: 'User not found with provided identifiers.' });
        }

        // Fetch user record by UID if not already fetched
        if (!userRecord) {
            try {
                userRecord = await admin.auth().getUser(targetUserId);
                console.log(`Fetched user record for UID: ${targetUserId}`);
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    console.error(`User record not found for UID: ${targetUserId}, although an identifier matched previously?`);
                    // This case is strange but handle it. Maybe the user was deleted between lookups.
                    return res.status(404).json({ message: `User record not found for UID: ${targetUserId}.` });
                } else {
                    console.error(`Error fetching user record for UID ${targetUserId}:`, error);
                    return res.status(500).json({ message: 'Error fetching user authentication details.' });
                }
            }
        }

        // Collections to search for user-related data (using targetUserId)
        const collectionsToQuery = {
            kycdetails: 'userId',
            orders: 'user_id', // Check field name consistency
            transactions: 'user_id',
            wallets: 'userId', // Assuming wallet doc ID is userId, or query by 'userId' field if it exists
            complaints: 'userId',
            pickuprequests: 'userId', // Check field name
            remittances: 'user_id',
            users: 'userId', // Assuming user profile doc ID is userId, or query by 'userId' field
            warehouses: 'userId' // Check field name
        };

        const firestoreDetails = {};
        const promises = [];

        console.log(`Fetching Firestore data for user: ${targetUserId}`);

        for (const [collectionName, fieldName] of Object.entries(collectionsToQuery)) {
            let query;
            // Special handling for collections where doc ID might be the user ID
            if (['wallets', 'users', 'kycdetails'].includes(collectionName)) { // Adjust this list as needed
                query = admin.firestore().collection(collectionName).doc(targetUserId).get();
                promises.push(
                    query.then(doc => {
                        if (doc.exists) {
                            firestoreDetails[collectionName] = [{ id: doc.id, ...doc.data() }]; // Store as array for consistency
                        } else {
                            firestoreDetails[collectionName] = [];
                        }
                    }).catch(err => {
                        console.error(`Error fetching doc ${targetUserId} from ${collectionName}:`, err);
                        firestoreDetails[collectionName] = { error: err.message };
                    })
                );
            } else {
                // Query other collections using the specified field name
                query = admin.firestore().collection(collectionName).where(fieldName, '==', targetUserId).get();
                promises.push(
                    query.then(snapshot => {
                        if (!snapshot.empty) {
                            firestoreDetails[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        } else {
                            firestoreDetails[collectionName] = [];
                        }
                    }).catch(err => {
                        console.error(`Error querying ${collectionName} for user ${targetUserId}:`, err);
                        firestoreDetails[collectionName] = { error: err.message };
                    })
                );
            }
        }

        // Wait for all Firestore queries to complete
        await Promise.all(promises);
        console.log(`Finished fetching Firestore data for user: ${targetUserId}`);

        // Combine Authentication and Firestore data
        const responseData = {
          auth: {
              uid: userRecord.uid,
              email: userRecord.email,
              emailVerified: userRecord.emailVerified,
              phoneNumber: userRecord.phoneNumber,
              displayName: userRecord.displayName,
              photoURL: userRecord.photoURL,
              disabled: userRecord.disabled,
              metadata: {
                  creationTime: userRecord.metadata.creationTime,
                  lastSignInTime: userRecord.metadata.lastSignInTime,
              },
              // customClaims: userRecord.customClaims, // Uncomment if you use custom claims
              // providerData: userRecord.providerData, // Uncomment if needed
          },
          firestore: firestoreDetails
        };

        return res.status(200).json(responseData);
      } catch (error) {
        // Catch errors from the initial identifier lookups or general processing
        console.error('Error retrieving user details:', error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
      }
  }); // End corsHandler
});


/**
 * Gets all transactions (consider pagination for large datasets).
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getAllTransactions = onRequest(async (req, res) => {
  // Add authentication/authorization check - only admins should access this.
  corsHandler(req, res, async () => { // Added corsHandler wrapper
      try {
        // Basic pagination example (add more robust handling as needed)
        const limit = parseInt(req.query.limit, 10) || 100; // Default limit
        const lastVisibleId = req.query.startAfter; // ID of the last doc from the previous page

        let query = admin.firestore().collection('transactions')
                      .orderBy('created_at', 'desc') // Order by creation time, descending
                      .limit(limit);

        if (lastVisibleId) {
            const lastDoc = await admin.firestore().collection('transactions').doc(lastVisibleId).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            } else {
                console.warn(`startAfter document ID ${lastVisibleId} not found.`);
                // Decide how to handle: error or just start from beginning?
                // Starting from beginning might be confusing for pagination.
                // return res.status(400).json({ message: 'Invalid startAfter document ID.' });
            }
        }

        const snapshot = await query.get();

        if (snapshot.empty && !lastVisibleId) { // Check if empty only on the first page request
          return res.status(404).json({ message: 'No transactions found.' });
        }

        const transactions = snapshot.docs.map(doc => ({
          id: doc.id, // Firestore document ID
          ...doc.data() // Transaction data
        }));

        // Determine the ID of the last document for the next page request
        const nextStartAfterId = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;

        return res.status(200).json({
            transactions: transactions,
            nextPageToken: nextStartAfterId // Token for the next page query
        });

      } catch (error) {
        console.error('Error retrieving transactions:', error);
        return res.status(500).json({ message: 'Internal server error retrieving transactions.' });
      }
  }); // End corsHandler
});


/**
 * Tracks a web order via HTTP GET request using query parameters.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.trackWebOrder = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const { orderId, awbId } = req.query; // Use query parameters for GET requests

    if (!orderId && !awbId) {
      return res.status(400).json({ message: 'ERROR :: Please provide either orderId or awbId query parameter.' });
    }

    try {
      let orderQuery;

      // Prioritize searching by AWB ID if provided, as it's usually more unique across systems
      if (awbId) {
        orderQuery = admin.firestore().collection('orders').where('awb_id', '==', awbId).limit(1);
      } else if (orderId) {
        // Assuming orderId here refers to the Firestore document ID
        orderQuery = admin.firestore().collection('orders').doc(orderId);
      }

      const snapshot = await (orderQuery.get ? orderQuery.get() : orderQuery); // Handle both Query and DocumentReference

      let orderDoc;
      if (snapshot.docs) { // Result from a query
          if (snapshot.empty) {
              return res.status(404).json({ message: 'ERROR :: Order not found.' });
          }
          orderDoc = snapshot.docs[0];
      } else { // Result from a direct doc get
          if (!snapshot.exists) {
              return res.status(404).json({ message: 'ERROR :: Order not found.' });
          }
          orderDoc = snapshot;
      }

      const orderData = orderDoc.data();

      // Safely parse the 'data' field which contains the original order JSON
      let orderDetailsParsed = {};
      try {
          if (orderData.data) {
              orderDetailsParsed = JSON.parse(orderData.data);
          }
      } catch (e) {
          console.error(`Failed to parse order details JSON for order ${orderDoc.id}:`, e);
          // Continue without parsed details or return an error? Decide based on requirements.
      }

      // Prepare response, selecting relevant fields
      const responseData = {
        order_id: orderData.order_id, // The original order ID from the JSON data
        firestore_doc_id: orderDoc.id, // The Firestore document ID
        awb_id: orderData.awb_id || null,
        lrnum: orderData.lrnum || null, // Include LRN if available
        current_status: orderData.current_status || 'UNKNOWN',
        courier_charges: orderData.courier_charges || 0,
        courier_id: orderData.courier_id || null,
        courier_name: getCourierName(orderData.courier_id), // Helper function to get name
        timestamp: orderData.timestamp?.toDate()?.toISOString() || null, // Convert Firestore timestamp
        // Include key details from the parsed order JSON
        billing_customer_name: orderDetailsParsed.billing_customer_name || null,
        billing_address: orderDetailsParsed.billing_address || null,
        billing_city: orderDetailsParsed.billing_city || null,
        billing_pincode: orderDetailsParsed.billing_pincode || null,
        payment_method: orderDetailsParsed.payment_method || null,
        sub_total: orderDetailsParsed.sub_total || 0,
        order_items: orderDetailsParsed.order_items || [],
        // Optionally include tracking history if fetched/stored separately
        // tracking_history: orderData.tracking_history || [],
      };

      return res.status(200).json({ status: 'success', order: responseData });

    } catch (error) {
      console.error('Error fetching web order:', error);
      return res.status(500).json({ message: 'ERROR :: Internal server error.' });
    }
  });
});

// Helper function to get courier name (expand as needed)
function getCourierName(courierId) {
    if (courierId === 999) return "Delhivery B2C";
    if (courierId === 5) return "Delhivery B2B (LTL)";
    if ([1, 6, 8, 12298, 4, 2, 3, 12939, 12938].includes(courierId)) return "XpressBees";
    if ([32, 225, 217, 170, 54, 14, 346, 19, 18, 29, 55, 58, 82, 142].includes(courierId)) return "Shiprocket Partner"; // Be more specific if possible
    return "Unknown Courier";
}