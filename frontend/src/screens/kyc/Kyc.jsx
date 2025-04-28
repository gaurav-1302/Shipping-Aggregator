import React, { useState, useEffect } from 'react';
import { auth, db, storage } from '../../firebase.config';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable } from "firebase/storage";
import { FaCheckCircle } from "react-icons/fa";
import { RxCrossCircled } from "react-icons/rx";
import { useNavigate } from 'react-router-dom';
import { useSignOut } from 'react-firebase-hooks/auth';

// Import environment variables
const PINCODE_API_URL = process.env.REACT_APP_PINCODE_API_URL;

const kycImage = require('../../assets/images/kyc.jpg');

function Kyc() {

    // Navigation hook
    const navigate = useNavigate();

    useEffect(() => {
        const user = window.localStorage.getItem('umaxshipuser');
        if (user === null || user === undefined || user === '') {
            navigate('/login/')
        }
    }, [])

    // State to store the user ID
    const [userId, setUserId] = useState('User');

    useEffect(() => {
        // Retrieve user data from local storage and set the user ID
        const currentUser = localStorage.getItem('umaxshipuser');
        const jsonData = JSON.parse(currentUser);
        if (currentUser) {
            setUserId(jsonData.uid);
        }
    }, [userId])

    // State to track if KYC is submitted
    const [kycSubmitted, setKycSubmitted] = useState(false);

    const getKYCInfo = async () => {
        // Fetch KYC details from Firestore
        const docRef = doc(db, "kycdetails", userId); 
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            setKycSubmitted(true);
        } else {
            setKycSubmitted(false);
        }
    }

    useEffect(() => {
        // Fetch KYC info on component mount
        getKYCInfo();
    }, [])


    const [kycData, setKycData] = useState({
        companyName: "",
        companyEmail: "",
        companyPhone: "",
        companyType: "",
        gstNumber: "",
        billingAddress: "",
        pinCode: "",
        cityState: "",
        ownerName: "",
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        accountType: "",
    })

    // Handle changes in form inputs
    const handleChange = (event) => {
        setKycData({
            ...kycData,
            [event.target.name]: event.target.value
        })
    };

    // State for error toast messages
    const [errorToast, setErrorToast] = useState(false);
    const [errorToastMsg, setErrorToastMsg] = useState('');

    // State to track data uploading status
    const [uploadingData, setUploadingData] = useState(false);

    const submitKYCData = async () => {
        // Prevent resubmission if already submitted
        if (kycSubmitted) {
            return;
        }
        setUploadingData(true); // Set uploading state to true
        uploadFiles()
    }

    async function uploadFiles() {

        if (kycData.companyName === ""
            || kycData.companyEmail === ""
            || kycData.companyPhone === ""
            || kycData.companyType === ""
            || kycData.billingAddress === ""
            || kycData.pinCode === ""
            || kycData.cityState === ""
        ) {
            const errorMessage = "All * marked fileds are required.";
            // Set error message and show error toast
            setErrorToastMsg(errorMessage);
            setErrorToast(true);
            setUploadingData(false);
            return;
        }

        const fileInputs = document.querySelectorAll('input[type="file"]');
        // Array to store upload promises
        const uploadPromises = [];
        const fileData = [];

        for (const fileInput of fileInputs) {
            const file = fileInput.files[0];

            if (!file) {
                // Skip if file is not selected for cheque
                if (fileInput.id == 'cheque') {
                    continue;
                } else {
                    alert(`All input fields are required: ${fileInput.id}`);
                    setUploadingData(false);
                    return;
                }
            }

            const originalFilename = file.name;
            // Extract file extension
            const regex = new RegExp('[^.]+$');
            const extension = originalFilename.match(regex);

            // Construct the new filename using the input field name and extension
            const newFilename = `${fileInput.id}.${extension}`;

            // Set uploading state to true
            setUploadingData(true);
            const storageRef = ref(storage, `kycdocs/${userId}/${newFilename}`);

            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadPromises.push(uploadTask.on('state_changed',
                (snapshot) => {
                    // Observe state change events (progress)
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                },
                (error) => {
                    // Handle file upload errors and log them
                    console.error('Upload Error:', error);
                },
                async () => { // Handle successful upload

                }
            ));
        }

        // Wait for all uploads to finish (optional, adjust based on your logic)
        await Promise.all(uploadPromises);
        storeFileURLInFirestore();
    }

    async function storeFileURLInFirestore() {
        setUploadingData(true); // Set uploading state to true
        try {
            // Store KYC data in Firestore
            const docRef = doc(db, "kycdetails", userId);
            await setDoc(docRef, { ...kycData, timestamp: serverTimestamp() });
            setUploadingData(false); // Set uploading state to false
            // Fetch KYC info after successful submission
            getKYCInfo();
        } catch (error) {
            // Handle errors and log them
            console.error('Error storing file URL in Firestore:', error);
            setUploadingData(false);
            getKYCInfo();
        }
    }

    const [pincodeValid, setPincodeValid] = useState(null);

    // Validate pincode using an external API
    const validatePincode = async (value) => {
        // Check if pincode length is valid
        if (kycData.pinCode.length !== 6) {
            setPincodeValid(false);
            return;
        }

        try { // Fetch pincode data from the API
            const response = await fetch(`https://api.postalpincode.in/pincode/${value}`);
            const data = await response.json();

            var district = data[0].PostOffice[0].District
            var state = data[0].PostOffice[0].State

            const cityState = district + ', ' + state;

            // Check if API request was successful
            if (data[0].Status === 'Success') {
                setPincodeValid(true);
                setKycData({ ...kycData, cityState })
            } else {
                setPincodeValid(false);
            }
        } catch (error) { // Handle errors and log them
            console.error('Error fetching pincode data:', error);
            setPincodeValid(false); // Set to invalid on network/API errors
        }
    };
    // Sign out hook
    const [signOut, loading, error] = useSignOut(auth);

    return (
        <div>
            {
                errorToast &&
                <div id="toast-warning" class="flex items-center w-full max-w-xs p-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-gray-800" role="alert">
                    <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-orange-500 bg-orange-100 rounded-lg dark:bg-orange-700 dark:text-orange-200"> 
                        <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM10 15a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm1-4a1 1 0 0 1-2 0V6a1 1 0 0 1 2 0v5Z" />
                        </svg>
                        <span class="sr-only">Warning icon</span>
                    </div>
                    <div class="ms-3 text-sm font-normal">{errorToastMsg}</div>
                    <button onClick={() => setErrorToast(false)} type="button" class="ms-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700" data-dismiss-target="#toast-warning" aria-label="Close"> 
                        <span class="sr-only">Close</span>
                        <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                        </svg>
                    </button>
                </div>
            }

            {
                kycSubmitted &&
                <div class="flex bg-gray-700/50 overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
                    <div class="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"> 
                        <a href="#">
                            <img class="p-8 rounded-t-lg" src={kycImage} alt="product image" />
                        </a>
                        <div class="px-5 pb-5">
                            <a href="#">
                                <h5 class="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">Your KYC application is under review.</h5>
                            </a> 

                            <div class="flex items-center justify-center mt-2">
                                <a href="/" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                    Go to Dashboard
                                </a>
                            </div>

                        </div>
                    </div>
                </div>
            }

            <section class="bg-white dark:bg-gray-900">
                <div class="max-w-2xl px-4 py-8 mx-auto lg:py-16"> 
                    <h2 class="mb-4 text-4xl tracking-tight font-extrabold text-center text-gray-900 dark:text-white">KYC Form</h2>

                    <p class="mb-8 lg:mb-8 font-light text-center text-gray-500 dark:text-gray-400 sm:text-xl">
                        Complete your Business KYC details to get started with Umaxship.
                    </p>

                    <h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Business Details</h2> 

                    <div class="grid gap-4 mb-4 sm:grid-cols-2 sm:gap-6 sm:mb-5">
                        <div class="sm:col-span-2">
                            <label for="name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Business Name *</label>
                            <input type="text" name="companyName" id="companyName" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                                value={kycData.companyName} autoComplete="none" placeholder="Atirun Techs Pvt. Ltd." required="" onChange={handleChange} />
                        </div>
                        <div class="w-full">
                            <label for="brand" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Business Email Id *</label>
                            <input type="email" name="companyEmail" id="companyEmail" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                                value={kycData.companyEmail} autoComplete="none" placeholder="info@atirun.com" required="" onChange={handleChange} />
                        </div>
                        <div class="w-full">
                            <label for="price" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Business Contact No *</label>
                            <input type="number" name="companyPhone" id="companyPhone" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                                value={kycData.companyPhone} autoComplete="none" placeholder="8755356404" required="" onChange={handleChange} />
                        </div>
                        <div>
                            <label for="category" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Business Type *</label>
                            <select value={kycData.companyType} onChange={handleChange} id="companyType" name="companyType" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"> 
                                <option value="">Select Business Type</option>
                                <option value="Private Limited Company">Private Limited Company</option>
                                <option value="One Person Company">One Person Company</option>
                                <option value="Public Limited Company">Public Limited Company</option>
                                <option value="NGO">NGO</option>
                                <option value="Unlisted Company">Unlisted Company</option>
                            </select>
                        </div>
                        <div>
                            <label for="item-weight" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">GST Number</label>
                            <input type="number" name="gstNumber" id="gstNumber" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                                value={kycData.gstNumber} autoComplete="none" placeholder="1234567890" required="" onChange={handleChange} />
                        </div>
                        <div class="sm:col-span-2">
                            <label for="name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Billing Address *</label>
                            <input type="text" name="billingAddress" id="billingAddress" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                                value={kycData.billingAddress} autoComplete="none" placeholder="123 - A Street, New Delhi" required="" onChange={handleChange} />
                        </div>
                        <div class="w-full">
                            <label for="brand" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Pin Code *</label>
                            <div class="relative w-full">
                                <input type="number" name="pinCode" id="pinCode" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                                    value={kycData.pinCode} autoComplete="none" placeholder="123456" required="" onChange={handleChange} onBlur={() => validatePincode(kycData.pinCode)} /> 
                                {
                                    pincodeValid === true ?
                                        <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white rounded-e-lg border">
                                            <FaCheckCircle color='green' />
                                        </button>
                                        : pincodeValid === false ?
                                            <button disabled class="absolute top-0 end-0 p-2.5 h-full text-sm font-medium text-white rounded-e-lg border">
                                                <RxCrossCircled color='red' />
                                            </button>
                                            :
                                            <></>
                                }
                            </div>

                        </div>
                        <div class="w-full">
                            <label for="price" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">City & State *</label>
                            <input type="text" name="cityState" id="cityState" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                                value={kycData.cityState} placeholder="New Delhi" required="" disabled onChange={handleChange} />
                        </div> 
                        <div class="sm:col-span-2">
                            <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white" for="file_input">Identification Proof (Business) *</label>
                            <input class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                                aria-describedby="file_input_help" id="idProof" type="file" accept=".pdf" />
                            <p class="mt-1 text-sm text-gray-500 dark:text-gray-300" id="file_input_help">Incorporation Certificate/PAN Card</p>
                        </div>
                        <div className='w-full'>
                            <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white" for="file_input">Address Proof</label>
                            <input class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                                aria-describedby="file_input_help" id="addressProofFront" type="file" accept='image/.jpg,.jpeg,.png' />
                            <p class="mt-1 text-sm text-gray-500 dark:text-gray-300" id="file_input_help">Aadhar Card front</p>
                        </div>
                        <div className='w-full'>
                            <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white" for="file_input">*</label>
                            <input class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                                aria-describedby="file_input_help" id="addressProofBack" type="file" accept='image/.jpg,.jpeg,.png' />
                            <p class="mt-1 text-sm text-gray-500 dark:text-gray-300" id="file_input_help">Aadhar Card back</p>
                        </div>
                    </div>

                    <h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Bank Details</h2> 

                    <div class="grid gap-4 mb-4 sm:grid-cols-2 sm:gap-6 sm:mb-5">

                        <div class="w-full">
                            <label for="brand" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Account Holder Name</label>
                            <input type="text" name="ownerName" id="ownerName" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                                value={kycData.ownerName} autoComplete="none" placeholder="Atirun Techs Pvt. Ltd." required="" onChange={handleChange} />
                        </div>

                        <div class="w-full">
                            <label for="price" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Bank Name</label>
                            <input type="text" name="bankName" id="bankName" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                                value={kycData.bankName} autoComplete="none" placeholder="Kotak Mahindra Bank" required="" onChange={handleChange} />
                        </div>

                        <div class="w-full">
                            <label for="brand" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Account Number</label>
                            <input type="number" name="accountNumber" id="accountNumber" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                                value={kycData.accountNumber} autoComplete="none" placeholder="1234567890" required="" onChange={handleChange} />
                        </div>

                        <div class="w-full">
                            <label for="price" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">IFSC Code</label>
                            <input type="text" name="ifscCode" id="ifscCode" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                                value={kycData.ifscCode} autoComplete="none" placeholder="KKBK0007450" required="" onChange={handleChange} />
                        </div>

                        <div>
                            <label for="category" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Account Type</label>
                            <select value={kycData.accountType} onChange={handleChange} id="accountType" name="accountType" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"> 
                                <option value="">Select account type</option>
                                <option value="Current">Current</option>
                                <option value="Saving">Saving</option>
                            </select>
                        </div>

                        <div class="sm:col-span-2">
                            <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white" for="file_input">Canceled Cheque</label>
                            <input class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                                aria-describedby="file_input_help" id="cheque" type="file" accept='image/.jpg,.jpeg,.png' />
                        </div>
                    </div>

                    {
                        uploadingData ? // Show loading button while uploading
                            <button disabled type="button" class="w-full mt-5 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 inline-flex items-center">
                                <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                                </svg>
                                Uploading Data...
                            </button>
                            : // Show submit button when not uploading
                            <button onClick={() => submitKYCData()} type="button" class="w-full mt-5 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                Submit KYC details
                                <svg class="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9" />
                                </svg>
                            </button> 
                    }

                    <button onClick={async () => {
                        const success = await signOut();
                        if (success) {
                            localStorage.removeItem('umaxshipuser');
                            sessionStorage.removeItem('Auth Token');
                            alert('You are logged out');
                            navigate('/login/');
                        }
                    }}
                        type="button" class="mt-10 text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700">Logout</button>

                </div> 
            </section>
        </div>
    )
}

export default Kyc