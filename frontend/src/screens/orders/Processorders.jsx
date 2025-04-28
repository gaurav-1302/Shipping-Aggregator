import React, { useEffect, useState } from 'react';
import { LuBox } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { db, analytics } from '../../firebase.config';
import { query, getDocs, collection, where, updateDoc, doc, getDoc, setDoc, arrayUnion, serverTimestamp, deleteDoc } from 'firebase/firestore';
import Navbar from '../../common/Navbar';
import { logEvent } from 'firebase/analytics';

// Import environment variables for API URLs
const CALCULATE_RATE_B2B_API_URL = process.env.REACT_APP_CALCULATE_RATE_B2B_API_URL;
const CALCULATE_RATE_B2C_API_URL = process.env.REACT_APP_CALCULATE_RATE_B2C_API_URL;
const CREATE_PICKUP_REQUEST_API_URL = process.env.REACT_APP_CREATE_PICKUP_REQUEST_API_URL;
const GENERATE_INVOICES_API_URL = process.env.REACT_APP_GENERATE_INVOICES_API_URL;
const GENERATE_SHIPPING_LABEL_API_URL = process.env.REACT_APP_GENERATE_SHIPPING_LABEL_API_URL;
const PRINT_MANIFEST_API_URL = process.env.REACT_APP_PRINT_MANIFEST_API_URL;

function Processorders() {
    // Navigation hook for routing
    const navigate = useNavigate();

    // State to store the current user's ID
    const [userId, setUserId] = useState('');

    // Fetch user ID from local storage on component mount
    useEffect(() => {
        const currentUser = localStorage.getItem('umaxshipuser');
        const jsonData = JSON.parse(currentUser);
        if (jsonData) {
            setUserId(jsonData.uid);
        }
    }, []);

    // CSS classes for active and non-active buttons
    const nonActiveClass = "px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-[#003B49] border-dashed rounded-lg hover:text-blue-700 focus:z-10";
    const activeClass = "bg-blue-700 px-4 py-2 text-sm font-medium text-white border border-[#003B49] border-dashed rounded-lg focus:z-10 ";

    // State for toast messages
    const [errorToast, setErrorToast] = useState(false);
    const [successToast, setSuccessToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('Ok');

    // State for managing the list of orders
    const [ordersList, setOrdersList] = useState([]);

    // State for managing the filtered list of orders
    const [filteredList, setFilteredList] = useState([]);

    // State for search query
    const [searchQuery, setSearchQuery] = useState('');

    const [loading, setLoading] = useState(true);

    const [orderType, setOrderType] = useState('ALL');

    const fetchOrders = async () => {
        /**
         * Fetches orders from Firestore based on the current user ID and selected order type.
         * Updates the ordersList state with the fetched orders.
         */
        try {
            setLoading(true);
            let q;

            // Construct the query based on the selected order type
            if (orderType === "ALL") {
                q = query(collection(db, "orders"), where("user_id", "==", userId))
            } else if (orderType === "UNSHIPPED") {
                q = query(collection(db, "orders"), where("user_id", "==", userId), where("current_status", "==", "UNSHIPPED"));
            } else if (orderType === "READY TO SHIP") {
                q = query(collection(db, "orders"), where("user_id", "==", userId), where("current_status", "==", "READY TO SHIP"));
            } else if (orderType === "PICKUP SCHEDULED") {
                q = query(collection(db, "orders"), where("user_id", "==", userId), where("current_status", "in", ["PICKUP SCHEDULED", "MANIFESTED"]));
            } else if (orderType === "IN TRANSIT") {
                q = query(collection(db, "orders"), where("user_id", "==", userId), where("current_status", "==", "IN TRANSIT"));
            } else if (orderType === "DELIVERED") {
                q = query(collection(db, "orders"), where("user_id", "==", userId), where("current_status", "==", "DELIVERED"));
            } else if (orderType === "RTO") {
                q = query(collection(db, "orders"), where("user_id", "==", userId), where("current_status", "==", "RTO"));
            }

            const querySnapshot = await getDocs(q);

            // Extract order data from the query snapshot
            let orders = [];
            querySnapshot.forEach((doc) => {
                const docData = doc.data();
                orders.push({ ...docData, id: doc.id });
            });


            setOrdersList(orders);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching orders:", error);
            setLoading(false);
            // Handle errors appropriately (e.g., display error message to user)
        }
    };

    // Fetch orders when the user ID or order type changes
    useEffect(() => {
        fetchOrders();
    }, [userId, orderType]);

    // Filter orders based on search query
    // Filter orders based on search query
    useEffect(() => {
        const filteredOrders = ordersList.filter((item) => {

            ordersList.sort((item1, item2) => {
                const orderId1 = item1.timestamp;
                const orderId2 = item2.timestamp;
                return orderId2 - orderId1;
            });

            // Apply search query filter only after order type filter (if searchQuery exists)
            if (searchQuery) {
                try {
                    const orderId = String(item.id);
                    return orderId.includes(searchQuery.toLowerCase());
                } catch (error) {
                    console.error('Error parsing response:', error);
                    return false; // Exclude items with parsing errors
                }
            }

            // No search query or order type filter applied, return all remaining items
            return true;
        });

        setFilteredList(filteredOrders);
    }, [ordersList, searchQuery]);

    // Update filtered list when orders list changes
    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
    };

    // Update filtered list when orders list changes
    useEffect(() => {
        // Update filtered list when orders list changes
        setFilteredList(ordersList);
    }, [ordersList])

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortedOrders, setSortedOrders] = useState([]);

    // Sort and paginate orders
    useEffect(() => {
        const sortAndPaginate = () => {
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, filteredList.length);
            setSortedOrders(filteredList.slice(startIndex, endIndex));
        };
        sortAndPaginate();
    }, [ordersList, currentPage, pageSize, filteredList]);

    // Handle pagination
    const handlePrevClick = () => {
        if (currentPage > 1) {
            setCurrentPage(prevPage => prevPage - 1);
        }
    };

    const handleNextClick = () => {
        if (currentPage < Math.ceil(ordersList.length / pageSize)) {
            setCurrentPage(nextPage => nextPage + 1);
        }
    };

    // State for managing the action button
    const [actionId, setActionId] = useState('');

    const handleActionButton = (id) => {
        if (actionId === '') {
            setActionId(id)
        } else {
            setActionId('')
        }
    }

    // State for managing available couriers
    const [availableCourier, setAvailableCourier] = useState([]);
    const [loadingCouriers, setLoadingCouriers] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // State for storing document ID and shipment ID for AWBs
    const [documentIdForAwb, setDocumentIdForAwb] = useState('');
    const [shipmentIdForAwb, setShipmentIdForAwb] = useState('');

    // Fetch available couriers for an order

    async function fetchAvailableCourier({ order_id, pickupCode, destCode, paymentMode, weight, length, breadth, height, declaredCost, order_type, orderItemData, insaurance, totalWeight, fm_pickup }) {
        setDocumentIdForAwb(order_id);
        setLoadingCouriers(true);
        setShowModal(true);
        try {
            if (order_type === "B2B") {
                const response = await fetch(CALCULATE_RATE_B2B_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pickup_postcode: String(pickupCode),
                        delivery_postcode: String(destCode),
                        cod: paymentMode,
                        weight: totalWeight,
                        items: orderItemData.map(item => ({
                            count: Number(item.count),
                            height: Number(item.height),
                            length: Number(item.length),
                            width: Number(item.breadth),
                        })),
                        declared_value: declaredCost,
                        insaurance: insaurance,
                        fm_pickup: fm_pickup
                    })
                });

                const res = await response.json();
                console.log(res)
                setLoadingCouriers(false);
                setAvailableCourier(res.available_courier_companies)
                setShowModal(true);
            } else {
                const response = await fetch(CALCULATE_RATE_B2C_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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

                const res = await response.json();
                setLoadingCouriers(false);
                setAvailableCourier(res.available_courier_companies)
                setShowModal(true);
            }
        } catch (error) {
            setShowModal(false);
            setErrorToast(true);
            setLoadingCouriers(false);
            setToastMessage('Error in processing the order. Please try again after sometime.')
        }
    }

    // Close the modal and reset state
    const handleModalClose = () => {
        setShowModal(false);
        setAvailableCourier([]);
        setActionId('');

    }

    const [confirmingShipping, setConfirmingShipping] = useState(false);

    const confirmShipping = async ({ courier_id, courier_charges }) => {
        setConfirmingShipping(true);
        try {
            const walletRef = doc(db, 'wallets', userId);
            const walletSnapshot = await getDoc(walletRef);
            if (!walletSnapshot.exists) {
                setActionId('');
                setShowModal(false);
                setConfirmingShipping(false);
                setErrorToast(true);
                setToastMessage("You don't have enough balance. Please recharge your wallet first.")
                fetchOrders();
                setAvailableCourier([]);
                return;
            }
            const walletData = walletSnapshot.data();
            const balance = walletData.balance || 0;
            if (balance < courier_charges) {
                setActionId('');
                setShowModal(false);
                setConfirmingShipping(false);
                setErrorToast(true);
                setToastMessage("Insufficient funds in your wallet. Order processing skipped");
                fetchOrders();
                setAvailableCourier([]);
                return;
            }
            const docRef = doc(db, 'orders', documentIdForAwb);
            await updateDoc(docRef, {
                current_status: "READY TO SHIP",
                courier_id: Number(courier_id),
                courier_charges: Number(courier_charges),
            });
            setActionId('');
            setShowModal(false);
            setConfirmingShipping(false);
            setSuccessToast(true);
            setToastMessage("Order shipment assigned to the selected courire partner.")
            fetchOrders();
            setAvailableCourier([]);
        } catch (error) {
            setActionId('');
            setShowModal(false);
            setConfirmingShipping(false);
            setErrorToast(true);
            setToastMessage("Can't ship your order with selected courier partner. Please try again or contact support team.", error)
            fetchOrders();
            setAvailableCourier([]);
            console.log(error);
        }
    }

    // Request shipment pickup for an order
    const requestShipmentPickup = async ({ documentId }) => {
        setConfirmingShipping(true);
        try {
            // Fetch order details from Firestore
            const docRef = doc(db, 'orders', documentId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                setActionId('');
                setConfirmingShipping(false);
                setErrorToast(true);
                setToastMessage("Order not found.");
                fetchOrders();
                return;
            }

            // Extract pickup_location from order data
            const orderData = docSnap.data();
            const { pickup_location } = JSON.parse(orderData.data);
            const courierId = orderData.courier_id;

            const today = new Date();
            const tomorrow = new Date(today.getTime());
            const twoHoursLater = new Date(today.getTime() + (2 * 60 * 60 * 1000));

            const formatTime = (date) => {
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                return `${hours}:${minutes}:00`; // Assuming seconds are always 00
            };

            const pickup_time = formatTime(twoHoursLater);
            const pickup_date = tomorrow.toISOString().slice(0, 10);

            var expected_package_count = 1;
            // Construct request payload with default expected_package_count of 1
            const payload = {
                pickup_time,
                pickup_date,
                pickup_location,
                expected_package_count: expected_package_count,
                courierId,
                documentId,
            };

            const url = CREATE_PICKUP_REQUEST_API_URL;

            // Fetch existing pickup IDs
            const pickupRequestsRef = doc(db, "pickuprequests", userId);
            const snapshot = await getDoc(pickupRequestsRef);

            let existingPickupIds = [];
            if (snapshot.exists()) {
                const pickupData = snapshot.data();
                existingPickupIds = pickupData.delhivery_pickup_req || []; // Use an empty array as default
            }

            // Count occurrences of the requested pickup ID in existingPickupIds
            const requestedPickupIdCount = existingPickupIds.filter(id => id === payload.pickupId).length;

            // Update expected_package_count based on occurrence count
            expected_package_count = requestedPickupIdCount + 1;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            const pickupId = data.pickup_id;

            // Update pickup requests collection
            await updatePickupRequest({ pickupId, pickup_time, pickup_date, pickup_location, expected_package_count, requestedPickupIdCount });

            if (pickupId) {
                await updateDoc(docRef, {
                    current_status: "PICKUP SCHEDULED"
                });

                setActionId('');
                setConfirmingShipping(false);
                setSuccessToast(true);
                setToastMessage("Order pickup request created successfully.");
                fetchOrders();
            } else {
                setActionId('');
                setConfirmingShipping(false);
                setErrorToast(true);
                setToastMessage(data.error);
                fetchOrders();
            }
        } catch (error) {
            console.error('Error requesting pickup for order:', error);
            setActionId('');
            setConfirmingShipping(false);
            setToastMessage("Can't request the pickup for this order. Please try again or contact support team.");
            setErrorToast(true);
            fetchOrders();
        }
    };

    // Update pickup request in Firestore
    const updatePickupRequest = async ({ pickupId, pickup_time, pickup_date, pickup_location, expected_package_count, requestedPickupIdCount }) => {
        const pickupRequestsRef = doc(db, 'pickuprequests', userId);
        const snapshot = await getDoc(pickupRequestsRef);

        if (snapshot.exists()) {
            const pickupData = snapshot.data();
            const existingPickupIds = pickupData.delhivery_pickup_req || [];

            if (expected_package_count > requestedPickupIdCount) {
                addAnotherPickup({ pickupId, pickup_time, pickup_date, pickup_location, expected_package_count, })
            }

            // Append the pickupId to the existing array
            existingPickupIds.push(pickupId);

            // Update the document with the modified array
            await updateDoc(pickupRequestsRef, {
                delhivery_pickup_req: existingPickupIds
            });
        } else {
            // Create new document
            await setDoc(pickupRequestsRef, {
                delhivery_pickup_req: [pickupId],
            });
        }
    };

    // Add another pickup request
    const addAnotherPickup = async ({ pickupId, pickup_time, pickup_date, pickup_location, expected_package_count, }) => {

        const payload = {
            pickup_time,
            pickup_date,
            pickup_location,
            expected_package_count
        };
        const url = `https://createpickuprequest-vjij5onvgq-uc.a.run.app`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
    }

    // Generate invoice for an order
    const generateInvoice = async (order_id) => {
        try {
            setConfirmingShipping(true);
            const response = await fetch(GENERATE_INVOICES_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_ids: [order_id]
                })
            });
            const responseJson = await response.json();
            // window.open(responseJson.label_url, '_blank');
            setConfirmingShipping(false);
        } catch (error) {
            setConfirmingShipping(false);
            console.error('Error sending data for labels:', error);
        }
    }

    // Generate shipping label for an order
    const generateLabel = async ({ waybill, courier_id }) => {
        try {
            setConfirmingShipping(true);
            const response = await fetch(GENERATE_SHIPPING_LABEL_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ waybill, courier_id })
            });
            const responseJson = await response.json();
            console.log(response);
            console.log(responseJson);
            window.open(responseJson, '_blank');
            setConfirmingShipping(false);
        } catch (error) {
            setConfirmingShipping(false);
            console.error('Error sending data for labels:', error);
        }
    }

    // Generate manifest for an order
    const generateMenifest = async (order_id) => {
        try {
            setConfirmingShipping(true);
            const response = await fetch(PRINT_MANIFEST_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_ids: [order_id]
                })
            });
            const responseJson = await response.json();
            window.open(responseJson.manifest_url, '_blank');
            setConfirmingShipping(false);
        } catch (error) {
            setConfirmingShipping(false);
            console.error('Error sending data for labels:', error);
        }
    }

    // Generate a unique order ID
    const generateOrderId = () => {
        const timestamp = Date.now().toString() + Math.random().toString(36).substring(2, 7);
        return timestamp;
    }

    // Clone an existing order
    const cloneOrder = async ({ id, order_type }) => {
        const new_order_id = id;
        if (order_type === "B2B") {
            navigate(`/cloneorderb2b?new_order_id=${new_order_id}`)
        } else {
            navigate(`/cloneorders?new_order_id=${new_order_id}`)
        }
    }

    // Cancel an order
    const cancelOrder = async (order_id) => {
        setConfirmingShipping(true);

        await updateDoc(doc(db, "orders", order_id), {
            current_status: "CANCELLED"
        }).then(() => {
            setToastMessage('Order cancelled successfully.');
            setConfirmingShipping(false);
            setSuccessToast(true);
            fetchOrders();
        }).catch((error) => {
            setToastMessage('Failed to cancel order! Try again later.');
            setConfirmingShipping(false);
            setErrorToast(true);
            fetchOrders();
        })
    }

    // Delete an order
    const deleteOrder = async (order_id) => {
        try {
            // Reference to the orders collection
            const orderDocRef = doc(db, 'orders', order_id);

            // Fetch the order details
            const orderSnapshot = await getDoc(orderDocRef);
            if (!orderSnapshot.exists()) {
                alert('Error: Order not found.');
                return;
            }

            const orderData = orderSnapshot.data();

            // Reference to the deletedorders collection
            const deletedOrdersCollectionRef = collection(db, 'deletedorders');
            const deletedOrderDocRef = doc(deletedOrdersCollectionRef, order_id);

            // Save the order to deletedorders collection
            await setDoc(deletedOrderDocRef, {
                ...orderData,
                deletedAt: new Date().toISOString(), // Add a timestamp for when it was deleted
            });

            // Delete the order from the orders collection
            await deleteDoc(orderDocRef).then(() => {
                setToastMessage('Order deleted Successfully');
                setConfirmingShipping(false);
                setSuccessToast(true);
                fetchOrders();
            }).catch((error) => {
                setToastMessage('Failed to delete order! Try again later.');
                setConfirmingShipping(false);
                setErrorToast(true);
                fetchOrders();
            });


        } catch (error) {
            console.error('Delete Order Error:', error);
            alert('Error: Something went wrong while deleting the order.');
        }
    };

    // Main component return
    return (
        <div>
            <Navbar />

            <div className='h-full w-full mt-4'>
                {
                    successToast &&
                    <div className='fixed right-10 top-10' style={{ zIndex: 999 }}>
                        <div id="toast-success" class="flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-[#0E9F6E]  border border-[#003B49] border-dashed" role="alert">
                            <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-green-500 bg-green-100 rounded-lg dark:bg-green-800 dark:text-green-200">
                                <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z" />
                                </svg>
                                <span class="sr-only">Check icon</span>
                            </div>
                            <div class="ms-3 text-sm text-black font-normal mx-2">{toastMessage}</div>
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
                    <div className='fixed right-10 top-10' style={{ zIndex: 999 }}>
                        <div id="toast-danger" class="flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-[#F05252] border border-[#003B49] border-dashed" role="alert">
                            <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-red-500 bg-red-100 rounded-lg dark:bg-red-800 dark:text-red-200">
                                <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 11.793a1 1 0 1 1-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 0 1 1.414-1.414L10 8.586l2.293-2.293a1 1 0 0 1 1.414 1.414L11.414 10l2.293 2.293Z" />
                                </svg>
                                <span class="sr-only">Error icon</span>
                            </div>
                            <div class="ms-3 text-sm font-normal text-black mx-2">{toastMessage}</div>
                            <button onClick={() => setErrorToast(false)} type="button" class=" ms-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700" data-dismiss-target="#toast-danger" aria-label="Close">
                                <span class="sr-only">Close</span>
                                <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                                </svg>
                            </button>
                        </div>
                    </div>
                }

                <div className='flex w-full mt-5 justify-between bg-[#003B49] rounded-lg p-2'>

                    <form class="flex items-center max-w-sm mx-full">
                        <label for="simple-search" class="sr-only">Search</label>
                        <div class="relative w-full">
                            <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                <LuBox size={18} />
                            </div>
                            <input type="text" id="simple-search" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                placeholder="Search by Order id" value={searchQuery} onChange={handleSearchChange} required />
                        </div>
                        <button disabled class="p-2.5 ms-2 text-sm font-medium text-white bg-blue-700 rounded-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                            <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                            </svg>
                            <span class="sr-only">Search</span>
                        </button>
                    </form>
                </div>

                <div class="inline-flex rounded-md shadow-sm mt-2 gap-2" role="group">
                    <button type="button" class={orderType === 'ALL' ? activeClass : nonActiveClass} onClick={() => setOrderType('ALL')}>
                        ALL
                    </button>
                    <button type="button" class={orderType === 'UNSHIPPED' ? activeClass : nonActiveClass} onClick={() => setOrderType('UNSHIPPED')}>
                        UNSHIPPED
                    </button>
                    <button type="button" class={orderType === 'READY TO SHIP' ? activeClass : nonActiveClass} onClick={() => setOrderType('READY TO SHIP')}>
                        READY TO SHIP
                    </button>
                    <button type="button" class={orderType === 'PICKUP SCHEDULED' ? activeClass : nonActiveClass} onClick={() => setOrderType('PICKUP SCHEDULED')}>
                        PICKUP & MANIFEST
                    </button>
                    <button type="button" class={orderType === 'IN TRANSIT' ? activeClass : nonActiveClass} onClick={() => setOrderType('IN TRANSIT')}>
                        IN TRANSIT
                    </button>
                    <button type="button" class={orderType === 'DELIVERED' ? activeClass : nonActiveClass} onClick={() => setOrderType('DELIVERED')}>
                        DELIVERED
                    </button>
                    <button type="button" class={orderType === 'RTO' ? activeClass : nonActiveClass} onClick={() => setOrderType('RTO')}>
                        RTO
                    </button>
                </div>

                <div class="relative overflow-x-auto shadow-md sm:rounded-lg mt-2 border border-[#003B49]">
                    <table class="w-full overflow-y-scroll text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <thead class="text-xs text-gray-800 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                            <tr>
                                <th scope="col" class="px-6 py-3 text-center">
                                    Action
                                </th>
                                <th scope="col" class="px-6 py-3 text-center">
                                    Created On
                                </th>
                                <th scope="col" class="px-6 py-3 text-center">
                                    Order ID/Status
                                </th>
                                <th scope="col" class="px-6 py-3 text-center">
                                    Product Details
                                </th>
                                <th scope="col" class="px-6 py-3 text-center">
                                    Payment
                                </th>
                                <th scope="col" class="px-6 py-3 text-center">
                                    Customer Details
                                </th>
                                <th scope="col" class="px-6 py-3 text-center">
                                    Payment
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                loading &&
                                <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td class="w-4 p-4" colSpan={8}>
                                        <div class="flex items-center text-center text-white">
                                            Loading Data
                                        </div>
                                    </td>
                                </tr>
                            }

                            {sortedOrders.length > 0 ? (
                                sortedOrders.map((item) => (
                                    <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                            <button id="defaultdropdown" onClick={() => handleActionButton(item.id)} data-dropdown-toggle={item.id} data-dropdown-placement="right" class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800" type="button">
                                                Action
                                                <svg class="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4" />
                                                </svg>
                                            </button>
                                            {
                                                actionId === item.id &&
                                                <div id={item.id} class="bg-white divide-y divide-gray-100 rounded-lg shadow-lg w-44 dark:bg-gray-700">
                                                    <ul class="py-2 text-sm text-[#003B49] " aria-labelledby="dropdownDefaultButton">
                                                        {
                                                            item.current_status === 'UNSHIPPED' &&
                                                            <>
                                                                <li>
                                                                    <a
                                                                        onClick={() =>
                                                                            fetchAvailableCourier({
                                                                                order_id: item.id,
                                                                                pickupCode: JSON.parse(item.returnLocation).pin_code,
                                                                                destCode: JSON.parse(item.data).billing_pincode,
                                                                                paymentMode: JSON.parse(item.data).payment_method === "Prepaid" ? "0" : "1",
                                                                                weight: JSON.parse(item.data).weight,
                                                                                length: JSON.parse(item.data).length,
                                                                                breadth: JSON.parse(item.data).breadth,
                                                                                height: JSON.parse(item.data).height,
                                                                                declaredCost: JSON.parse(item.data).sub_total,
                                                                                order_type: item.order_type,
                                                                                insaurance: JSON.parse(item.data).insaurance,
                                                                                orderItemData: JSON.parse(item.data).order_items,
                                                                                totalWeight: JSON.parse(item.data).totalWeight,
                                                                                fm_pickup: JSON.parse(item.data).fm_pickup

                                                                            })
                                                                        }
                                                                        className="block cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                                                                    >
                                                                        Ship Order
                                                                    </a>
                                                                </li>
                                                            </>
                                                        }
                                                        {
                                                            item.current_status === 'READY TO SHIP' &&
                                                            <>
                                                                <li>
                                                                    <a
                                                                        onClick={() =>
                                                                            requestShipmentPickup({
                                                                                documentId: item.id,
                                                                            })
                                                                        }
                                                                        className="block cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                                                                    >
                                                                        Request Pickup
                                                                    </a>
                                                                </li>
                                                                <li>
                                                                    <a
                                                                        onClick={() =>
                                                                            generateLabel({ waybill: item.awb_id, courier_id: item.courier_id })
                                                                        }
                                                                        className="block cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                                                                    >
                                                                        Print Label
                                                                    </a>
                                                                </li>
                                                            </>
                                                        }
                                                        {
                                                            item.current_status === 'PICKUP SCHEDULED' &&
                                                            <>
                                                                <li>
                                                                    <a
                                                                        onClick={() =>
                                                                            generateLabel({ waybill: item.awb_id, courier_id: item.courier_id })
                                                                        }
                                                                        className="block cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                                                                    >
                                                                        Print Label
                                                                    </a>
                                                                </li>
                                                                <li>
                                                                    <a
                                                                        onClick={() =>
                                                                            generateMenifest({
                                                                                order_id: item.id,
                                                                            })
                                                                        }
                                                                        className="block cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                                                                    >
                                                                        Print Menifest
                                                                    </a>
                                                                </li>
                                                            </>
                                                        }
                                                        {
                                                            item.current_status === 'MANIFESTED' &&
                                                            <>
                                                                <li>
                                                                    <a
                                                                        onClick={() =>
                                                                            generateLabel({ waybill: item.awb_id, courier_id: item.courier_id })
                                                                        }
                                                                        className="block cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                                                                    >
                                                                        Print Label
                                                                    </a>
                                                                </li>
                                                                <li>
                                                                    <a
                                                                        onClick={() =>
                                                                            generateMenifest({
                                                                                order_id: item.id,
                                                                            })
                                                                        }
                                                                        className="block cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                                                                    >
                                                                        Print Menifest
                                                                    </a>
                                                                </li>
                                                            </>
                                                        }
                                                        {
                                                            item.current_status === 'IN TRANSIT' &&
                                                            <>
                                                                <li>
                                                                    <a
                                                                        onClick={() =>
                                                                            generateLabel({ waybill: item.awb_id, courier_id: item.courier_id })
                                                                        }
                                                                        className="block cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                                                                    >
                                                                        Print Label
                                                                    </a>
                                                                </li>
                                                            </>
                                                        }
                                                        <li>
                                                            <a onClick={() => cloneOrder({ id: item.id, order_type: item.order_type })} class="block cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
                                                                Clone Order
                                                            </a>
                                                        </li>
                                                        {
                                                            item.current_status === 'RTO' ||
                                                                item.current_status === 'LOST' ||
                                                                item.current_status === 'CANCELLED' ||
                                                                item.current_status === 'DELIVERED' ? (
                                                                <></>
                                                            )
                                                                :
                                                                <li>
                                                                    <a
                                                                        onClick={() =>
                                                                            cancelOrder(item.id)
                                                                        }
                                                                        className="block cursor-pointer px-4 py-2 hover:bg-red-100 dark:hover:bg-red-600 dark:hover:text-white"
                                                                    >
                                                                        Cancel Order
                                                                    </a>
                                                                </li>
                                                        }
                                                        {
                                                            item.current_status === 'RTO' ||
                                                                item.current_status === 'IN TRANSIT' ||
                                                                item.current_status === 'LOST' ||
                                                                item.current_status === 'DELIVERED' ? (
                                                                <></>
                                                            )
                                                                :
                                                                <li>
                                                                    <a
                                                                        onClick={() =>
                                                                            deleteOrder(item.id)
                                                                        }
                                                                        className="block cursor-pointer px-4 py-2 hover:bg-red-100 dark:hover:bg-red-600 dark:hover:text-white"
                                                                    >
                                                                        Delete Order
                                                                    </a>
                                                                </li>
                                                        }
                                                    </ul>
                                                </div>
                                            }
                                        </th>
                                        <td class="px-6 py-4 text-[#003B49] text-center">
                                            {new Date(item.timestamp.seconds * 1000).toLocaleString()}
                                        </td>
                                        <td class="px-6 py-4 text-[#003B49] text-center">
                                            <span className='text-blue-700'>
                                                {item.id}
                                            </span>
                                            <br />
                                            {item.current_status === "CANCELLED" ?
                                                <span className='dark:bg-red-500 p-1 text-xs rounded'>
                                                    {item.current_status}
                                                </span>
                                                :
                                                <span className='dark:bg-green-500 p-1 text-xs rounded'>
                                                    {item.current_status}
                                                </span>
                                            }
                                        </td>
                                        <td class="px-6 py-4 text-[#003B49] text-center">
                                            {item.order_type === "B2B" ?
                                                JSON.parse(item.data).product_desc
                                                :
                                                JSON.parse(item.data)?.order_items?.map((orderItem) => (
                                                    <span key={orderItem.sku}>{orderItem.name}</span>
                                                ))
                                            }
                                        </td>
                                        <td class="px-6 py-4 text-[#003B49] text-center">
                                            {JSON.parse(item.data).payment_method}
                                        </td>
                                        <td class="px-6 py-4 text-[#003B49] text-center">
                                            {JSON.parse(item.data).billing_customer_name}{' '}
                                            {JSON.parse(item.data).billing_last_name}
                                            <br />
                                            {JSON.parse(item.data).billing_city},{' '}
                                            {JSON.parse(item.data).billing_pincode}
                                        </td>
                                        <td class="px-6 py-4 text-[#003B49] text-center">
                                            {JSON.parse(item.data).sub_total}
                                        </td>
                                    </tr>
                                ))
                            )
                                :
                                <p></p>
                            }
                        </tbody>
                    </table>
                </div>

                <nav class="bg-[#003B49] rounded-lg p-2 py-2 mt-2 flex items-center flex-column flex-wrap md:flex-row justify-between" aria-label="Table navigation">
                    <span class="text-sm font-normal text-white mb-4 md:mb-0 block w-full md:inline md:w-auto">
                        Showing <span class="font-semibold text-white">1-{ordersList.length < pageSize ? ordersList.length : pageSize}</span> of <span class="font-semibold text-white">{ordersList.length}</span>
                    </span>
                    <ul class="inline-flex -space-x-px rtl:space-x-reverse text-sm h-8">
                        <li>
                            <a onClick={handlePrevClick} id="prevButton" class="flex cursor-pointer items-center justify-center px-3 h-8 ms-0 leading-tight text-gray-500 bg-white text-[#003B49] border border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-[#003B49]">Previous</a>
                        </li>
                        <li>
                            <a onClick={handleNextClick} id="nextButton" class="flex cursor-pointer items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white text-[#003B49] border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-[#003B49] ">Next</a>
                        </li>
                    </ul>
                </nav>

                {
                    showModal &&
                    <div id="default-modal" tabindex="-1" class="flex overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }}>
                        <div class="relative p-4 w-full max-w-4xl max-h-full">
                            <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
                                <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                                        Available Courier Partners
                                    </h3>
                                    <button onClick={() => handleModalClose()} type="button" class="text-white bg-red-500 hover:bg-red-200 hover:text-red-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center" data-modal-hide="default-modal">
                                        <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                                        </svg>
                                        <span class="sr-only">Close modal</span>
                                    </button>
                                </div>
                                {
                                    availableCourier.length > 0 &&
                                    <div class="relative overflow-x-auto shadow-md sm:rounded-lg">
                                        <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                                            <thead class="text-xs text-[#003B49] uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                                <tr>
                                                    <th scope="col" class="px-6 py-3">
                                                        Courier Partner
                                                    </th>
                                                    <th scope="col" class="px-6 py-3">
                                                        Partner Name
                                                    </th>
                                                    <th scope="col" class="px-6 py-3">
                                                        EDT
                                                    </th>
                                                    <th scope="col" class="px-6 py-3">
                                                        Rate
                                                    </th>
                                                    <th scope="col" class="px-6 py-3">
                                                        Action
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {
                                                    availableCourier.map((item) => (
                                                        <tr key={item.id} class="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700">
                                                            <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                                                <img style={{ height: 30, padding: 2, backgroundColor: 'white' }} src={item?.logo} alt={item?.courier_name} />
                                                            </th>
                                                            <td class="px-6 py-4 text-[#003B49] font-medium">
                                                                {item.courier_name}
                                                            </td>
                                                            <td class="px-6 py-4 text-[#003B49] ">
                                                                {item?.estimated_delivery_days} days
                                                            </td>
                                                            <td class="px-6 py-4 text-[#003B49] ">
                                                                ₹ {item.rate}
                                                            </td>
                                                            <td class="px-6 py-4">
                                                                <a onClick={() => confirmShipping({ courier_id: item?.courier_company_id, courier_charges: item?.rate })} class="font-medium text-blue-600 dark:text-blue-500 hover:underline cursor-pointer">Ship now</a>
                                                            </td>
                                                        </tr>
                                                    ))
                                                }
                                            </tbody>
                                        </table>
                                    </div>
                                }
                                {
                                    loadingCouriers &&
                                    <div class="flex items-center p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                                        <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-black animate-spin" viewBox="0 0 100 101" fill="black" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                                        </svg>
                                        <span className='text-white'> Loading...</span>
                                    </div>
                                }
                            </div>
                        </div>

                    </div>
                }

                {
                    confirmingShipping &&
                    <div id="default-modal" tabindex="-1" sty class="flex overflow-y-auto bg-gray-800/80 overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
                        <div class="relative p-4 w-full max-w-4xl max-h-full">
                            <div class="flex relative bg-white justify-center rounded-lg shadow dark:bg-gray-700">
                                <div class="flex items-center p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                                    <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="black" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#000" />
                                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="#FFF" />
                                    </svg>
                                    <span className='text-black'> Loading...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                }
            </div >
        </div>
    )
}

export default Processorders