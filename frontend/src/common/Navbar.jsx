import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { FaRupeeSign } from "react-icons/fa";
import { TbRecharging } from "react-icons/tb"; // Import for the recharge icon
import { MdOutlinePriceChange } from "react-icons/md";
import { auth, db } from '../firebase.config';
import { doc, getDoc } from "firebase/firestore";
import { analytics } from '../firebase.config';
import { logEvent } from 'firebase/analytics';
import {
    Avatar,
    Typography,
    List,
    ListItem,
    ListItemPrefix,
} from "@material-tailwind/react";


/**
 * Navbar component for the Umaxship application.
 * Handles user authentication, wallet balance, tracking, and recharge functionality.
 */
function Navbar() {

    const navigate = useNavigate();

    // Check if the user is logged in on component mount
    useEffect(() => {
        const user = window.localStorage.getItem('umaxshipuser');
        if (user === null || user === undefined || user === '') {
            navigate('/login/')
        }
    }, [])


    // State variables for user data, wallet balance, manager details, etc.

    const [username, setUsername] = useState('User');
    const [userId, setUserId] = useState('');
    const [userPhone, setUserPhone] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [walletBalance, setWalletBalance] = useState(0)
    const [manager, setManager] = useState(null);
    const [showManager, setShowManager] = useState(false); // State to track loading

    /**
     * Fetches the account manager details for the current user from Firestore.
     * Updates the `manager` state with the fetched data.
     */
    const fetchManagerDetails = async () => {
        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setManager({
                    name: userData.account_manager_name,
                    email: userData.account_manager,
                    phone: userData.account_manager_phone_no,
                });
            }
        } catch (error) {
            console.error('Error fetching manager details:', error);
        } finally { // Removed empty finally block

        }
    };

    // Fetch manager details when the component mounts or when the authentication state changes.
    useEffect(() => {
        fetchManagerDetails();
    }, [auth]);

    /**
     * Handles the display of the account manager details.
     * Toggles the `showManager` state and fetches manager details if not already fetched.
     */
    const handleManager = async () => {
        setShowManager(!showManager);
        // Fetch manager details again when the manager section is opened to ensure data is up to date.
        // This is important if manager details are updated in the database.
        await fetchManagerDetails();
    }

    // Fetch user details from local storage when the component mounts or when the authentication state changes.

    useEffect(() => {
        const currentUser = localStorage.getItem('umaxshipuser');
        const jsonData = JSON.parse(currentUser);
        if (jsonData) {
            setUsername(jsonData.displayName);
            setUserId(jsonData.uid);
            setUserEmail(jsonData.email);
        }
    }, [auth])

    /**
     * Fetches the wallet balance for the current user from Firestore.
     * Updates the `walletBalance` state with the fetched data.
     */
    const getWalletBalance = async () => {
        const docRef = doc(db, "wallets", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const fixedAmount = data.balance.toFixed(2)
            setWalletBalance(fixedAmount);
        }
    }

    // Fetch KYC information and wallet balance for the current user.
    /**
     * Fetches KYC information and wallet balance for the current user.
     * This effect runs whenever the `userId` changes.
     */
    useEffect(() => {
        if (userId === '') {
            return;
        }

        const getKYCInfo = async () => {
            const docRef = doc(db, "kycdetails", userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const docData = docSnap.data();
                setUserPhone(docData.companyPhone);
            }
        }

        getKYCInfo();
        getWalletBalance();
    }, [userId])


    // State variables for tracking functionality
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingData, setLoadingData] = useState(false);
    const [trackingData, setTrackingData] = useState([])
    const [dataExist, setDataExist] = useState(false)
    const [showModal, setShowModal] = useState(false);

    /**
     * Fetches tracking information for a given AWB (Air Waybill) number.
     * Updates the `trackingData`, `dataExist`, and `showModal` states based on the response.
     */
    const fetchTracking = async () => {
        if (searchQuery.length < 5) {
            return;
        }
        console.log(searchQuery);
        try {
            setLoadingData(true);
            const response = await fetch('https://gettrackingdelhivery-vjij5onvgq-uc.a.run.app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    waybill: searchQuery
                })
            });
            const responseJson = await response.json();
            console.log(responseJson);
            console.log(responseJson.current_status)
            setTrackingData(responseJson)
            setDataExist(true)
            setShowModal(true)
            setLoadingData(false);
        } catch (error) {
            setLoadingData(false);
            setDataExist(false)
            setShowModal(true)
            console.error('Error sending data for labels:', error);
        }
    }

    // State variables for recharge functionality
    const [rechargeModal, setRechargeModal] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState();
    const [loading, setLoading] = useState(false);

    // State variable for order ID

    const [order_id, setOrder_id] = useState('');
    /**
     * Generates a unique order ID based on the current timestamp and a random string.
     * Updates the `order_id` state with the generated ID.
     */
    const generateOrderId = () => {
        const timestamp = Date.now().toString() + Math.random().toString(36).substring(2, 7);
        setOrder_id(timestamp);
    }

    /**
     * Generates a new order ID when the component mounts.
     * This ensures that a new order ID is generated for each recharge attempt.
     */
    useEffect(() => {
        generateOrderId();
    }, []);

    // Get session ID for payment using Razorpay
    const getSessionId = async () => {
        if (rechargeAmount < 500) {
            // setLoading(false);
            // return;
        }
        try {
            const url = "https://generaterazorpayorderid-vjij5onvgq-uc.a.run.app"
            const jsonData = {
                order_amount: rechargeAmount * 100,
                order_id: order_id,
                customer_id: userId,
                customer_name: username,
                customer_email: userEmail,
                customer_phone: userPhone
            }
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json' // Set content type to JSON
                },
                body: JSON.stringify(jsonData) // Convert JSON data to a string and set it as the request body
            };

            fetch(url, options)
                .then(response => {
                    return response.json();
                })
                .then(data => {
                    handlePayment({ session_id: data.id, amount: data.amount });
                    setLoading(false)
                    setRechargeModal(false)
                })
                .catch(error => {
                    console.error('Fetch error:', error);
                    setLoading(false)
                    setRechargeModal(false)
                });
        } catch (error) {
            console.error(error);
            setLoading(false)
            setRechargeModal(false)
        }
    }

    // Handle payment using Razorpay
    /**
     * Handles the payment process using Razorpay.
     * Opens the Razorpay checkout modal and handles the payment response.
     * @param {object} param0 - An object containing the session ID and amount.
     */
    const handlePayment = ({ session_id, amount }) => {
        var options = {
            "key": "rzp_live_U8h5IWCvvxEAbH",
            "amount": amount,
            "currency": "INR",
            "description": "Umaxship Wallet Recharge",
            "order_id": session_id,
            "prefill":
            {
                "name": username,
                "email": userEmail,
                "contact": userPhone,
            },
            config: {
                display: {
                    blocks: {
                        utib: {
                            instruments: [
                                {
                                    method: 'upi'
                                },
                                {
                                    method: 'card'
                                },
                                {
                                    method: 'wallet'
                                },
                                {
                                    method: 'netbanking'
                                }
                            ]
                        }
                    },
                    sequence: ["block.utib", "block.other"],
                    preferences: {
                        show_default_blocks: true // Should Checkout show its default blocks?
                    }
                }
            },
            "handler": function (response) {
                fetch("https://validaterazorpaypayment-vjij5onvgq-uc.a.run.app", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        payment_id: response.razorpay_payment_id,
                        order_id: response.razorpay_order_id,
                        signature: response.razorpay_signature,
                        userId: userId,
                    }),
                })
                    .then(backendResponse => backendResponse.json())
                    .then(backendData => {
                        if (backendData.success) {
                            console.log('Payment validated successfully!');
                            logEvent(analytics,
                                'purchase', {
                                userId: userId,
                                amount: rechargeAmount,
                            });
                        } else {
                            console.error('Payment validation failed:', backendData.error);
                        }
                    })
                    .catch(error => {
                        console.error('Error validating payment on backend:', error);
                    });
            },
            "modal": {
                "ondismiss": function () {
                    console.log("Checkout form closed by the user");
                }
            }
        };
        var rzp1 = new window.Razorpay(options);
        console.log(options);
        rzp1.open();
    }

    // Create payment link and initiate payment process
    /**
     * Initiates the payment link creation process.
     * Sets the loading state to true and calls `getSessionId` to start the payment flow.
     */
    const createPaymentLink = async () => {
        setLoading(true);
        getSessionId();
    }


    // JSX for the Navbar component
    return (
        <div style={window.innerWidth > 1400 ? { marginTop: - 35 } : { marginTop: -10 }}>
            <nav class="bg-[#003B49] border-gray-200 p-2 rounded-lg grid sm:grid-cols-1 md:grid-cols-2 mx-auto">
                <div class="max-w-md flex-end w-full">
                    <label for="default-search" class="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                            <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                            </svg>
                        </div>
                        <input
                            onChange={e => setSearchQuery(e.target.value)}
                            type="search" id="default-search" class="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-[#07847F] focus:border-[#07847F]"
                            placeholder="Track order with AWB ID" required />
                        <button onClick={() => fetchTracking()} class="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Search</button>
                    </div>
                </div>
                <div className='flex'>
                    <a href='/pricing' type="button" class="text-white bg-[#FF9119] hover:bg-[#FF9119]/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:hover:bg-[#FF9119]/80 dark:focus:ring-[#FF9119]/40 me-2 mb-2">
                        <MdOutlinePriceChange size={24} className='mr-1' />
                        View Plans
                    </a>
                    <button onClick={() => setRechargeModal(true)} class="text-white bg-[#050708] hover:bg-[#050708]/80  font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:hover:bg-[#050708]/40 dark:focus:ring-gray-600 me-2 mb-2">
                        <TbRecharging size={20} className='mr-1' />
                        Recharge
                    </button>
                    <button onClick={() => getWalletBalance()} type="button" class="text-gray-900 bg-[#F7BE38] hover:bg-[#F7BE38]/90 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#F7BE38]/50 me-2 mb-2">
                        <FaRupeeSign size={18} className='mr-1' />
                        {walletBalance}
                    </button>
                    <a href='/profile' class="text-white bg-[#2557D6] hover:bg-[#2557D6]/90 focus:ring-4 focus:ring-[#2557D6]/50 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#2557D6]/50 me-2 mb-2"
                    >
                        <svg class="w-5 h-5 me-2 -ms-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g id="User / User_02">
                                <path id="Vector" d="M20 21C20 18.2386 16.4183 16 12 16C7.58172 16 4 18.2386 4 21M12 13C9.23858 13 7 10.7614 7 8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8C17 10.7614 14.7614 13 12 13Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            </g>
                        </svg>
                        <span style={{ width: 50, textOverflow: 'clip', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {username}
                        </span>
                    </a>

                    <button onClick={handleManager} className="text-white bg-[#050708] hover:bg-[#050708]/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:hover:bg-[#050708]/40 dark:focus:ring-gray-600 me-2 mb-2">
                        Account Manager
                    </button>
                    {
                        showManager &&
                        (
                            manager ?
                                <div style={{ // Manager details popup
                                    position: 'absolute', backgroundColor: '#FFF',
                                    right: 50, padding: 20, top: 90, borderColor: '#000',
                                    borderWidth: 1, borderRadius: 20, zIndex: 999,
                                }}>
                                    <div>
                                        <div className="mb-4 flex items-center gap-4 border-b border-blue-gray-50 pb-4">
                                            <Avatar src="https://docs.material-tailwind.com/img/team-4.jpg" alt="manager-avatar" />
                                            <div>
                                                <Typography variant="h6" color="blue-gray">
                                                    {manager.name}
                                                </Typography>
                                                <Typography variant="small" color="gray" className="font-medium text-blue-gray-500">
                                                    Account Manager
                                                </Typography>
                                            </div>
                                        </div>
                                        <List className="p-0">
                                            <p className='text-initial font-medium text-blue-gray-500'>Mon - Fri: 10:00 AM - 4:00 PM</p>
                                            <p className='text-initial font-medium text-blue-gray-500'>Sat: 11:00 AM - 2:00 PM</p>
                                            <a href={`https://umaxship.com`} className="text-initial font-medium text-blue-gray-500"> {/* Umaxship website link */}
                                                <ListItem>
                                                    <ListItemPrefix>
                                                        {/* Add appropriate icon here */}
                                                        <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path fillRule="evenodd" clipRule="evenodd" d="M1 2C1 1.46957 1.21071 0.960859 1.58579 0.585786C1.96086 0.210714 2.46957 0 3 0H11C11.5304 0 12.0391 0.210714 12.4142 0.585786C12.7893 0.960859 13 1.46957 13 2V14C13.2652 14 13.5196 14.1054 13.7071 14.2929C13.8946 14.4804 14 14.7348 14 15C14 15.2652 13.8946 15.5196 13.7071 15.7071C13.5196 15.8946 13.2652 16 13 16H10C9.73478 16 9.48043 15.8946 9.29289 15.7071C9.10536 15.5196 9 15.2652 9 15V13C9 12.7348 8.89464 12.4804 8.70711 12.2929C8.51957 12.1054 8.26522 12 8 12H6C5.73478 12 5.48043 12.1054 5.29289 12.2929C5.10536 12.4804 5 12.7348 5 13V15C5 15.2652 4.89464 15.5196 4.70711 15.7071C4.51957 15.8946 4.26522 16 4 16H1C0.734784 16 0.48043 15.8946 0.292893 15.7071C0.105357 15.5196 0 15.2652 0 15C0 14.7348 0.105357 14.4804 0.292893 14.2929C0.48043 14.1054 0.734784 14 1 14V2ZM4 3H6V5H4V3ZM6 7H4V9H6V7ZM8 3H10V5H8V3ZM10 7H8V9H10V7Z" fill="#90A4AE" />
                                                        </svg>
                                                    </ListItemPrefix>
                                                    Umaxship
                                                </ListItem>
                                            </a>
                                            <a href={`tel:${manager.phone}`} className="text-initial font-medium text-blue-gray-500"> {/* Manager phone number link */}
                                                <ListItem>
                                                    <ListItemPrefix>
                                                        {/* Add appropriate icon here */}
                                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M0 1C0 0.734784 0.105357 0.48043 0.292893 0.292893C0.48043 0.105357 0.734784 0 1 0H3.153C3.38971 0.000108969 3.6187 0.0841807 3.79924 0.23726C3.97979 0.390339 4.10018 0.602499 4.139 0.836L4.879 5.271C4.91436 5.48222 4.88097 5.69921 4.78376 5.89003C4.68655 6.08085 4.53065 6.23543 4.339 6.331L2.791 7.104C3.34611 8.47965 4.17283 9.72928 5.22178 10.7782C6.27072 11.8272 7.52035 12.6539 8.896 13.209L9.67 11.661C9.76552 11.4695 9.91994 11.3138 10.1106 11.2166C10.3012 11.1194 10.5179 11.0859 10.729 11.121L15.164 11.861C15.3975 11.8998 15.6097 12.0202 15.7627 12.2008C15.9158 12.3813 15.9999 12.6103 16 12.847V15C16 15.2652 15.8946 15.5196 15.7071 15.7071C15.5196 15.8946 15.2652 16 15 16H13C5.82 16 0 10.18 0 3V1Z" fill="#90A4AE" />
                                                        </svg>
                                                    </ListItemPrefix>
                                                    {manager.phone}
                                                </ListItem>
                                            </a>
                                            <a href={`mailto:${manager.email}`} className="text-initial font-medium text-blue-gray-500"> {/* Manager email link */}
                                                <ListItem>
                                                    <ListItemPrefix>
                                                        {/* Add appropriate icon here */}
                                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M2.00299 5.884L9.99999 9.882L17.997 5.884C17.9674 5.37444 17.7441 4.89549 17.3728 4.54523C17.0015 4.19497 16.5104 3.99991 16 4H3.99999C3.48958 3.99991 2.99844 4.19497 2.62717 4.54523C2.2559 4.89549 2.03259 5.37444 2.00299 5.884Z" fill="#90A4AE" />
                                                            <path d="M18 8.11798L10 12.118L2 8.11798V14C2 14.5304 2.21071 15.0391 2.58579 15.4142C2.96086 15.7893 3.46957 16 4 16H16C16.5304 16 17.0391 15.7893 17.4142 15.4142C17.7893 15.0391 18 14.5304 18 14V8.11798Z" fill="#90A4AE" />
                                                        </svg>
                                                    </ListItemPrefix>
                                                    {manager.email}
                                                </ListItem>
                                            </a>
                                        </List>
                                    </div>
                                </div>
                                :
                                <div style={{ // Loading manager data message
                                    position: 'absolute', backgroundColor: '#FFF',
                                    right: 50, padding: 20, top: 90, borderColor: '#000',
                                    borderWidth: 1, borderRadius: 20,
                                }}>
                                    Loading Manager Data
                                </div>
                        )
                    }

                </div>
            </nav >

            {
                loadingData && // Loading data modal
                <div id="default-modal" tabindex="-1" sty class="flex overflow-y-auto dark:bg-gray-800/90 overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
                    <div class="relative p-4 w-full max-w-4xl max-h-full">
                        <div class="flex relative bg-white justify-center rounded-lg shadow dark:bg-gray-700">
                            <div class="flex items-center p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                                <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                                </svg>
                                <span className='text-white'> Loading...</span>
                            </div>
                        </div>
                    </div>
                </div>
            }

            {
                showModal && ( // Tracking data modal
                    dataExist ?
                        <div id="default-modal" class="flex overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
                            <div class="relative p-4 w-full max-w-2xl max-h-full">
                                <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
                                    <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                                            Tracking data for AWB - {searchQuery}
                                        </h3>
                                        <button onClick={() => setShowModal(false)} type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" data-modal-hide="default-modal">
                                            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                                            </svg>
                                            <span class="sr-only">Close modal</span>
                                        </button>
                                    </div>

                                    <div class="p-4 md:p-5">
                                        <ol class="relative border-s border-gray-200 dark:border-gray-600 ms-3.5 mb-1 md:mb-1">
                                            <li class="mb-1 ms-8">
                                                <button type="button" class="py-2 px-3 inline-flex items-center text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800">
                                                    <span class="absolute flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full -start-3.5 ring-8 ring-white dark:ring-gray-700 dark:bg-gray-600">
                                                        <svg class="w-2.5 h-2.5 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"><path fill="currentColor" d="M6 1a1 1 0 0 0-2 0h2ZM4 4a1 1 0 0 0 2 0H4Zm7-3a1 1 0 1 0-2 0h2ZM9 4a1 1 0 1 0 2 0H9Zm7-3a1 1 0 1 0-2 0h2Zm-2 3a1 1 0 1 0 2 0h-2ZM1 6a1 1 0 0 0 0 2V6Zm18 2a1 1 0 1 0 0-2v2ZM5 11v-1H4v1h1Zm0 .01H4v1h1v-1Zm.01 0v1h1v-1h-1Zm0-.01h1v-1h-1v1ZM10 11v-1H9v1h1Zm0 .01H9v1h1v-1Zm.01 0v1h1v-1h-1Zm0-.01h1v-1h-1v1ZM10 15v-1H9v1h1Zm0 .01H9v1h1v-1Zm.01 0v1h1v-1h-1Zm0-.01h1v-1h-1v1ZM15 15v-1h-1v1h1Zm0 .01h-1v1h1v-1Zm.01 0v1h1v-1h-1Zm0-.01h1v-1h-1v1ZM15 11v-1h-1v1h1Zm0 .01h-1v1h1v-1Zm.01 0v1h1v-1h-1Zm0-.01h1v-1h-1v1ZM5 15v-1H4v1h1Zm0 .01H4v1h1v-1Zm.01 0v1h1v-1h-1Zm0-.01h1v-1h-1v1ZM2 4h16V2H2v2Zm16 0h2a2 2 0 0 0-2-2v2Zm0 0v14h2V4h-2Zm0 14v2a2 2 0 0 0 2-2h-2Zm0 0H2v2h16v-2ZM2 18H0a2 2 0 0 0 2 2v-2Zm0 0V4H0v14h2ZM2 4V2a2 2 0 0 0-2 2h2Zm2-3v3h2V1H4Zm5 0v3h2V1H9Zm5 0v3h2V1h-2ZM1 8h18V6H1v2Zm3 3v.01h2V11H4Zm1 1.01h.01v-2H5v2Zm1.01-1V11h-2v.01h2Zm-1-1.01H5v2h.01v-2ZM9 11v.01h2V11H9Zm1 1.01h.01v-2H10v2Zm1.01-1V11h-2v.01h2Zm-1-1.01H10v2h.01v-2ZM9 15v.01h2V15H9Zm1 1.01h.01v-2H10v2Zm1.01-1V15h-2v.01h2Zm-1-1.01H10v2h.01v-2ZM14 15v.01h2V15h-2Zm1 1.01h.01v-2H15v2Zm1.01-1V15h-2v.01h2Zm-1-1.01H15v2h.01v-2ZM14 11v.01h2V11h-2Zm1 1.01h.01v-2H15v2Zm1.01-1V11h-2v.01h2Zm-1-1.01H15v2h.01v-2ZM4 15v.01h2V15H4Zm1 1.01h.01v-2H5v2Zm1.01-1V15h-2v.01h2Zm-1-1.01H5v2h.01v-2Z" /></svg>
                                                    </span>
                                                    Current Status - {trackingData.current_status}
                                                </button>
                                            </li>
                                        </ol>
                                    </div>

                                    <div class="p-4 md:p-5">
                                        <ol class="relative border-s border-gray-200 dark:border-gray-600 ms-3.5 mb-4 md:mb-5">
                                            {trackingData.shipment_track_activities.map((items) => (
                                                <li class="mb-10 ms-8">
                                                    <span class="absolute flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full -start-3.5 ring-8 ring-white dark:ring-gray-700 dark:bg-gray-600">
                                                        <svg class="w-2.5 h-2.5 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"><path fill="currentColor" d="M6 1a1 1 0 0 0-2 0h2ZM4 4a1 1 0 0 0 2 0H4Zm7-3a1 1 0 1 0-2 0h2ZM9 4a1 1 0 1 0 2 0H9Zm7-3a1 1 0 1 0-2 0h2Zm-2 3a1 1 0 1 0 2 0h-2ZM1 6a1 1 0 0 0 0 2V6Zm18 2a1 1 0 1 0 0-2v2ZM5 11v-1H4v1h1Zm0 .01H4v1h1v-1Zm.01 0v1h1v-1h-1Zm0-.01h1v-1h-1v1ZM10 11v-1H9v1h1Zm0 .01H9v1h1v-1Zm.01 0v1h1v-1h-1Zm0-.01h1v-1h-1v1ZM10 15v-1H9v1h1Zm0 .01H9v1h1v-1Zm.01 0v1h1v-1h-1Zm0-.01h1v-1h-1v1ZM15 15v-1h-1v1h1Zm0 .01h-1v1h1v-1Zm.01 0v1h1v-1h-1Zm0-.01h1v-1h-1v1ZM15 11v-1h-1v1h1Zm0 .01h-1v1h1v-1Zm.01 0v1h1v-1h-1Zm0-.01h1v-1h-1v1ZM5 15v-1H4v1h1Zm0 .01H4v1h1v-1Zm.01 0v1h1v-1h-1Zm0-.01h1v-1h-1v1ZM2 4h16V2H2v2Zm16 0h2a2 2 0 0 0-2-2v2Zm0 0v14h2V4h-2Zm0 14v2a2 2 0 0 0 2-2h-2Zm0 0H2v2h16v-2ZM2 18H0a2 2 0 0 0 2 2v-2Zm0 0V4H0v14h2ZM2 4V2a2 2 0 0 0-2 2h2Zm2-3v3h2V1H4Zm5 0v3h2V1H9Zm5 0v3h2V1h-2ZM1 8h18V6H1v2Zm3 3v.01h2V11H4Zm1 1.01h.01v-2H5v2Zm1.01-1V11h-2v.01h2Zm-1-1.01H5v2h.01v-2ZM9 11v.01h2V11H9Zm1 1.01h.01v-2H10v2Zm1.01-1V11h-2v.01h2Zm-1-1.01H10v2h.01v-2ZM9 15v.01h2V15H9Zm1 1.01h.01v-2H10v2Zm1.01-1V15h-2v.01h2Zm-1-1.01H10v2h.01v-2ZM14 15v.01h2V15h-2Zm1 1.01h.01v-2H15v2Zm1.01-1V15h-2v.01h2Zm-1-1.01H15v2h.01v-2ZM14 11v.01h2V11h-2Zm1 1.01h.01v-2H15v2Zm1.01-1V11h-2v.01h2Zm-1-1.01H15v2h.01v-2ZM4 15v.01h2V15H4Zm1 1.01h.01v-2H5v2Zm1.01-1V15h-2v.01h2Zm-1-1.01H5v2h.01v-2Z" /></svg>
                                                    </span>
                                                    <h3 class="mb-1 text-lg font-semibold text-gray-900 dark:text-white">{items.ScanDetail.Instructions}</h3>
                                                    <time class="block mb-3 text-sm font-normal leading-none text-gray-500 dark:text-gray-400">{items.ScanDetail.ScanDateTime}</time>
                                                    <time class="block mb-3 text-sm font-normal leading-none text-gray-500 dark:text-gray-400">{items.ScanDetail.ScannedLocation}</time>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </div>
                        :
                        <div id="default-modal" class="flex overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
                            <div class="relative p-4 w-full max-w-2xl max-h-full">
                                <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
                                    <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                                            Tracking data for AWB - {searchQuery}
                                        </h3>
                                        <button onClick={() => setShowModal(false)} type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" data-modal-hide="default-modal">
                                            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                                            </svg>
                                            <span class="sr-only">Close modal</span>
                                        </button>
                                    </div>

                                    <div class="p-4 md:p-5 space-y-4">
                                        <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
                                            No order found for the given AWB ID
                                        </p>
                                    </div>

                                </div>
                            </div>
                        </div>
                )

            }

            {
                rechargeModal && // Recharge modal
                <div id="default-modal" tabindex="-1" class="flex overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div class="relative p-4 w-full max-w-2xl max-h-full">

                        <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">

                            <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                                <div>
                                    <h3 class="text-xl font-semibold text-blue-600 dark:text-blue-600">
                                        Recharge Your Wallet
                                    </h3>
                                    <h3 class="text-sm font-medium text-gray-900 dark:text-white">
                                        Current Wallet Amount  ₹ {walletBalance}
                                    </h3>
                                </div>
                                <button onClick={() => setRechargeModal(false)} type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" data-modal-hide="default-modal">
                                    <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                                    </svg>
                                    <span class="sr-only">Close modal</span>
                                </button>
                            </div>
                            <div class="p-4 md:p-5 space-y-4">
                                <div class="max-w-sm mx-auto ">
                                    <label for="phone-input" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Enter amount:</label>
                                    <div class="relative">
                                        <div class="absolute inset-y-0 start-0 top-0 flex items-center ps-3.5 pointer-events-none text-xl font-bold dark:text-white">
                                            ₹
                                        </div>
                                        <input type="number" id="amount-input" aria-describedby="helper-text-explanation" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
                                            placeholder="500" required onChange={e => setRechargeAmount(e.target.value)} value={rechargeAmount} />
                                    </div>
                                    <p id="helper-text-explanation" class="mt-2 text-sm text-gray-500 dark:text-gray-400">Min value: ₹500 & Max value: ₹5,00,000</p>
                                </div>
                                <div class="max-w-sm mx-auto">
                                    <label for="phone-input" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Select Amount for Quick Recharge</label>
                                    <div class="relative">
                                        <button onClick={() => setRechargeAmount(500)} type="button" class="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl  focus:ring-blue-300  font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2">500</button>
                                        <button onClick={() => setRechargeAmount(1000)} type="button" class="text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl  focus:ring-cyan-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2">1,000</button>
                                        <button onClick={() => setRechargeAmount(5000)} type="button" class="text-white bg-gradient-to-br from-green-400 to-blue-600 hover:bg-gradient-to-bl focus:ring-green-200  font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2">5,000</button>
                                        <button onClick={() => setRechargeAmount(10000)} type="button" class="text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:bg-gradient-to-l  focus:ring-purple-200 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2">10,000</button>
                                    </div>
                                </div>
                                <div class="max-w-sm mx-auto dark:bg-gray-800 p-4 rounded">
                                    <div class="relative">
                                        <label for="phone-input" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Recharge amount ₹ {rechargeAmount}</label>
                                        <label for="phone-input" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Payable amount ₹ {rechargeAmount}</label>
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center p-4 md:p-5 border-t border-gray-200 rounded-b dark:border-gray-600">
                                <button onClick={() => setRechargeModal(false)} type="button" class="py-2.5 px-5 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">Cancel</button>
                                {
                                    loading ?
                                        <button disabled type="button" class="py-2.5 px-5 ms-3 text-sm font-medium text-gray-900 bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:outline-none focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 inline-flex items-center">
                                            <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-gray-200 animate-spin dark:text-gray-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="#1C64F2" />
                                            </svg>
                                            Loading...
                                        </button>
                                        :
                                        <button onClick={() => createPaymentLink()} type="button" class="ms-3 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Continue to Pay</button>
                                }
                            </div>
                        </div>
                    </div>
                </div>
            }

        </div >
    )
}

export default Navbar