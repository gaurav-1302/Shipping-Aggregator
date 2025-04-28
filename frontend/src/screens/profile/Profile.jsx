import React, { useEffect, useState } from 'react';
import Navbar from '../../common/Navbar';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase.config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FaCheckCircle } from "react-icons/fa";
import { RxCrossCircled } from "react-icons/rx";
import { FaEdit } from "react-icons/fa";

// Accessing environment variables
const PINCODE_API_URL = process.env.REACT_APP_PINCODE_API_URL;

function Profile() {
    // State variables for user information
    const [userId, setUserId] = useState('');
    const [displayName, setDisplayName] = useState('');

    // State variable for loading state
    const [loading, setLoading] = useState(true);

    // State variable for user data
    const [userData, setUserData] = useState({});

    // State variable for KYC data
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
    });

    // Fetch user data from local storage on component mount
    useEffect(() => {
        const currentUser = localStorage.getItem('umaxshipuser');
        if (currentUser) {
            try {
                const jsonData = JSON.parse(currentUser);
                setUserId(jsonData.uid);
                setDisplayName(jsonData.displayName);
            } catch (error) {
                console.error("Error parsing user data:", error);
            }
        }
    }, []);

    const navigate = useNavigate();

    useEffect(() => {
        const user = window.localStorage.getItem('umaxshipuser');
        if (user === null || user === undefined || user === '') {
            navigate('/login/')
        }
    }, [navigate]);

    // Fetch user data from Firestore on component mount
    useEffect(() => {
        if (userId === '') { return }
        const fetchUserDataFromFirestore = async () => {
            const docRef = doc(db, "kycdetails", userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setUserData(docSnap.data());
                setLoading(false);
            } else {
                console.log("No such document!");
                setLoading(false);
            }
        }

        fetchUserDataFromFirestore();
    }, [userId])

    // State variable for pincode validation
    const [pincodeValid, setPincodeValid] = useState(null);

    // State variable for showing edit form
    const [showEdit, setShowEdit] = useState(false);
    const [uploadingData, setUploadingData] = useState(false);

    const handleChange = (event) => {
        setKycData({
            ...kycData,
            [event.target.name]: event.target.value
        })
    };
    
    // Validate pincode using external API
    const validatePincode = async (value) => {
        if (kycData.pinCode.length !== 6) {
            setPincodeValid(false);
            return;
        }

        try {
            const response = await fetch(`${PINCODE_API_URL}${value}`);
            const data = await response.json();

            var district = data[0].PostOffice[0].District
            var state = data[0].PostOffice[0].State

            const cityState = district + ', ' + state;

            if (data[0].Status === 'Success') {
                setPincodeValid(true);
                setKycData({ ...kycData, cityState })
            } else {
                setPincodeValid(false);
            }
        } catch (error) {
            console.error('Error fetching pincode data:', error);
            setPincodeValid(false); // Set to invalid on network/API errors
        }
    };

    // Submit KYC data to Firestore
    const submitKYCData = async () => {
        setUploadingData(true);
        const docRef = doc(db, "kycdetails", userId);
        await setDoc(docRef, { ...kycData, timestamp: serverTimestamp() });
        setUploadingData(false);
        setShowEdit(false);
        window.location.reload();
    }

    return (
        <div>
            <Navbar />

            {
                loading ? // Show loading indicator while fetching data
                    <div class="flex items-center justify-center bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 mt-10 p-4">
                        <div class="flex items-center justify-center w-56 h-56  bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                            <div class="px-3 py-1 text-xs font-medium leading-none text-center text-blue-800 bg-blue-200 rounded-full animate-pulse dark:bg-blue-900 dark:text-blue-200">loading...</div>
                        </div>
                    </div>
                    :
                    <>
                        <div class="bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 mt-10 p-4"> {/* Display user data */}
                            <h5 class="mb-3 text-2xl font-bold tracking-tight text-black-900 dark:text-white">General Information
                            </h5>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <h3 class="text-base font-semibold text-gray-900 dark:text-white">Name</h3>
                                    <a href="#" class="mt-4 text-blue-700 hover:underline dark:text-blue-500">{displayName}</a>
                                </div>
                                <div>
                                    <h3 class="text-base  font-semibold text-gray-900 dark:text-white">Company Name</h3>
                                    <a href="#" class="mt-4 text-blue-700 hover:underline dark:text-blue-500">{userData.companyName}</a>
                                </div>
                                <div>
                                    <h3 class="text-base  font-semibold text-gray-900 dark:text-white">Email Id</h3>
                                    <a href="#" class="mt-4 text-blue-700 hover:underline dark:text-blue-500">{userData.companyEmail}</a>
                                </div>
                                <div>
                                    <h3 class="text-base  font-semibold text-gray-900 dark:text-white">Phone Number</h3>
                                    <a href="#" class="mt-4 text-blue-700 hover:underline dark:text-blue-500">
                                        {userData.companyPhone}
                                    </a>
                                </div>
                                <div>
                                    <h3 class="text-base font-semibold text-gray-900 dark:text-white">Company Type</h3>
                                    <a href="#" class="mt-4 text-blue-700 hover:underline dark:text-blue-500">{userData.companyType}</a>
                                </div>
                                <div>
                                    <h3 class="text-base font-semibold text-gray-900 dark:text-white">Billing Address</h3>
                                    <a href="#" class="mt-4 text-blue-700 hover:underline dark:text-blue-500">
                                        {userData.billingAddress}
                                        <br />
                                        {userData.cityState} {' '}
                                        {userData.pinCode}
                                    </a>
                                </div>
                                <div>
                                    <h3 class="text-base font-semibold text-gray-900 dark:text-white">GST Number</h3>
                                    <a href="#" class="mt-4 text-blue-700 hover:underline dark:text-blue-500">{userData.gstNumber}</a>
                                </div>

                            </div>
                        </div>

                        <div class="bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 mt-5 p-4"> {/* Display bank details */}
                            <h5 class="mb-3 text-2xl font-bold tracking-tight text-black-900 dark:text-white">Bank Details</h5>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <h3 class="text-base font-semibold text-gray-900 dark:text-white">Account Holder Name</h3>
                                    <p class="text-base text-gray-500 dark:text-gray-400">{userData.ownerName}</p>
                                </div>
                                <div>
                                    <h3 class="text-base font-semibold text-gray-900 dark:text-white">Bank Name</h3>
                                    <p class="ext-base text-gray-500 dark:text-gray-400">{userData.bankName}</p>
                                </div>
                                <div>
                                    <h3 class="text-base font-semibold text-gray-900 dark:text-white">Account Type</h3>
                                    <p class="ext-base text-gray-500 dark:text-gray-400">{userData.accountType}</p>
                                </div>
                                <div>
                                    <h3 class="text-base font-semibold text-gray-900 dark:text-white">Account Number</h3>
                                    <p class="ext-base text-gray-500 dark:text-gray-400">{userData.accountNumber}</p>
                                </div>
                                <div>
                                    <h3 class="text-base font-semibold text-gray-900 dark:text-white">IFSC Code</h3>
                                    <p class="ext-base text-gray-500 dark:text-gray-400">{userData.ifscCode}</p>
                                </div>
                            </div>
                        </div>

                        <button onClick={() => setShowEdit(!showEdit)} type="button" class="mt-5 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 self-center"> {/* Button to toggle edit form */}
                            <FaEdit className='mr-2' />
                            Edit Information
                        </button>

                    </>
            }

            {/* Edit form */}
                showEdit &&
                <section class="flex bg-white dark:bg-gray-900 rounded-lg" style={{ position: 'absolute', zIndex: 999, top: 50, width: '60%', alignSelf: 'center' }}>
                    <div class="max-w-2xl px-4 py-8 mx-auto lg:py-16">
                        <h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Business Details</h2>
                        <div class="grid gap-4 mb-4 sm:grid-cols-3 sm:gap-6 sm:mb-5" >
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
                                    value={kycData.companyPhone} autoComplete="none" placeholder="8755356401" required="" onChange={handleChange} />
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
                        </div>
                        <h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Bank Details</h2>
                        <div class="grid gap-4 mb-4 sm:grid-cols-3 sm:gap-6 sm:mb-5">
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
                        </div>

                        {
                            uploadingData ? // Show loading indicator while uploading data
                                <button disabled type="button" class="w-full mt-5 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 inline-flex items-center">
                                    <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                                    </svg>
                                    Uploading Data...
                                </button>
                                :
                                <button onClick={() => submitKYCData()} type="button" class="w-full mt-5 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                    Submit KYC details
                                    <svg class="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9" />
                                    </svg>
                                </button>
                        }

                        <button onClick={() => setShowEdit(!showEdit)} // Button to close edit form
                            type="button" class="mt-10 text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700">
                            Close
                        </button>
                    </div>
                </section>
        </div >
    )
}

export default Profile