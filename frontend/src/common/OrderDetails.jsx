import React, { useState, useEffect } from 'react';
import { doc, getDoc } from "firebase/firestore";
import { db } from '../firebase.config';
/**
 * OrderDetails Component
 *
 * This component displays the details of a specific order fetched from Firestore.
 * It takes an order_id to fetch the order details and an onClose function to handle closing the modal.
 *
 * @param {object} props - The component props.
 * @param {string} props.order_id - The ID of the order to fetch details for.
 * @param {function} props.onClose - A function to call when the modal is closed.
 */
function OrderDetails({ order_id, onClose }) {

    // Function to handle closing the modal
    const handleClose = () => {
        onClose();
    };

    // State to store the order details
    const [orderDetails, setOrdersDetails] = useState({})
    // State to track the loading status of the order details
    const [loading, setLoading] = useState(true);

    /**
     * Fetches the order details from Firestore based on the provided order_id.
     * Updates the orderDetails state with the fetched data and sets loading to false.
     */
    const fetchOrderDetails = async () => {
        if (!order_id) { return };
        setLoading(true);
        const docRef = doc(db, "orders", order_id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const docData = docSnap.data();
            setOrdersDetails(docData);
        }
        setLoading(false); // Set loading to false after fetching data
    }

    // Fetch order details when the order_id changes
    useEffect(() => {
        fetchOrderDetails();
    }, [order_id])

    return (
        <div id="default-modal" class="flex overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full" style={{ backgroundColor :'rgba(0,0,0,0.7)'}}>
            <div class="relative p-4 w-full max-w-4xl max-h-full">
                <div class="relative bg-white rounded-lg border border-dashed border-[#003B49] shadow">
                    {/* Modal Header */}
                    <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                            Order Details
                        </h3>
                        <button onClick={handleClose} type="button" class="text-white bg-red-500 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center" data-modal-hide="default-modal">
                            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                {/* Close icon */}
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                            </svg>
                            <span class="sr-only">Close modal</span>
                        </button>
                    </div>

                    {
                        // Show loading indicator if data is being fetched
                        loading ?
                            <div class="p-4 md:p-5 space-y-4">
                                <div class="px-3 py-1 text-xs font-medium leading-none text-center text-blue-800 bg-blue-200 rounded-full animate-pulse dark:bg-blue-900 dark:text-blue-200">loading...</div>
                            </div>
                            :
                            <div class="p-4 md:p-5 space-y-4">
                                {/* Order Details Grid */}
                                <div class="grid grid-cols-3 md:grid-cols-4 gap-4">
                                    <p class="text-base leading-relaxed text-[#003B49] dark:text-white text-center">
                                        <strong className='dark:text-gray-400'>Order ID</strong> <br /> {orderDetails.order_id}
                                    </p>
                                    <p class="text-base leading-relaxed text-[#003B49] dark:text-white text-center">
                                        <strong className='dark:text-gray-400'>Order Date</strong> <br /> {new Date(orderDetails.timestamp.seconds * 1000).toLocaleString()}

                                    </p>
                                    <p class="text-base leading-relaxed text-[#003B49] dark:text-white text-center">
                                        <strong className='dark:text-gray-400'>AWB ID</strong> <br /> {orderDetails.awb_id ? orderDetails.awb_id : ""}
                                    </p>
                                    <p class="text-base leading-relaxed text-[#003B49] dark:text-white text-center">
                                        <strong className='dark:text-gray-400'>Courier Charges</strong> <br /> {orderDetails.courier_charges ? orderDetails.courier_charges.toFixed(2) : ""}
                                    </p>
                                    <p class="text-base leading-relaxed text-[#003B49] dark:text-white text-center">
                                        <strong className='dark:text-gray-400'>Current Status</strong> <br /> {orderDetails.current_status}
                                    </p>
                                    <p class="text-base leading-relaxed text-[#003B49] dark:text-white text-center">
                                        <strong className='dark:text-gray-400'>Customer Name</strong> <br /> {JSON.parse(orderDetails.data).billing_customer_name} {JSON.parse(orderDetails.data).billing_last_name}
                                    </p>
                                    <p class="text-base leading-relaxed text-[#003B49] dark:text-white text-center">
                                        <strong className='dark:text-gray-400'>Customer Phone</strong> <br /> {JSON.parse(orderDetails.data).billing_phone}
                                    </p>
                                    <p class="text-base leading-relaxed text-[#003B49] dark:text-white text-center">
                                        <strong className='dark:text-gray-400'>Customer Email</strong> <br /> {JSON.parse(orderDetails.data).billing_email}
                                    </p>
                                    <p class="text-base leading-relaxed text-[#003B49] dark:text-white text-center">
                                        <strong className='dark:text-gray-400'>Items</strong> <br /> {orderDetails.order_type === "B2B" ?
                                            JSON.parse(orderDetails.data).product_desc
                                            :
                                            JSON.parse(orderDetails.data)?.order_items?.map((orderItem) => (
                                                <span key={orderItem.sku}>{orderItem.name}</span>
                                            ))
                                        }
                                    </p>
                                    <p class="text-base leading-relaxed text-[#003B49] dark:text-white text-center">
                                        <strong className='dark:text-gray-400'>Dimensions</strong> <br /> {JSON.parse(orderDetails.data).length} X {JSON.parse(orderDetails.data).breadth} X {JSON.parse(orderDetails.data).height} cm
                                    </p>
                                    <p class="text-base leading-relaxed text-[#003B49] dark:text-white text-center">
                                        <strong className='dark:text-gray-400'>Total weight</strong> <br /> {
                                            orderDetails.order_type === "B2B" ?
                                                JSON.parse(orderDetails.data).totalWeight
                                                :
                                                JSON.parse(orderDetails.data).weight
                                        } KG
                                    </p>
                                    <p class="text-base leading-relaxed text-[#003B49] dark:text-white text-center">
                                        <strong className='dark:text-gray-400'>Order value</strong> <br /> {JSON.parse(orderDetails.data).sub_total}
                                    </p>
                                    <p class="text-base leading-relaxed text-[#003B49] dark:text-white text-center">
                                        <strong className='dark:text-gray-400'>Order type</strong> <br /> {orderDetails.order_type ? "B2B" : "B2C"}
                                    </p>
                                </div>
                                <p class="text-base leading-relaxed text-[#003B49] dark:text-white">
                                    <strong className='dark:text-gray-400'>Customer Address</strong>
                                    <br />
                                    {JSON.parse(orderDetails.data).billing_address}, { }
                                    {JSON.parse(orderDetails.data).billing_city}, { }
                                    {JSON.parse(orderDetails.data).billing_state}, { }
                                    {JSON.parse(orderDetails.data).billing_pincode}
                                </p>
                                <p class="text-base leading-relaxed text-[#003B49] dark:text-white">
                                    <strong className='dark:text-gray-400'>Pickup Address</strong>
                                    <br />
                                    {JSON.parse(orderDetails.returnLocation).address}, { }
                                    {JSON.parse(orderDetails.returnLocation).address_2}, { }
                                    {JSON.parse(orderDetails.returnLocation).city}, { }
                                    {JSON.parse(orderDetails.returnLocation).state}, { }
                                    {JSON.parse(orderDetails.returnLocation).pin_code}
                                </p>
                            </div>
                    }
                    {/* Modal Footer */}

                    <div class="flex items-center p-4 md:p-5 border-t border-gray-200 rounded-b dark:border-gray-600">
                        <button onClick={handleClose} data-modal-hide="default-modal" type="button" class="py-2.5 px-5 ms-3 text-sm font-medium focus:outline-none text-white bg-red-500 rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100">Close</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OrderDetails