import React, { useState, useEffect } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import { RxCrossCircled } from 'react-icons/rx';
import { auth, db } from '../../firebase.config'; // Importing Firebase authentication and database
import { addDoc, collection } from 'firebase/firestore';

// Environment variables for API keys and credentials
const POSTAL_PINCODE_API_URL = process.env.REACT_APP_POSTAL_PINCODE_API_URL || 'https://api.postalpincode.in/pincode/';

/**
 * Addwarehouse Component
 * This component allows users to add a new warehouse to the system.
 * It includes form validation and integration with the postal pincode API.
 */
function Addwarehouse() {
    // State variables for form inputs
    const [pinCode, setPinCode] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [county, setCounty] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState(''); // State for email input
    const [locationName, setLocationName] = useState(''); // State for location name (auto-generated)
    const [addressLine1, setAddressLine1] = useState('');
    const [addressLine2, setAddressLine2] = useState('');
    const [pinCodeValid, setPinCodeValid] = useState(null); // State for pincode validation status

    /**
     * validatePincode function
     * Validates the entered pincode using an external API.
     * Updates the city, state, and county based on the API response.
     */
    const validatePincode = async () => {
        // Check if the pincode length is not 6, set invalid and return early
        if (pinCode.length !== 6) {
            setPinCodeValid(false);
            return;
        }

        try {
            // Fetch pincode data from the external API
            const response = await fetch(`${POSTAL_PINCODE_API_URL}${pinCode}`);
            // Parse the JSON response
            const data = await response.json();

            // Check if the API request was successful
            if (data[0].Status === 'Success') {
                // Set pincode as valid
                setPinCodeValid(true);
                // Update city, state, and county based on the API response
                setCity(data[0].PostOffice[0].Division)
                setState(data[0].PostOffice[0].State)
                setCounty(data[0].PostOffice[0].Country)
            } else {
                // Set pincode as invalid if the API request failed
                setPinCodeValid(false);
            }
        } catch (error) {
            // Log the error and set pincode as invalid on network/API errors
            console.error('Error fetching pincode data:', error);
            setPinCodeValid(false); // Set to invalid on network/API errors
        }
    };

    /**
     * useEffect hook to generate a unique location name on component mount.
     * The location name is generated using a timestamp and prefixed with 'wr_'.
     * This ensures that each warehouse has a unique identifier.
     *
     * This runs once when the component mounts.
     */
    useEffect(() => {
        const timestamp = 'wr_' + Date.now().toString();
        setLocationName(timestamp);
        console.log(timestamp);
    }, [])

    const [savingDetails, setSavingDetails] = useState(false);
    const [errorToast, setErrorToast] = useState(false); // State for error toast visibility
    const [successToast, setSuccessToast] = useState(false); // State for success toast visibility
    const [toastMessage, setToastMessage] = useState(''); // State for toast message content

    /**
     * useEffect hook to automatically hide the success and error toasts after a certain duration.
     * This ensures that the toasts are not displayed indefinitely.
     *
     * This runs whenever the successToast or errorToast state changes.
     */
    useEffect(() => {
        setTimeout(() => {
            setSuccessToast(false);
            setErrorToast(false);
        }, 10000);
    }, [successToast, errorToast])
    /**
     * validAddressLine function
     * Validates if the address line includes a house number, flat number, or road number.
     *
     * @param {string} address - The address line to validate.
     * @returns {boolean} - True if the address line is valid, false otherwise.
     */
    function validAddressLine(address) {
        // Regular expression patterns to check for house number, flat number, or road number
        const numberPatterns = [/House\.? [0-9]+[A-Z]?/, /Flat [0-9]+[A-Z]?/, /Road\.? [0-9]+[A-Z]?/,];
        
        // Iterate through each pattern and check if it matches the address
        for (const pattern of numberPatterns) {
            if (pattern.test(address)) {
                return true;
            }
        }
        return false;
    }

    /**
     * saveWarehouse function
     * Saves the warehouse details to the Firestore database.
     * Performs form validation before saving.
     */
    const saveWarehouse = async () => {
        // Check if any required field is empty
        if (pinCode == '' || city == '' || state == '' || county == '' || name == '' || email == '' || phone == '' || addressLine1 == '') {
            const errorMessage = `All the fields are required. Please fill all the fields`;
            setToastMessage(errorMessage);
            setErrorToast(true);
            return;
        }
        // Check if address line 1 is valid
        if (!validAddressLine) {
            setToastMessage('Address line 1 must include House no, Flat no, or Road no.');
            setErrorToast(true);
            return;
        }
        // Try to save the warehouse details to the database
        try {
            setSavingDetails(true);
            const warehouseRef = collection(db, "warehouses"); // Reference to the collection
            // Add document with generated ID
            const docRef = await addDoc(warehouseRef, {
                pickup_location: locationName,
                name: name,
                email: email,
                phone: Number(phone),
                address: addressLine1,
                address_2: addressLine2,
                city: city,
                state: state,
                country: county,
                pin_code: Number(pinCode),
                user_id: auth.currentUser.uid,
            });
            // Set success toast and message
            setSavingDetails(false);
            setToastMessage('Warehouse addedd successfully !')
            setSuccessToast(true);
        } catch (error) {
            // Set error toast and message
            setSavingDetails(false);
            setToastMessage('Error adding warehouse !');
            setErrorToast(true);
        }
    }

    return (
        <div className="bg-white p-5 rounded-lg mt-3 dark:bg-gray-800 border border-black">

            {successToast &&
                <div style={{ zIndex: 999 }} className='fixed right-10 top-10'>
                    <div id="toast-success" class="flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-gray-700" role="alert">
                        <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-green-500 bg-green-100 rounded-lg dark:bg-green-800 dark:text-green-200">
                            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z" />
                            </svg>
                            <span class="sr-only">Check icon</span>
                        </div>
                        <div class="ms-3 text-sm text-black font-normal">{toastMessage}</div>
                        <button onClick={() => setSuccessToast(false)} type="button" class="ms-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700" data-dismiss-target="#toast-success" aria-label="Close">
                            <span class="sr-only">Close</span>
                            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                            </svg>
                        </button>
                    </div>
                </div>

            }

            {errorToast &&
                <div style={{ zIndex: 999 }} className='fixed right-10 top-10'>
                    <div id="toast-danger" class="flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-gray-800" role="alert">
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

            <p className='mt-4 text-xl font-bold dark:text-white'>Warehouse Details</p>

            <div className='mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 mt-5'>
                <div class="mb-4">
                    <label for="name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Full Name <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="text" id="name"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="" value={name} onChange={e => setName(e.target.value)} autoComplete="none" required />
                </div>
                <div class="mb-4">
                    <label for="phone" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Phone Number <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="number" id="phone"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
                        maxLength={10}
                        autoComplete="none"
                        value={phone} onChange={e => setPhone(e.target.value)}
                        required />
                </div>
                <div class="mb-4">
                    <label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Email <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="email" id="email"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="" value={email} onChange={e => setEmail(e.target.value)} autoComplete="none" required />
                </div>
                <div class="mb-4">
                    <label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Address line 1 <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="text" id="email"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} autoComplete="none" required />
                </div>
                <div class="mb-4">
                    <label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Address line 2
                    </label>
                    <input type="text" id="email"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} autoComplete="none" required />
                </div>
                <div class="mb-4">
                    <label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Pincode <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <div class="relative w-full">
                        <input type="number"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            value={pinCode}
                            maxLength={6}
                            onChange={e => setPinCode(e.target.value)}
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
                <div class="mb-4">
                    <label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        City <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="text" id="email"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="" value={city} required readOnly />
                </div>
                <div class="mb-4">
                    <label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        State <span className='text-red-600 font-bold'>*</span>
                    </label>
                    <input type="text" id="email"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="" value={state} required readOnly />
                </div>
            </div>

            <div className="flex items-center mb-5 mt-2 w-full mt-10">
                <button type="button" class="text-red-700 hover:text-white border border-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:hover:bg-red-600 dark:focus:ring-red-900">
                    Cancel
                </button>
                {
                    savingDetails ?
                        <button disabled type="button" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 inline-flex items-center">
                            <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                            </svg>
                            Creating Warehouse...
                        </button>
                        :
                        <button onClick={() => saveWarehouse()} type="button" class="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800">
                            Add Warehouse
                        </button>
                }
            </div>

        </div>
    )
}

export default Addwarehouse