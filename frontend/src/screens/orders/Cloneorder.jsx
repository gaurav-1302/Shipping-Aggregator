import React, { useEffect, useState } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import { RxCrossCircled } from 'react-icons/rx';
import { db } from '../../firebase.config';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { analytics } from '../../firebase.config';
import { logEvent } from 'firebase/analytics';

// Import environment variables for API URL
const PINCODE_API_URL = process.env.REACT_APP_PINCODE_API_URL;

/**
 * Cloneorders Component: Handles the cloning of existing orders.
 * It includes fetching order details, form handling, validation, and interaction with Firestore.
 */
function Cloneorders() {
    const navigate = useNavigate();

    const [searchParams, setSearchParams] = useSearchParams();
    const new_order_id = searchParams.get("new_order_id")
    console.log(searchParams.get("new_order_id"))

    const [userId, setUserId] = useState('');

    /**
     * useEffect hook to retrieve the current user's ID from local storage.
     */

    useEffect(() => {
        const currentUser = localStorage.getItem('umaxshipuser');
        const jsonData = JSON.parse(currentUser);
        if (jsonData) {
            setUserId(jsonData.uid);
        }
    }, [])

    // State to store the list of warehouses

    /**
     * useEffect hook to fetch the list of warehouses associated with the current user.
     */
    const [warehouses, setWarehouses] = useState([]);

    useEffect(() => {
        const fetchWarehouse = async () => {
            const q = query(collection(db, "warehouses"), where("user_id", "==", userId));
            const querySnapshot = await getDocs(q);
            const warehouseData = [];
            querySnapshot.forEach((doc) => {
                const docData = doc.data();
                warehouseData.push({ ...docData, id: doc.id });
            });
            setWarehouses(warehouseData);
        }

        fetchWarehouse();
    }, [userId])

    // State to store the order data

    const [orderData, setOrderData] = useState({
        order_id: "",
        order_date: "",
        pickup_location: "",
        channel_id: "",
        comment: "",
        billing_customer_name: "",
        billing_last_name: "",
        billing_address: "",
        billing_address_2: "",
        billing_city: "",
        billing_pincode: '',
        billing_state: "",
        billing_country: "",
        billing_email: "",
        billing_phone: '',
        shipping_is_billing: 1,
        order_items: [],
        payment_method: "",
        shipping_charges: '',
        giftwrap_charges: '',
        transaction_charges: '',
        total_discount: '',
        sub_total: '',
        length: '',
        breadth: '',
        height: '',
        weight: '',
    });
    const [returnLocation, setReturnLocation] = useState({});

    // State to track if data is loading
    const [loadingData, setLoadingData] = useState(true);

    /**
     * useEffect hook to fetch the order data based on the new_order_id.
     */
    // Fetch order data on component mount and when new_order_id changes
    useEffect(() => {
        const fetchOrderData = async () => {
            if (!new_order_id) {
                return; // No order ID, nothing to fetch
            }

            const docRef = doc(db, "orders", new_order_id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists) {
                const docData = docSnap.data();
                const mainData = JSON.parse(docData.data);
                setOrderData({
                    ...mainData,
                    order_items: mainData.order_items.map(item => ({
                        ...item,
                        name: item.name || '',
                        sku: item.sku || '',
                        units: item.units || 0,
                        selling_price: item.selling_price || '',
                        hsn: item.hsn || 1234,
                    })),
                });


                setReturnLocation(JSON.parse(docData.returnLocation))
            } else {
                console.error("Order not found:", new_order_id);
                // Handle the case where the order is not found (optional)
            }
            setLoadingData(false)
        };

        fetchOrderData();
    }, [new_order_id]);

    // State to track the validity of the entered pincode

    /**
     * Validates the pincode using an external API.
     */
    const [pinCodeValid, setPinCodeValid] = useState(null);

    const validatePincode = async () => {

        if (String(orderData.billing_pincode).length !== 6) {
            setPinCodeValid(false);
            return;
        }

        try {
            const response = await fetch(`${PINCODE_API_URL}${orderData.billing_pincode}`);
            const data = await response.json();

            if (data[0].Status === 'Success') {
                setPinCodeValid(true);
                setOrderData((prevState) => ({
                    ...prevState,
                    billing_city: data[0].PostOffice[0].Division,
                    billing_state: data[0].PostOffice[0].State,
                    billing_country: data[0].PostOffice[0].Country
                }));
            } else {
                setPinCodeValid(false);
            }
        } catch (error) {
            console.error('Error fetching pincode data:', error);
            setPinCodeValid(false); // Set to invalid on network/API errors
        }
    };

    /**
     * Generates a unique order ID.
     */
    const generateOrderId = () => {
        const timestamp = Date.now().toString() + Math.random().toString(36).substring(2, 7);
        setOrderData({ ...orderData, order_id: timestamp });
        return timestamp;
    }

    /**
     * Handles changes in the form inputs.
     * @param {Event} event - The change event.
     */
    const handleFormChange = (event) => {
        const { name, value } = event.target;

        const numericFields = ['billing_pincode', 'shipping_charges', 'giftwrap_charges', 'transaction_charges', 'total_discount', 'sub_total', 'length', 'breadth', 'height', 'weight', 'units', 'selling_price', 'hsn'];

        const updatedValue = numericFields.includes(name) ? Number(value) : value;

        setOrderData((prevState) => ({
            ...prevState,
            [name]: updatedValue,
        }));
    }

    // Get the order item container element.
    const orderItemsContainer = document.getElementById('orderItems');

    /**
     * Creates a new order item in the DOM.
     */
    const createNewOrderItem = () => {
        const templateElement = document.getElementById('orderItems'); // Replace with your template element ID
        const newOrderItem = templateElement.cloneNode(true);

        // Clear input values
        newOrderItem.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => input.value = '');

        // Insert the new item after the existing one
        orderItemsContainer.parentNode.insertBefore(newOrderItem, orderItemsContainer.nextSibling);

        // Get updated order item data after DOM update
        const orderItemData = getOrderItemsData();
        orderItemsData.push(orderItemData);
    };

    // Array to store order item data
    const orderItemsData = [];

    /**
     * Retrieves the data from each order item in the DOM.
     */
    function getOrderItemsData() {
        const orderItems = document.querySelectorAll('#orderItems'); // Update selector to target individual item class

        const itemsData = [];
        for (const orderItem of orderItems) {
            const nameInput = orderItem.querySelector('input[name="name"]');
            const skuInput = orderItem.querySelector('input[name="sku"]');
            const unitsInput = orderItem.querySelector('input[name="units"]')
            const sellingPriceInput = orderItem.querySelector('input[name="selling_price"]')
            const hsnInput = orderItem.querySelector('input[name="hsn"]')

            const itemData = {
                name: nameInput ? nameInput.value : "",
                sku: skuInput ? skuInput.value : "",
                units: unitsInput ? parseInt(unitsInput.value) : 0,
                selling_price: sellingPriceInput ? sellingPriceInput.value : "",
                hsn: hsnInput ? hsnInput.value : 1234,

            };
            itemsData.push(itemData);
        }
        return itemsData;
    }

    /**
     * Handles changes in the return location selection.
     */
    const handleReturnLocationChange = (event) => {
        const { checked } = event.target;

        if (checked) {
            // Same as Pickup Address is checked
            const selectedPickupLocation = orderData.pickup_location; // Access pickup location from orderData

            const matchingWarehouse = warehouses.find(
                (warehouse) => warehouse.pickup_location === selectedPickupLocation
            );

            if (matchingWarehouse) {
                setReturnLocation({
                    ...matchingWarehouse, // Copy data from matching warehouse
                });
            } else {
                // Handle case where no matching warehouse is found (optional)
                console.error("Pickup location not found in warehouses array");
                setReturnLocation({}); // Reset return location if no match
            }
        } else {
            // User selected a warehouse from the dropdown (handled as before)
            const selectedWarehouse = warehouses.find(
                (warehouse) => warehouse.pickup_location === event.target.value
            );

            if (selectedWarehouse) {
                setReturnLocation({
                    ...selectedWarehouse, // Copy data from selected warehouse
                });
            } else {
                // Handle case where no matching warehouse is found (optional)
                console.error("Selected warehouse not found in warehouses array");
                setReturnLocation({}); // Reset return location if no match
            }
        }
    };

    // State to manage toast messages
    const [errorToast, setErrorToast] = useState(false);
    const [successToast, setSuccessToast] = useState(false);
    // State to track if data is being saved
    const [savingData, setSavingData] = useState(false);
    // State to store the toast message
    const [toastMessage, setToastMessage] = useState('')

    /**
     * Creates a new order in Firestore. */
    const createOrder = async () => {
        const new_id = generateOrderId();
        const orderItemData = getOrderItemsData();
        const finalOrderData = { ...orderData, order_items: orderItemData, order_id: new_id };

        const requiredFields = ['order_id', 'billing_customer_name', 'billing_phone', 'billing_address', 'billing_pincode', 'billing_state', 'billing_city', 'order_date', 'payment_method', 'sub_total', 'weight', 'length', 'breadth', 'height', 'pickup_location',];
        const emptyFields = requiredFields.filter(field => !finalOrderData[field]);

        console.log(finalOrderData.order_items[0]);

        if (Number(orderData.sub_total) !== Number(finalOrderData.order_items[0].selling_price)) {
            const errorMessage = "The COD amount should be equal to order value.";
            setToastMessage(errorMessage);
            setErrorToast(true);
            setSavingData(false);
            return;
        }

        const invalidChars = new RegExp(/[^a-zA-Z0-9 ,.-/]/); // Matches characters except letters, numbers, comma, space, hyphen, and dot
        const isBillingAddressInvalid = typeof finalOrderData.billing_address === 'string' && invalidChars.test(finalOrderData.billing_address);

        if (isBillingAddressInvalid) {
            const errorMessage = "Invalid characters found in billing address. Allowed characters are letters, numbers, comma, space, hyphen, slash and dot.";
            setToastMessage(errorMessage);
            setErrorToast(true);
            setSavingData(false);
            return;
        }

        if (emptyFields.length > 0) {
            // Create error toast message listing empty fields
            const errorMessage = `Please fill in the following required fields: ${emptyFields.join(', ')}`;
            setToastMessage(errorMessage);
            setErrorToast(true);
            setSavingData(false);
            return; // Exit the function if there are empty fields
        }

        // console.log(JSON.stringify(returnLocation));
        setSavingData(true)
        await setDoc(doc(db, "orders", new_id), {
            data: JSON.stringify(finalOrderData),
            returnLocation: JSON.stringify(returnLocation),
            timestamp: serverTimestamp(),
            user_id: userId,
            current_status: "UNSHIPPED"
        }).then(() => {
            setToastMessage('Order created successfully.');
            setSuccessToast(true);
            setSavingData(false);
            generateOrderId();
            logEvent(analytics, 'order_creation', {
                weight: `${orderData.weight} KG`,
                paymentType: orderData.payment_method,
                userId: userId,
                type: 'B2C',
            });
            
        }).catch((error) => {
            setToastMessage('Error in creating order!');
            setErrorToast(true);
            setSavingData(false);
            generateOrderId();
        })
    }

    if (loadingData) {
        return (
            <div class="flex items-center justify-center w-56 h-56 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <div class="px-3 py-1 text-xs font-medium leading-none text-center text-blue-800 bg-blue-200 rounded-full animate-pulse dark:bg-blue-900 dark:text-blue-200">loading...</div>
            </div>
        )
    }

    return (
        <div className="bg-white p-5 rounded-lg mt-3 dark:bg-gray-800 border border-[#07847F] border-dashed">

            {
                successToast &&
                <div style={{ zIndex: 999 }} className='fixed right-10 top-10'>
                    <div id="toast-success" class="flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-[#0E9F6E]" role="alert">
                        <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-green-500 bg-green-100 rounded-lg dark:bg-green-800 dark:text-green-200">
                            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z" />
                            </svg>
                            <span class="sr-only">Check icon</span>
                        </div>
                        <div class="ms-3 text-sm text-black font-normal">{toastMessage}</div>
                        <button onClick={() => setSuccessToast(false)} type="button" class="ms-3 -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700" data-dismiss-target="#toast-success" aria-label="Close">
                            <span class="sr-only">Close</span>
                            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                            </svg>
                        </button>
                    </div>
                </div>
            }

            {
                errorToast &&
                <div style={{ zIndex: 999 }} className='fixed right-10 top-10'>
                    <div id="toast-danger" class="flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-[#F05252]" role="alert">
                        <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-red-500 bg-red-100 rounded-lg dark:bg-red-800 dark:text-red-200">
                            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 11.793a1 1 0 1 1-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 0 1 1.414-1.414L10 8.586l2.293-2.293a1 1 0 0 1 1.414 1.414L11.414 10l2.293 2.293Z" />
                            </svg>
                            <span class="sr-only">Error icon</span>
                        </div>
                        <div class="ms-3 text-sm text-black font-normal">{toastMessage}</div>
                        <button onClick={() => setErrorToast(false)} type="button" class="ms-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700" data-dismiss-target="#toast-danger" aria-label="Close">
                            <span class="sr-only">Close</span>
                            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                            </svg>
                        </button>
                    </div>
                </div>
            }


            <p className='text-sm dark:text-gray-400'><span className='text-red-600 font-bold'>*</span>All Fields Required</p>

            <p className='mt-4 text-xl font-bold dark:text-white'>Consignee Details</p>

            <div className='mx-auto grid grid-cols-3 md:grid-cols-4 gap-4 mt-5'>
                <div class="mb-4">
                    <label for="name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        First Name <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="text" name='billing_customer_name'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="" autoComplete='none' onChange={handleFormChange} value={orderData.billing_customer_name} required />
                </div>
                <div class="mb-4">
                    <label for="name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Last Name <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="text" name='billing_last_name'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="" onChange={handleFormChange} autoComplete='none' value={orderData.billing_last_name} required />
                </div>
                <div class="mb-4">
                    <label for="phone" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Phone Number <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="number" name='billing_phone'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
                        autoComplete='none'
                        onChange={handleFormChange}
                        value={orderData.billing_phone}
                        maxLength={10}
                        required />
                </div>
                <div class="mb-4">
                    <label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Email
                    </label>
                    <input type="email" name='billing_email'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="" onChange={handleFormChange}
                        value={orderData.billing_email}
                        autoComplete='none' />
                </div>
            </div>

            <p className='mt-4 text-xl font-bold dark:text-white'>Customer Address</p>

            <div className='mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 mt-5'>
                <div class="mb-3">
                    <label for="address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Complete Address <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="text" name='billing_address'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        value={orderData.billing_address}
                        placeholder="" onChange={handleFormChange} autoComplete='none' required />
                </div>
                <div class="mb-3">
                    <label for="pincode" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Pincode <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <div class="relative w-full">
                        <input type="number"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            maxLength={6}
                            value={orderData.billing_pincode}
                            name='billing_pincode'
                            onChange={handleFormChange}
                            onBlur={validatePincode}
                            required
                        />
                        {
                            pinCodeValid === true ?
                                <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white rounded-e-lg border">
                                    <FaCheckCircle color='green' />
                                </button>
                                : pinCodeValid === false ?
                                    <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white rounded-e-lg border">
                                        <RxCrossCircled color='red' />
                                    </button>
                                    :
                                    <></>
                        }
                    </div>
                </div>
                <div class="mb-3">
                    <label for="landmark" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Famous Landmark
                    </label>
                    <input type="text" name='billing_address_2'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        value={orderData.billing_address_2}
                        placeholder="" onChange={handleFormChange} autoComplete='none' />
                </div>
                <div class="mb-4">
                    <label for="address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        State <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="text" name='billing_state'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="" onChange={handleFormChange} value={orderData.billing_state} autoComplete='none' disabled contentEditable={false} />
                </div>
                <div class="mb-4">
                    <label for="pincode" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        City <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="text" name='billing_city'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        disabled autoComplete='none' onChange={handleFormChange} value={orderData.billing_city} contentEditable={false} />
                </div>
            </div>

            <p className='mt-4 text-xl font-bold dark:text-white'>Order Details</p>

            <div className='mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mt-5'>
                <div class="mb-3">
                    <label for="address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Order Id <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="text" name='order_id'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="Will be auto generated"
                        value={orderData.order_id}
                        disabled
                    />
                </div>
                <div class="mb-3">
                    <label for="pincode" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Order Date <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="date" name='order_date'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        required autoComplete='none' onChange={handleFormChange}
                        value={orderData.order_date}
                    />
                </div>
                <div class="mb-3">
                    <label for="landmark" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Payment Mode <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <select name='payment_method' onChange={handleFormChange}
                        value={orderData.payment_method}
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                        <option value="">Select method</option>
                        <option value="COD">COD</option>
                        <option value="Prepaid">Prepaid</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="pincode" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Total order value/COD amount <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="number" name='sub_total' onChange={handleFormChange}
                        value={orderData.sub_total}
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        required autoComplete='none' />
                </div>
            </div>

            <div id='orderItems' className='mx-auto grid grid-cols-3 md:grid-cols-5 gap-4 mt-3'>
                <div class="mb-3">
                    <label for="address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Product Name <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="text" name='name'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder=""
                        autoComplete='none'
                        value={orderData.order_items[0]?.name}
                    />
                </div>
                <div class="mb-3">
                    <label for="landmark" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Category <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <select name='sku'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder=""
                        autoComplete='none'
                        value={orderData.order_items[0]?.sku}
                    >
                        <option selected>Choose category</option>
                        <option value="Accessories">Accessories</option>
                        <option value="FashionAndClothing">Fashion & Clothing</option>
                        <option value="BookAndStationary">Book & Stationary</option>
                        <option value="Electronics">Electronics</option>
                        <option value="FMCG">FMCG</option>
                        <option value="Footwear">Footwear</option>
                        <option value="Toys">Toys</option>
                        <option value="Sports">Sports</option>
                        <option value="Others">Others</option>
                        <option value="Wellness">Wellness</option>
                        <option value="Medicines">Medicines</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="pincode" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Units <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="number" name='units'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        required autoComplete='none' />
                        value={orderData.order_items[0]?.units}
                </div>
                <div class="mb-3">
                    <label for="pincode" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Order Value <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="number" name='selling_price'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        required autoComplete='none' />
                        value={orderData.order_items[0]?.selling_price}
                </div>
                <div class="mb-3">
                    <label for="pincode" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        HSN
                    </label>
                    <input type="number" name='hsn' autoComplete='none' placeholder='1234'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        value={orderData.order_items[0]?.hsn}
                    />
                </div>
            </div>

            <div className='mx-auto grid grid-cols-3 md:grid-cols-4 gap-4 mt-2'>
                <div class="mb-3">
                    <label for="address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Physical Weight <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <div class="relative w-full">
                        <input type="text" name='weight' autoComplete='none' class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                            placeholder="in KG" required onChange={handleFormChange}
                            value={orderData.weight}
                        />
                        <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white bg-blue-700 rounded-e-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                            KG
                        </button>
                    </div>
                </div>
                <div class="mb-3">
                    <label for="pincode" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Length <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <div class="relative w-full">
                        <input type="text" name='length' autoComplete='none' id="search-dropdown" class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                            value={orderData.length}
                            placeholder="in cm" required onChange={handleFormChange} />
                        <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white bg-blue-700 rounded-e-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                            cm
                        </button>
                    </div>
                </div>
                <div class="mb-3">
                    <label for="landmark" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Breadth <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <div class="relative w-full">
                        <input type="text" name='breadth' autoComplete='none' id="search-dropdown" class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                            placeholder="in cm" required onChange={handleFormChange}
                            value={orderData.breadth}
                        />
                        <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white bg-blue-700 rounded-e-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                            cm
                        </button>
                    </div>
                </div>
                <div class="mb-3">
                    <label for="landmark" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Height <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <div class="relative w-full">
                        <input type="text" name='height' autoComplete='none' id="search-dropdown" class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                            placeholder="in cm" required onChange={handleFormChange}
                            value={orderData.height}
                        />
                        <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white bg-blue-700 rounded-e-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                            cm
                        </button>
                    </div>
                </div>
            </div>

            <p className='mt-4 text-xl font-bold dark:text-white'>Pickup Location <span className='text-red-600 font-bold'>*</span></p>

            {/* <div className='mx-auto grid grid-cols-2 md:grid-cols-2 gap-4 mt-3'>
                <form class="flex items-center max-w-lg mx-full mt-2">
                    <label for="voice-search" class="sr-only">Search</label>
                    <div class="relative w-full">
                        <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                            <CiLocationOn size={18} />
                        </div>
                        <input type="text" id="voice-search" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder="Search by Warehouse Name, Pincode, Cityname..." onChange={handlePickupSearchChange} required />
                    </div>
                    <button type="submit" class="inline-flex items-center py-2.5 px-3 ms-2 text-sm font-medium text-white bg-blue-700 rounded-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                        <svg class="w-4 h-4 me-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                        </svg>Search
                    </button>
                </form>
            </div> */}

            <select name='pickup_location' onChange={handleFormChange} class="mt-4 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                <option>Select</option>
                {warehouses.length > 0 &&
                    warehouses.map((item) => (
                        <option key={item.id} value={item.pickup_location}>{item.name} - {item.address}, {item.city}, {item.state}, {item.pin_code}</option>
                    ))
                }
            </select>

            <button type="button" onClick={() => navigate('/warehouse')} class="px-5 mt-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                Add warehouse
            </button>

            <p className='mt-4 text-xl font-bold dark:text-white'>Return Location <span className='text-red-600 font-bold'>*</span></p>

            {/* <div class="flex items-center mb-2 mt-2">
                <input onChange={handleReturnLocationChange} id="default-checkbox" type="checkbox" value="" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                <label for="default-checkbox" class="ms-2 mt-1.5 text-sm font-medium text-gray-900 dark:text-gray-300">Same as Pickup Address</label>
            </div> */}

            <select onChange={handleReturnLocationChange} name='return_location' id="countries" class="mt-4 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                <option>Select</option>
                {warehouses.length > 0 &&
                    warehouses.map((item) => (
                        <option key={item.id} value={item.pickup_location}>{item.name} - {item.address}, {item.city}, {item.state}, {item.pin_code}</option>
                    ))
                }
            </select>

            <button type="button" onClick={() => navigate('/warehouse')} class="px-5 mt-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                Add warehouse
            </button>

            <div className="flex items-center mb-5 mt-2 w-full mt-10">
                <button type="button" class="text-red-700 hover:text-white border border-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:hover:bg-red-600 dark:focus:ring-red-900">
                    Cancel
                </button>

                {
                    savingData ?
                        <button disabled type="button" class="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800">
                            <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                            </svg>
                            Loading...
                        </button>
                        :
                        <button onClick={() => createOrder()} type="submit" class="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800">
                            Add Order
                        </button>
                }
            </div>
        </div >
    )
}

export default Cloneorders