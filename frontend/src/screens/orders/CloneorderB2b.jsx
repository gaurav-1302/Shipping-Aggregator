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

function CloneorderB2b() {

    const navigate = useNavigate();

    // Accessing the order ID from the URL parameters
    const [searchParams, setSearchParams] = useSearchParams();
    const new_order_id = searchParams.get("new_order_id");

    // State to store the current user's ID
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
    }, []);

    // State to store the list of warehouses
    const [warehouses, setWarehouses] = useState([]);

    /**
     * useEffect hook to fetch the list of warehouses associated with the current user.
     */
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
    }, [userId]);

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
        product_desc: "",
        product_category: "",
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
        insaurance: '',
        fm_pickup: '',
    });

    // State to track if data is loading
    const [loadingData, setLoadingData] = useState(true);

    /**
     * useEffect hook to fetch the order data based on the new_order_id.
     */

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
                setOrderData(mainData);
                setReturnLocation(JSON.parse(docData.returnLocation));
            } else {
                console.error("Order not found:", new_order_id);
                // Handle the case where the order is not found (optional)
            }
            setLoadingData(false);
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

    // Get the order item container element.
    const orderItemsContainer = document.getElementById('orderItems');

    /**
     * useEffect hook to generate a new order ID when the orderItemsContainer changes.
     */
    useEffect(() => {
        generateOrderId();
    }, [orderItemsContainer]);

    const handleFormChange = (event) => {
        getOrderItemsData();
        const { name, value } = event.target;

        const numericFields = ['billing_pincode', 'shipping_charges', 'giftwrap_charges', 'transaction_charges', 'total_discount', 'sub_total', 'length', 'breadth', 'height', 'weight', 'units', 'selling_price', 'hsn'];

        const updatedValue = numericFields.includes(name) ? Number(value) : value;

        setOrderData((prevState) => ({
            ...prevState,
            [name]: updatedValue,
        }));
    }

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

    // State to store the total weight and total box count.
    const [totalWeight, setTotalWeight] = useState('');
    const [totalBox, setTotalBox] = useState('');

    /**
     * Retrieves the data from each order item in the DOM.
     */

    function getOrderItemsData() {
        const orderItems = document.querySelectorAll('#orderItems'); // Update selector to target individual item class

        const itemsData = [];
        for (const orderItem of orderItems) {
            const number_of_box = orderItem.querySelector('input[name="number_of_box"]');
            const unitsInput = orderItem.querySelector('input[name="units"]');
            const sellingPriceInput = orderItem.querySelector('input[name="selling_price"]');
            const deadWeight = orderItem.querySelector('input[name="weight"]');
            const height = orderItem.querySelector('input[name="height"]');
            const breadth = orderItem.querySelector('input[name="breadth"]');
            const length = orderItem.querySelector('input[name="length"]');

            const itemData = {
                name: "",
                sku: "",
                units: "",
                selling_price: "",
                hsn: "",
                count: number_of_box.value,
                weight: deadWeight.value,
                height: height.value,
                length: breadth.value,
                breadth: length.value,
            };
            itemsData.push(itemData);
        }

        let totalWeight = 0;
        let totalCount = 0;

        for (const item of itemsData) {
            if (item.weight && item.count) {
                totalWeight += Number(item.weight) * Number(item.count); // Weight multiplied by count
                totalCount += Number(item.count);
            }
        }

        setTotalWeight(totalWeight);
        setTotalBox(totalCount);

        return itemsData;
    }

    /**
     * Deletes the last order item from the DOM.
     */
    function deleteLastOrderItem() {
        const orderItems = document.querySelectorAll('#orderItems'); // Update selector to target individual item class
        if (orderItems.length === 1) {
            return; // Don't delete if it's the only one
        }

        // Remove the last item from the DOM
        const lastOrderItem = orderItems[orderItems.length - 1];
        lastOrderItem.parentNode.removeChild(lastOrderItem);

        // Update orderItems after DOM change
        orderItemsData.splice(-1, 1); // Remove the last item from the array
    }

    // State to store the return location data.
    const [returnLocation, setReturnLocation] = useState({});

    /** Handles changes in the return location selection. */
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
     * Creates a new order in Firestore.
     */
    const createOrder = async () => {

        const orderItemData = getOrderItemsData();

        const new_id = generateOrderId();

        let totalWeight_a = 0;
        let totalCount_a = 0;

        for (const item of orderItemData) {
            if (item.weight && item.count) {
                totalWeight_a += Number(item.weight) * Number(item.count); // Weight multiplied by count
                totalCount_a += Number(item.count);
            }
        }

        const finalOrderData = { ...orderData, order_items: orderItemData, totalWeight: totalWeight_a, totalCount: totalCount_a, order_id: new_id };

        const requiredFields = ['order_id', 'billing_customer_name', 'billing_phone', 'billing_address', 'billing_pincode', 'billing_state', 'billing_city', 'order_date', 'payment_method', 'sub_total', 'pickup_location',];
        const emptyFields = requiredFields.filter(field => !finalOrderData[field]);

        console.log(finalOrderData.order_items[0]);

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
            current_status: "UNSHIPPED",
            order_id: finalOrderData.order_id,
            order_type: "B2B"
        }).then(() => {
            setToastMessage('Order created successfully.');
            setSuccessToast(true);
            setSavingData(false);
            generateOrderId();
            logEvent(analytics, 'order_creation', {
                weight: `${totalWeight} KG`,
                paymentType: orderData.payment_method,
                userId: userId,
                type: 'B2B',
            });
        }).catch((error) => {
            setToastMessage('Error in creating order!');
            setErrorToast(true);
            setSavingData(false);
            generateOrderId();
        })
    }

    // Display loading indicator while data is being fetched
    if (loadingData) {
        return (
            <div class="flex items-center justify-center w-56 h-56 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <div class="px-3 py-1 text-xs font-medium leading-none text-center text-blue-800 bg-blue-200 rounded-full animate-pulse dark:bg-blue-900 dark:text-blue-200">loading...</div>
            </div>
        )
    }

    return (
        // Main container for the component
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
                        value={orderData.billing_email}
                        placeholder="" onChange={handleFormChange} autoComplete='none' />
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
                        Order Id/Invoice Id <span className='text-red-600 font-bold'>*</span>
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
                        value={orderData.order_date}
                        required autoComplete='none' onChange={handleFormChange} />
                </div>
                <div class="mb-3">
                    <label for="landmark" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Payment Mode <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <select name='payment_method' onChange={handleFormChange} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
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
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        required autoComplete='none' />
                </div>
            </div>

            <div className='mx-auto grid grid-cols-3 md:grid-cols-5 gap-4 mt-3'>
                <div class="mb-3">
                    <label for="address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Product Description <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="text" name='product_desc'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder=""
                        autoComplete='none'
                        onChange={handleFormChange}
                    />
                </div>
                <div class="mb-3">
                    <label for="landmark" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Category <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <select name='product_category'
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder=""
                        autoComplete='none'
                        onChange={handleFormChange}
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
                    <label for="address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Insurance Type <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <select id="insaurance" name='insaurance' onChange={handleFormChange} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                        <option value="">Select</option>
                        <option value="owner">Owner Risk</option>
                        <option value="carrier">Carrier Risk</option>
                    </select>
                </div>

                <div class="mb-3">
                    <label for="address" class="block mb-2 text-sm font-normal text-gray-900 dark:text-white">
                        Do you want to self-drop your shipments at our center?<span className='text-red-600 font-bold'>*</span>
                    </label>
                    <select id="fm_pickup" name='fm_pickup' onChange={handleFormChange} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                        <option value="">Select</option>
                        <option value="true">No, Pickup from me</option>
                        <option value="false">Yes, I'll self-drop</option>
                    </select>
                </div>
            </div>

            <div id='orderItems' className='mx-auto grid grid-cols-3 md:grid-cols-5 gap-4 mt-2'>
                <div class="mb-3">
                    <label for="pincode" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        No of Box <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="number" name='number_of_box' onChange={handleFormChange}
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        required autoComplete='none' />
                </div>
                <div class="mb-3">
                    <label for="address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Dead Weight (each box) <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <div class="relative w-full">
                        <input type="text" name='weight' autoComplete='none' class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                            placeholder="in KG" required onChange={handleFormChange} />
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
                            placeholder="in cm" required onChange={handleFormChange} />
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
                            placeholder="in cm" required onChange={handleFormChange} />
                        <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white bg-blue-700 rounded-e-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                            cm
                        </button>
                    </div>
                </div>
            </div>

            <div>
                <button type="button" onClick={createNewOrderItem} class="text-white mt-2 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">
                    + Add more item
                </button>
                <button onClick={deleteLastOrderItem} type="button" class="focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900">
                    Delete last item
                </button>
            </div>


            <p className='mt-4 text-xl font-bold dark:text-white'>Pickup Location <span className='text-red-600 font-bold'>*</span></p>

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

            <div className='mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mt-3'>
                <div class="mb-3">
                    <label for="landmark" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Total dead wieght <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <div class="relative w-full">
                        <input type="text" autoComplete='none' id="search-dropdown" class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                            placeholder="in cm" value={totalWeight} readOnly />
                        <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white bg-blue-700 rounded-e-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                            KG
                        </button>
                    </div>
                </div>
                <div class="mb-3">
                    <label for="landmark" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Total Boxes <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <div class="relative w-full">
                        <input type="text" autoComplete='none' id="search-dropdown" class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                            placeholder="in cm" readOnly value={totalBox} />
                        <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white bg-blue-700 rounded-e-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                            cm
                        </button>
                    </div>
                </div>
            </div>

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

export default CloneorderB2b;