import React, { useEffect, useState } from 'react';
import Navbar from '../../common/Navbar';
import { cashfree } from '../../cashfree/util';
import { db } from '../../firebase.config';
import { getDoc, doc, updateDoc } from 'firebase/firestore';

// Accessing environment variables
const GENERATE_SESSION_ID_API = process.env.REACT_APP_GENERATE_SESSION_ID_API;
const CASHFREE_WEBHOOK_HANDLER_API = process.env.REACT_APP_CASHFREE_WEBHOOK_HANDLER_API;

function Pricing() {
    // State variables for user information
    const [username, setUsername] = useState('User');
    const [userId, setUserId] = useState('');
    const [userPhone, setUserPhone] = useState('');
    const [userEmail, setUserEmail] = useState('');

    // State variable for order ID and loading state
    const [order_id, setOrder_id] = useState('');
    const [loading, setLoading] = useState(false);

    // State variable for early COD status
    const [earlyCodStatus, setEarlyCodStatus] = useState('');

    // State variable for updating COD status
    const [updateCod, setUpdateCod] = useState('');

    // Fetch user data from local storage on component mount
    useEffect(() => {
        const currentUser = localStorage.getItem('umaxshipuser');
        if (currentUser) {
            try {
                const jsonData = JSON.parse(currentUser);
                setUsername(jsonData.displayName);
                setUserId(jsonData.uid);
                setUserEmail(jsonData.email);
            } catch (error) {
                console.error("Error parsing user data:", error);
            }
        }
    }, []);

    // Generate a unique order ID
    const generateOrderId = () => {
        const timestamp = Date.now().toString() + Math.random().toString(36).substring(2, 7);
        setOrder_id(timestamp);
    }

    // Generate order ID on component mount
    useEffect(() => {
        generateOrderId();
    }, []);

    /**
     * Fetches a payment session ID from the server.
     * @param {number} rechargeAmount - The amount to recharge.
     */
    const getSessionId = async (rechargeAmount) => {
        if (rechargeAmount < 500) {
            setLoading(false);
            return;
        }
        try {
            const url = "https://generatesessionid-vjij5onvgq-uc.a.run.app"
            const requestData = {
                order_amount: rechargeAmount,
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
                body: JSON.stringify(requestData) // Convert JSON data to a string and set it as the request body
            };

            fetch(url, options)
                .then(response => {
                    return response.json();
                })
                .then(data => {
                    handlePayment({ session_id: data.payment_session_id });
                    setLoading(false)
                })
                .catch(error => {
                    console.error('Fetch error:', error);
                    setLoading(false)
                });
        } catch (error) {
            // Handle error here
            console.error(error);
            setLoading(false)
        }
    }

    /**
     * Handles the payment process using Cashfree's checkout.
     * @param {object} session_id - The payment session ID.
     */
    const handlePayment = ({ session_id }) => {
        let checkoutOptions = {
            paymentSessionId: session_id,
            returnUrl: "https://app.umaxship.com/dashboard",
            notify_url: CASHFREE_WEBHOOK_HANDLER_API,
            redirectTarget: "_self",
        }
        cashfree.checkout(checkoutOptions).then(function (result) {
            if (result.error) {
                alert(result.error.message)
            }
            if (result.redirect) {
                console.log("Redirection")
            }
        });
    }

    /**
     * Creates a payment link for the specified amount.
     * @param {number} amount - The amount for which to create the payment link.
     */
    const createPaymentLink = async (amount) => {
        setLoading(true);
        getSessionId(amount);
    }
    

    const getEarlyCodStatus = async () => {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const docData = docSnap.data();
            setEarlyCodStatus(docData.earlyCod);
        }
    }

    // Fetch early COD status when userId changes
    useEffect(() => {
        if (userId) {
            getEarlyCodStatus();
        }
    }, [userId])

    const activeButton = 'text-white block w-full bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-200 font-medium rounded-lg text-sm px-4 py-2.5 text-center dark:focus:ring-green-900';
    const nonActiveBtn = 'text-white block w-full bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 font-medium rounded-lg text-sm px-4 py-2.5 text-center dark:focus:ring-blue-900';

    // Update early COD status in Firestore when updateCod changes
    // Update early COD status in Firestore when updateCod changes
    useEffect(() => {
        if (earlyCodStatus !== updateCod) {
            const updateCodStatus = async () => {
                const docRef = doc(db, "users", userId);
                await updateDoc(docRef, {
                    earlyCod: updateCod,
                });
                getEarlyCodStatus();
            }
            updateCodStatus();
        }
    }, [updateCod])


    return (
        <div>
            <Navbar />

            <div className='w-full rounded-lg mt-5 py-1 border border-black'>
                <h5 class="mb-2 mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
                    Introducing Early COD - Grow Faster with Daily COD Remittance
                </h5>
                <p class="m-2 text-lg font-medium tracking-tight text-gray-500 dark:text-gray-500 text-center">
                    Get guaranteed remittance in just 2* days from the shipment delivered date. Grow your business by removing cash flow restrictions. Get full control over your remittance cycle and take better decisions for your business.
                </p>
                <div id="detailed-pricing" class="w-full overflow-x-auto">
                    <div class="overflow-hidden min-w-max">
                        <div class="grid grid-cols-5 p-4 text-sm font-medium text-gray-900 bg-gray-100 border-t border-b border-gray-200 gap-x-16 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                            <div class="flex items-center">Feature</div>
                            <div>Standard</div>
                            <div>Pro</div>
                            <div>Premium</div>
                            <div>Enterprise</div>
                        </div>

                        <div class="grid grid-cols-5 px-4 py-5 text-sm text-gray-700 border-b border-gray-200 gap-x-16 dark:border-gray-700">
                            <div class="text-gray-500 dark:text-gray-400">Settlement</div>
                            <div class="text-black dark:text-white">Delivered + 1 Day</div>
                            <div class="text-black dark:text-white">Delivered + 2 Day</div>
                            <div class="text-black dark:text-white">Delivered + 3 Day</div>
                            <div class="text-black dark:text-white">Delivered + 4 Day</div>
                        </div>

                        <div class="grid grid-cols-5 px-4 py-5 text-sm text-gray-700 border-b border-gray-200 gap-x-16 dark:border-gray-700">
                            <div class="text-gray-500 dark:text-gray-400">Settlement Fee</div>
                            <div class="text-black dark:text-white">2% of COD</div>
                            <div class="text-black dark:text-white">1.75% of COD</div>
                            <div class="text-black dark:text-white">1% of COD</div>
                            <div class="text-black dark:text-white">0.75% of COD</div>
                        </div>

                        <div class="grid grid-cols-5 px-4 py-5 text-sm text-gray-700 border-b border-gray-200 gap-x-16 dark:border-gray-700">
                            <div class="text-gray-500 dark:text-gray-400">Payouts/Month</div>
                            <div class="text-black dark:text-white">20</div>
                            <div class="text-black dark:text-white">20</div>
                            <div class="text-black dark:text-white">8</div>
                            <div class="text-black dark:text-white">8</div>
                        </div>

                        <div class="grid grid-cols-5 px-4 py-5 text-sm text-gray-700 border-b border-gray-200 gap-x-16 dark:border-gray-700">
                            <div class="text-gray-500 dark:text-gray-400"></div>
                            <div>
                                {
                                    earlyCodStatus === 'Standard' ?
                                        <a disabled class={activeButton}>
                                            Currently Active
                                        </a>
                                        :
                                        <a onClick={() => setUpdateCod('Standard')} class={nonActiveBtn}>
                                            Activate
                                        </a>
                                }
                            </div>
                            <div>
                                {
                                    earlyCodStatus === 'Pro' ?
                                        <a disabled class={activeButton}>
                                            Currently Active
                                        </a>
                                        :
                                        <a onClick={() => setUpdateCod('Pro')} class={nonActiveBtn}>
                                            Activate
                                        </a>
                                }
                            </div>
                            <div>
                                {
                                    earlyCodStatus === 'Premium' ?
                                        <a disabled class={activeButton}>
                                            Currently Active
                                        </a>
                                        :
                                        <a onClick={() => setUpdateCod('Premium')} class={nonActiveBtn}>
                                            Activate
                                        </a>
                                }
                            </div>
                            <div>
                                {
                                    earlyCodStatus === 'Enterprise' ?
                                        <a disabled class={activeButton}>
                                            Currently Active
                                        </a>
                                        :
                                        <a onClick={() => setUpdateCod('Enterprise')} class={nonActiveBtn}>
                                            Activate
                                        </a>
                                }
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <div className='w-full dark:bg-gray-800 rounded-lg mt-5 py-1 border border-black'>
                <h5 class="mb-2 mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
                    Wallet recharge plans
                </h5>
                <div id="detailed-pricing" class="w-full overflow-x-auto">
                    <div class="overflow-hidden min-w-max">
                        <div class="grid grid-cols-5 p-4 text-sm font-medium text-gray-900 bg-gray-100 border-t border-b border-gray-200 gap-x-16 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                            <div class="flex items-center">Feature</div>
                            <div>Standard</div>
                            <div>Pro</div>
                            <div>Premium</div>
                            <div>Enterprise</div>
                        </div>

                        <div class="grid grid-cols-5 px-4 py-5 text-sm text-gray-700 border-b border-gray-200 gap-x-16 dark:border-gray-700">
                            <div class="text-gray-500 dark:text-gray-400">Recharge Amount</div>
                            <div class="text-black dark:text-white">₹ 10,000</div>
                            <div class="text-black dark:text-white">₹ 20,000</div>
                            <div class="text-black dark:text-white">₹ 30,000</div>
                            <div class="text-black dark:text-white">₹ 50,000</div>
                        </div>

                        <div class="grid grid-cols-5 px-4 py-5 text-sm text-gray-700 border-b border-gray-200 gap-x-16 dark:border-gray-700">
                            <div class="text-gray-500 dark:text-gray-400">Discount on Shipping</div>
                            <div class="text-black dark:text-white">2%</div>
                            <div class="text-black dark:text-white">4%</div>
                            <div class="text-black dark:text-white">6%</div>
                            <div class="text-black dark:text-white">8%</div>
                        </div>

                        <div class="grid grid-cols-5 px-4 py-5 text-sm text-gray-700 border-b border-gray-200 gap-x-16 dark:border-gray-700">
                            <div class="text-gray-500 dark:text-gray-400">24*7 Support</div>
                            <div>
                                <svg class="w-3 h-3 text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5.917 5.724 10.5 15 1.5" />
                                </svg>
                            </div>
                            <div>
                                <svg class="w-3 h-3 text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5.917 5.724 10.5 15 1.5" />
                                </svg>
                            </div>
                            <div>
                                <svg class="w-3 h-3 text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5.917 5.724 10.5 15 1.5" />
                                </svg>
                            </div>
                            <div>
                                <svg class="w-3 h-3 text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5.917 5.724 10.5 15 1.5" />
                                </svg>
                            </div>
                        </div>

                        <div class="grid grid-cols-5 px-4 py-5 text-sm text-gray-700 border-b border-gray-200 gap-x-16 dark:border-gray-700">
                            <div class="text-gray-500 dark:text-gray-400">Email Support</div>
                            <div>
                                <svg class="w-3 h-3 text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5.917 5.724 10.5 15 1.5" />
                                </svg>
                            </div>
                            <div>
                                <svg class="w-3 h-3 text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5.917 5.724 10.5 15 1.5" />
                                </svg>
                            </div>
                            <div>
                                <svg class="w-3 h-3 text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5.917 5.724 10.5 15 1.5" />
                                </svg>
                            </div>
                            <div>
                                <svg class="w-3 h-3 text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5.917 5.724 10.5 15 1.5" />
                                </svg>
                            </div>
                        </div>

                        <div class="grid grid-cols-5 px-4 py-5 text-sm text-gray-700 border-b border-gray-200 gap-x-16 dark:border-gray-700">
                            <div class="text-gray-500 dark:text-gray-400">Phone Support</div>
                            <div>
                                <svg class="w-3 h-3 text-red-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                                </svg>
                            </div>
                            <div>
                                <svg class="w-3 h-3 text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5.917 5.724 10.5 15 1.5" />
                                </svg>
                            </div>
                            <div>
                                <svg class="w-3 h-3 text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5.917 5.724 10.5 15 1.5" />
                                </svg>
                            </div>
                            <div>
                                <svg class="w-3 h-3 text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5.917 5.724 10.5 15 1.5" />
                                </svg>
                            </div>
                        </div>

                        <div class="grid grid-cols-5 px-4 py-5 text-sm text-gray-700 border-b border-gray-200 gap-x-16 dark:border-gray-700">
                            <div class="text-gray-500 dark:text-gray-400"></div>
                            <div>
                                {
                                    loading
                                        ?
                                        <button disabled type="button" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 inline-flex items-center">
                                            <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                                            </svg>
                                            Loading...
                                        </button>
                                        :
                                        <a onClick={() => createPaymentLink(10000)} class="text-white block w-full bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 font-medium rounded-lg text-sm px-4 py-2.5 text-center dark:focus:ring-blue-900">Buy now</a>
                                }
                            </div>
                            <div>
                                {
                                    loading
                                        ?
                                        <button disabled type="button" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 inline-flex items-center">
                                            <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                                            </svg>
                                            Loading...
                                        </button>
                                        :
                                        <a onClick={() => createPaymentLink(20000)} class="text-white block w-full bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 font-medium rounded-lg text-sm px-4 py-2.5 text-center dark:focus:ring-blue-900">Buy now</a>
                                }
                            </div>
                            <div>
                                {
                                    loading
                                        ?
                                        <button disabled type="button" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 inline-flex items-center">
                                            <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                                            </svg>
                                            Loading...
                                        </button>
                                        :
                                        <a onClick={() => createPaymentLink(30000)} class="text-white block w-full bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 font-medium rounded-lg text-sm px-4 py-2.5 text-center dark:focus:ring-blue-900">Buy now</a>
                                }
                            </div>
                            <div>
                                {
                                    loading
                                        ?
                                        <button disabled type="button" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 inline-flex items-center">
                                            <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                                            </svg>
                                            Loading...
                                        </button>
                                        :
                                        <a onClick={() => createPaymentLink(50000)} class="text-white block w-full bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 font-medium rounded-lg text-sm px-4 py-2.5 text-center dark:focus:ring-blue-900">Buy now</a>
                                }
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}

export default Pricing