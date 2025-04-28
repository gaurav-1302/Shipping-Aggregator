import React, { useState, useEffect } from 'react'; // Importing necessary React hooks
import Navbar from '../../common/Navbar'; // Importing the Navbar component
import { CiCalculator1 } from "react-icons/ci";
import { FaCheckCircle } from "react-icons/fa";
import { RxCrossCircled } from "react-icons/rx";
import { useNavigate } from 'react-router-dom'; // Importing useNavigate for navigation
import { analytics } from '../../firebase.config'; // Importing Firebase analytics
import { logEvent } from 'firebase/analytics'; // Importing logEvent for analytics

// Importing environment variables
const POSTAL_PINCODE_API_URL = process.env.REACT_APP_POSTAL_PINCODE_API_URL || 'https://api.postalpincode.in/pincode/';
const CALCULATE_RATE_B2C_API_URL = process.env.REACT_APP_CALCULATE_RATE_B2C_API_URL || 'https://calculaterate-vjij5onvgq-uc.a.run.app';
const CALCULATE_RATE_B2B_API_URL = process.env.REACT_APP_CALCULATE_RATE_B2B_API_URL || 'https://calculateratebtob-vjij5onvgq-uc.a.run.app';

function Ratecalc() {

    const navigate = useNavigate(); // Hook for programmatic navigation

    const [userId, setUserId] = useState(''); // State to store the user ID

    // useEffect to fetch and set the user ID from local storage on component mount
    useEffect(() => {
        const currentUser = localStorage.getItem('umaxshipuser');
        if (currentUser) {
            try {
                const jsonData = JSON.parse(currentUser);
                if (jsonData && jsonData.uid) {
                    setUserId(jsonData.uid);
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }
    }, [])

    useEffect(() => {
        const user = window.localStorage.getItem('umaxshipuser');
        if (user === null || user === undefined || user === '') {
            navigate('/login/')
        }
    }, [])

    // State variables for pickup and destination pincodes, and their validation status
    const [pickupCode, setPickupCode] = useState(''); // State for pickup pincode
    const [destCode, setDestCode] = useState(''); // State for destination pincode
    const [pickupValid, setPickupValid] = useState(null); // State for pickup pincode validation
    const [destValid, setDestValid] = useState(null); // State for destination pincode validation

    // Function to validate a pincode using an external API
    const validatePincode = async (value, type) => {
        // Check if the pincode length is not 6, return early
        if (value.length !== 6) {
            return;
        }

        try {
            const response = await fetch(`${POSTAL_PINCODE_API_URL}${value}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            } const data = await response.json();

            if (data[0].Status === 'Success') {
                if (type === 'pickup') {
                    setPickupValid(true);
                } else {
                    setDestValid(true);
                }
            } else {
                if (type === 'pickup') {
                    setPickupValid(false);
                } else {
                    setDestValid(false);
                }
            }
        } catch (error) {
            console.error('Error fetching pincode data:', error);
            setPickupValid(false); // Set to invalid on network/API errors
            setDestValid(false);
        }
    };

    // Event handler for pickup pincode input change
    const handlePickupChange = (event) => {
        const newPincode = event.target.value.replace(/\D/g, ''); // Remove non-digit characters
        setPickupCode(newPincode); // Update the pickup pincode state
        setPickupValid(null); // Reset validation status on change
    };

    // Event handler for destination pincode input change
    const handleDestChange = (event) => {
        const newPincode = event.target.value.replace(/\D/g, ''); // Remove non-digit characters
        setDestCode(newPincode); // Update the destination pincode state
        setDestValid(null); // Reset validation status on change
    };

    // Event handler for pickup pincode input focus
    const handlePickupFocus = () => {
        if (pickupCode.length === 6) {
            validatePincode(pickupCode, 'pickup'); // Validate the pincode if it's 6 digits long
        } else {
            setPickupValid(false); // Set to invalid if not 6 digits
        }
    };

    // Event handler for destination pincode input focus
    const handleDestFocus = () => {
        if (destCode.length === 6) {
            validatePincode(destCode, 'dest'); // Validate the pincode if it's 6 digits long
        }
    };

    const [paymentMode, setPaymentMode] = useState('');
    const [insaurance, setInsaurance] = useState('');
    const [pickupMode, setPickupMode] = useState('');
    const [weight, setWeight] = useState();
    const [length, setLength] = useState();
    const [breadth, setBreadth] = useState();
    const [height, setHeight] = useState();
    const [declaredCost, setDeclaredCost] = useState();
    const [fetchedRates, setFetchedRates] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault(); // Prevent default form submission behavior

        // Check if all required fields are filled and valid
        if (pickupValid === false || destValid === false || paymentMode === '' || weight === undefined || length === undefined || breadth === undefined || height === undefined || declaredCost === undefined) {
            alert('All fields are required');
            return;
        }


        // Set loading state to true
        setLoadingData(true);

        console.log(destCode, pickupCode, paymentMode, weight, length, breadth, height, declaredCost);

        try {
            const response = await fetch('https://calculaterate-vjij5onvgq-uc.a.run.app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }, // Set the content type to JSON
                body: JSON.stringify({
                    pickup_postcode: pickupCode,
                    delivery_postcode: destCode,
                    cod: paymentMode,
                    weight: weight,
                    length: length,
                    breadth: breadth,
                    height: height,
                    declared_value: declaredCost,
                })
            });

            const res = await response.json(); // Parse the JSON response
            setFetchedRates(res.available_courier_companies) // Update the fetched rates state
            console.log(res); // Log the response for debugging
            setLoadingData(false); // Set loading state to false
            // Log the rate calculation event to Firebase analytics
            logEvent(analytics, 'rate_calculation', {
                weight: `${weight} KG`,
                userId: userId,
                type: 'B2C',
            });

        } catch (error) {
            console.error('Error fetching shipping cost:', error);
            setLoadingData(false);
        }
    };

    const nonActiveClass = "px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:text-blue-700 focus:z-10 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white";
    const activeClass = "bg-blue-700 px-4 py-2 text-sm font-medium text-white border border-gray-200 rounded-lg focus:z-10 dark:bg-blue-500 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white"; // CSS classes for active and non-active buttons

    const [orderType, setOrderType] = useState(0); // State to manage the order type (B2C or B2B)

    const itemsData = []; // Array to store order item data

    // Function to create a new order item input group
    const createNewOrderItem = () => {
        const templateElement = document.getElementById('itemsInputs');
        const newOrderItem = templateElement.cloneNode(true);
        // Clear input values
        newOrderItem.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => input.value = '');
        // Insert the new item after the existing one
        templateElement.parentNode.insertBefore(newOrderItem, templateElement.nextSibling);
    };

    // Function to get order items data from the DOM
    function getOrderItemsData() {
        const orderItems = document.querySelectorAll('#itemsInputs'); // Update selector to target individual item class
        console.log(orderItems)

        const itemsData = [];
        for (const orderItem of orderItems) {
            const quantity = orderItem.querySelector('input[name="quantity"]');
            const height = orderItem.querySelector('input[name="height"]');
            const breadth = orderItem.querySelector('input[name="breadth"]');
            const length = orderItem.querySelector('input[name="length"]');

            const itemData = {
                count: Number(quantity.value),
                height: Number(height.value),
                length: Number(length.value),
                width: Number(breadth.value),
            };

            itemsData.push(itemData);
        }
        console.log(itemsData);
        return itemsData;
    }

    // Function to delete the last order item input group
    function deleteLastOrderItem() {
        const orderItems = document.querySelectorAll('#itemsInputs'); // Update selector to target individual item class
        if (orderItems.length === 1) {
            return; // Don't delete if it's the only one
        }

        // Remove the last item from the DOM
        const lastOrderItem = orderItems[orderItems.length - 1];
        lastOrderItem.parentNode.removeChild(lastOrderItem);

        // Update orderItems after DOM change
        itemsData.splice(-1, 1); // Remove the last item from the array
    }

    // Function to get B2B rates
    const getB2BbRates = async () => {

        const orderItemData = getOrderItemsData(); // Get the order item data
        // Check if all required fields are filled and valid
        if (pickupValid === false || destValid === false || paymentMode === '' || declaredCost === undefined) {
            alert('All fields are required');
            return;
        }


        setLoadingData(true);

        try {
            const response = await fetch(CALCULATE_RATE_B2B_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pickup_postcode: pickupCode,
                    delivery_postcode: destCode,
                    cod: paymentMode,
                    weight: weight,
                    items: orderItemData,
                    declared_value: declaredCost,
                    insaurance: insaurance,
                    fm_pickup: pickupMode,
                })
            });

            const res = await response.json();
            setFetchedRates(res.available_courier_companies) // Update the fetched rates state
            console.log(res); // Log the response for debugging
            setLoadingData(false); // Set loading state to false
            // Log the rate calculation event to Firebase analytics
            logEvent(analytics, 'rate_calculation', {
                weight: `${weight} KG`,
                userId: userId,
                type: 'B2B',
            });

        } catch (error) {
            console.error('Error fetching shipping cost:', error);
            setLoadingData(false);
        }

    }

    return (
        // Main container for the Rate Calculator
        <div>
            <Navbar /> {/* Navbar component */}
            {/* Order type selection buttons */}
            <div class="inline-flex rounded-md shadow-sm mt-5 gap-5" role="group">
                <button type="button" class={orderType === 0 ? activeClass : nonActiveClass} onClick={() => setOrderType(0)}> {/* B2C button */}
                    Single Box (B2C) Rates
                </button>
                <button type="button" class={orderType === 1 ? activeClass : nonActiveClass} onClick={() => setOrderType(1)}>
                    Multibox (B2B) Rates
                </button>
            </div>

            {
                // Conditional rendering for B2C order type
                orderType === 0 &&
                <div className='bg-white p-5 mt-5 dark:bg-gray-800 rounded-lg border border-black'>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <p className='mt-4 text-xl font-bold dark:text-white'>Rate Calculator</p>
                            <div className='mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 mt-5'>

                                <div class="mb-3">
                                    <label for="address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Payment mode <span className='text-red-600 font-bold'>*</span>
                                    </label>
                                    <select id="paymentMode" name='paymentMode' onChange={e => setPaymentMode(e.target.value)} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                                        <option value="">Select</option>
                                        <option value="0">Prepaid</option>
                                        <option value="1">COD</option>
                                    </select>
                                </div>

                                <div class="mb-3">
                                    <label for="pincode" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Pickup Area Pincode <span className='text-red-600 font-bold'>*</span>
                                    </label>
                                    <div class="relative w-full">
                                        <input type="number" id="phone"
                                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                            value={pickupCode}
                                            maxLength={6}
                                            onChange={handlePickupChange}
                                            onBlur={handlePickupFocus}
                                            required />
                                        {
                                        /* Conditional rendering for pickup pincode validation status */
                                        pickupValid === true ?
                                        <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white rounded-e-lg border">
                                            <FaCheckCircle color='green' />
                                        </button>
                                        : pickupValid === false ?
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
                                        Destination Pincode <span className='text-red-600 font-bold'>*</span>
                                    </label>
                                    <div class="relative w-full">
                                        <input type="number" id="destCode"
                                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                            value={destCode}
                                            maxLength={6}
                                            onChange={handleDestChange}
                                            onBlur={handleDestFocus}
                                            required
                                        />
                                        {/* Conditional rendering for destination pincode validation status */
                                            destValid === true ?
                                                <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white rounded-e-lg border">
                                                    <FaCheckCircle color='green' />
                                                </button>
                                                : pickupValid === false ?
                                                    <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white rounded-e-lg border">
                                                        <RxCrossCircled color='red' />
                                                    </button>
                                                    :
                                                    <></>
                                        }
                                    </div>
                                </div>

                            </div>

                            <div className='mx-auto grid grid-cols-3 md:grid-cols-4 gap-4 mt-5'>
                                <div class="mb-3">
                                    <label for="address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Physical Weight <span className='text-red-600 font-bold'>*</span>
                                    </label>
                                    <div class="relative w-full">
                                        <input type="number" id='weight' name='weight' class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-e-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                                            placeholder="in KG" required
                                            value={weight}
                                            onChange={e => setWeight(e.target.value)}
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
                                        <input type="number" name='length' class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-e-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                                            placeholder="in cm" required
                                            value={length}
                                            onChange={e => setLength(e.target.value)} />
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
                                        <input type="number" name='breadth' class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-e-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                                            placeholder="in cm" required
                                            value={breadth}
                                            onChange={e => setBreadth(e.target.value)} />
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
                                        <input type="number" name='height' class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-e-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                                            placeholder="in cm" required
                                            value={height}
                                            onChange={e => setHeight(e.target.value)} />
                                        <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white bg-blue-700 rounded-e-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                            cm
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label for="landmark" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                    Item Value in INR <span className='text-red-600 font-bold'>*</span>
                                </label>
                                <div class="relative w-full">
                                    <button disabled class="absolute top-0 start-0 p-2.5 h-full text-sm font-medium text-white bg-blue-700 rounded-s-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                        ₹
                                    </button>
                                    <input type="number" name='declaredCost' class="px-10 block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-s-lg rounded-e-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                                        placeholder="in ₹"
                                        value={declaredCost}
                                        onChange={e => setDeclaredCost(e.target.value)} />
                                </div>
                            </div>

                            {/* Conditional rendering for loading state */}
                            {
                            loadingData ?
                                <button disabled type="button" class="mt-4 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 inline-flex items-center">
                                    <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                                    </svg>
                                    Loading...
                                </button>
                                :
                                <button disabled={loadingData} onClick={handleSubmit} type="button" class="mt-4 text-white bg-blue-700 hover:bg-blue-700/50 focus:ring-4 focus:ring-[#2557D6]/50 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#2557D6]/50 me-2 mb-2">
                                    <CiCalculator1 size={18} className='mr-2' />
                                    Calculate Price
                                </button>
                            }
                        </div>

                        {/* Display fetched rates in a table */}
                        <div>
                            <div class="relative overflow-x-auto shadow-md sm:rounded-lg">
                                <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                                    <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th scope="col" class="px-6 py-3">
                                                Courier Partner
                                            </th>
                                            <th scope="col" class="px-6 py-3">
                                                Courier Name
                                            </th>
                                            <th scope="col" class="px-6 py-3">
                                                Rate
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fetchedRates.length > 0 &&
                                            fetchedRates.map((item) => (
                                                <tr class="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700">
                                                    <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                        <img style={{ height: 25, padding: 2, backgroundColor: 'white' }} src={item.logo} alt={item.courier_name} />
                                                        <br />
                                                    </th>
                                                    <td class="px-6 py-4">
                                                        {item.courier_name}
                                                    </td>
                                                    <td class="px-6 py-4">
                                                        ₹ {(item.rate).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            }

            {
                // Conditional rendering for B2B order type
                orderType === 1 &&
                <div className='bg-white p-5 mt-5 dark:bg-gray-800 rounded-lg border border-black'>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <p className='mt-4 text-xl font-bold dark:text-white'>Rate Calculator</p>
                            <div className='mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 mt-5'>

                                <div class="mb-3">
                                    <label for="address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Payment mode <span className='text-red-600 font-bold'>*</span>
                                    </label>
                                    <select id="paymentMode" name='paymentMode' onChange={e => setPaymentMode(e.target.value)} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                                        <option value="">Select</option>
                                        <option value="0">Prepaid</option>
                                        <option value="1">COD</option>
                                    </select>
                                </div>

                                <div class="mb-3">
                                    <label for="pincode" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Pickup Area Pincode <span className='text-red-600 font-bold'>*</span>
                                    </label>
                                    <div class="relative w-full">
                                        <input type="number" id="phone"
                                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                            value={pickupCode}
                                            maxLength={6}
                                            onChange={handlePickupChange}
                                            onBlur={handlePickupFocus}
                                            required />
                                        {
                                        /* Conditional rendering for pickup pincode validation status */
                                        pickupValid === true ?
                                        <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white rounded-e-lg border">
                                            <FaCheckCircle color='green' />
                                        </button>
                                        : pickupValid === false ?
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
                                        Destination Pincode <span className='text-red-600 font-bold'>*</span>
                                    </label>
                                    <div class="relative w-full">
                                        <input type="number" id="destCode"
                                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                            value={destCode}
                                            maxLength={6}
                                            onChange={handleDestChange}
                                            onBlur={handleDestFocus}
                                            required
                                        />
                                        {
                                        /* Conditional rendering for destination pincode validation status */
                                        destValid === true ?
                                        <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white rounded-e-lg border">
                                            <FaCheckCircle color='green' />
                                        </button>
                                        : pickupValid === false ?
                                        <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white rounded-e-lg border">
                                            <RxCrossCircled color='red' />
                                        </button>
                                        :
                                        <></>
                                        }
                                    </div>
                                </div>

                            </div>

                            <div className='mx-auto grid grid-cols-3 md:grid-cols-3 gap-4 mt-5'>
                                <div class="mb-3">
                                    <label for="address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Total Weight <span className='text-red-600 font-bold'>*</span>
                                    </label>
                                    <div class="relative w-full">
                                        <input type="number" id='weight' name='weight' class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                                            placeholder="in KG" required
                                            value={weight}
                                            onChange={e => setWeight(e.target.value)}
                                        />
                                        <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white bg-blue-700 rounded-e-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                            KG
                                        </button>
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label for="landmark" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Order Value/COD amount <span className='text-red-600 font-bold'>*</span>
                                    </label>
                                    <div class="relative w-full">
                                        <button disabled class="absolute top-0 start-0 p-2.5 h-full text-sm font-medium text-white bg-blue-700 rounded-s-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                            ₹
                                        </button>
                                        <input type="number" name='declaredCost' class="px-10 block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-s-lg rounded-e-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                                            placeholder="in ₹"
                                            value={declaredCost}
                                            onChange={e => setDeclaredCost(e.target.value)} />
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label for="address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Insurance Type <span className='text-red-600 font-bold'>*</span>
                                    </label>
                                    <select id="paymentMode" name='paymentMode' onChange={e => setInsaurance(e.target.value)} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                                        <option value="">Select</option>
                                        <option value="owner">Owner Risk</option>
                                        <option value="carrier">Carrier Risk</option>
                                    </select>
                                </div>

                                <div class="mb-3">
                                    <label for="address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Do you want to self-drop your shipments at our center?<span className='text-red-600 font-bold'>*</span>
                                    </label>
                                    <select id="pickupMode" name='pickupMode' onChange={e => setPickupMode(e.target.value)} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                                        <option value="">Select</option>
                                        <option value="true">No, Pickup from me</option>
                                        <option value="false">Yes, I'll self-drop</option>
                                    </select>
                                </div>

                            </div>

                            <div id='itemsInputs' className='mx-auto grid grid-cols-3 md:grid-cols-4 gap-4 mt-5'>
                                <div class="mb-3">
                                    <label for="address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Quantity <span className='text-red-600 font-bold'>*</span>
                                    </label>
                                    <div class="relative w-full">
                                        <input type="number" id='quantity' name='quantity' class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-lg rounded-s-gray-100 rounded-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                                            placeholder="in Number" required
                                            onChange={getOrderItemsData}
                                        />
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label for="pincode" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                        Length <span className='text-red-600 font-bold'>*</span>
                                    </label>
                                    <div class="relative w-full">
                                        <input type="number" name='length' class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-lg rounded-s-gray-100 rounded-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                                            placeholder="in cm" required
                                            onChange={getOrderItemsData}
                                        />
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
                                        <input type="number" name='breadth' class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                                            placeholder="in cm" required
                                            onChange={getOrderItemsData}
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
                                        <input type="number" name='height' class="block p-2.5 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
                                            placeholder="in cm" required
                                            onChange={getOrderItemsData}
                                        />
                                        <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white bg-blue-700 rounded-e-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                            cm
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <button type="button" onClick={createNewOrderItem} class="text-white mt-2 bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none">
                                    + Add more item
                                </button>
                                <button onClick={deleteLastOrderItem} type="button" class="focus:outline-none text-white bg-red-700 hover:bg-red-800 ont-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700">
                                    Delete last item
                                </button>
                            </div>

                            <br />

                            {/* Conditional rendering for loading state */}
                            {loadingData ?
                                <button disabled type="button" class="mt-4 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 inline-flex items-center">
                                    <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                                    </svg>
                                    Loading...
                                </button>
                                :
                                <button disabled={loadingData} onClick={getB2BbRates} type="button" class="mt-4 text-white bg-blue-700 hover:bg-blue-700/50 focus:ring-4 focus:ring-[#2557D6]/50 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#2557D6]/50 me-2 mb-2">
                                    <CiCalculator1 size={18} className='mr-2' />
                                    Calculate Price
                                </button>
                            }
                        </div>

                        {/* Display fetched rates in a table */}
                        <div>
                            <div class="relative overflow-x-auto shadow-md sm:rounded-lg">
                                <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                                    <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th scope="col" class="px-6 py-3">
                                                Courier Partner
                                            </th>
                                            <th scope="col" class="px-6 py-3">
                                                Rate
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fetchedRates.length > 0 &&
                                            fetchedRates.map((item) => (
                                                <>

                                                    <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                        <th scope="row" colSpan={2} class="px-6 py-4 font-bold text-lg text-gray-900 whitespace-nowrap dark:text-white">
                                                            {item.courier_name}
                                                        </th>
                                                    </tr>
                                                    <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                        <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                            Base rate
                                                        </th>
                                                        <td class="px-6 py-4">
                                                            {item.baseRate}
                                                        </td>
                                                    </tr>
                                                    <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                        <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                            COD rate
                                                        </th>
                                                        <td class="px-6 py-4">
                                                            {item.codRate}
                                                        </td>
                                                    </tr>
                                                    <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                        <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                            FM Rate
                                                        </th>
                                                        <td class="px-6 py-4">
                                                            {item.fmRate}
                                                        </td>
                                                    </tr>
                                                    <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                        <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                            Fuel Rate
                                                        </th>
                                                        <td class="px-6 py-4">
                                                            {item.fuelRate}
                                                        </td>
                                                    </tr>
                                                    <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                        <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                            Handling rate
                                                        </th>
                                                        <td class="px-6 py-4">
                                                            {item.handlingRate}
                                                        </td>
                                                    </tr>
                                                    <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                        <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                            Insurance rate
                                                        </th>
                                                        <td class="px-6 py-4">
                                                            {item.rovRate}
                                                        </td>
                                                    </tr>
                                                    <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                        <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                            GST (18%)
                                                        </th>
                                                        <td class="px-6 py-4">
                                                            {item.gstRate}
                                                        </td>
                                                    </tr>
                                                    <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                        <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                            <b>Total</b>
                                                        </th>
                                                        <td class="px-6 py-4">
                                                            <b>{item.rate}</b>
                                                        </td>
                                                    </tr>
                                                </>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            }

        </div >
    )
}

export default Ratecalc