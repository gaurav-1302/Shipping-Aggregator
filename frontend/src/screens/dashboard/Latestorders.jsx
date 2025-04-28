// Import necessary modules and components from React, Firebase, and other utilities.
import React, { useEffect, useState } from 'react';
import { db } from '../../firebase.config';
import { query, getDocs, collection, where, } from 'firebase/firestore';
import OrderDetails from '../../common/OrderDetails';
import { toast } from 'react-toastify';

/**
 * @component Latestorders
 * @description This component displays the latest orders for the current user.
 * It fetches orders from Firestore, sorts them by timestamp, and displays the most recent ones.
 */
function Latestorders() {

    // State to store the current user's ID.
    const [userId, setUserId] = useState('');

    /**
     * @function useEffect - Fetch User ID
     * @description Fetches the current user's ID from local storage and updates the userId state.
     */
    useEffect(() => {
        const currentUser = localStorage.getItem('umaxshipuser');
        const jsonData = JSON.parse(currentUser);
        if (jsonData) {
            setUserId(jsonData.uid);
        }
    }, []);

    // State to store the list of orders and the filtered list for display.
    const [ordersList, setOrdersList] = useState([]);
    const [filteredList, setFilteredList] = useState([]);

    /**
     * @function fetchOrders
     * @description Fetches orders from Firestore for the current user.
     */
    const fetchOrders = async () => {
        try {
            // Query to fetch orders where the user_id matches the current user's ID.
            const q = query(collection(db, "orders"), where("user_id", "==", userId));
            const querySnapshot = await getDocs(q);
            let orders = [];
            querySnapshot.forEach((doc) => {
                const docData = doc.data();
                orders.push({ ...docData, id: doc.id });
            });
            setOrdersList(orders);
        } catch (error) {
            toast.error("Error while fetching orders")
            console.error("Error fetching orders:", error);
            // Handle errors appropriately (e.g., display error message to user)
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [userId])

    /**
     * @function useEffect - Sort and Filter Orders
     * @description Sorts the orders by timestamp in descending order and limits the list to the top 5 orders.
     */
    useEffect(() => {
        if (ordersList.length < 1) {
            return;
        }
        // Sort orders by timestamp in descending order.
        const sortedOrders = ordersList.slice().sort((item1, item2) => {
            const orderId1 = item1.timestamp
            const orderId2 = item2.timestamp
            return orderId2 - orderId1;
        });
        // Limit the list to the top 5 orders.
        const limitedOrders = sortedOrders.slice(0, 5);
        setFilteredList(limitedOrders);
    }, [ordersList]);

    // State to manage the selected order ID and the visibility of the order details modal.
    const [fetchOrderId, setFetchOrderId] = useState('');
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    /**
     * @function fetchOrderDetails
     * @description Sets the order ID and shows the order details modal.
     */
    const fetchOrderDetails = (order_id) => {
        setFetchOrderId(order_id)
        setShowDetailsModal(true);
    }

    /**
     * @function handleCloseModal
     * @description Closes the order details modal and resets the selected order ID.
     */
    const handleCloseModal = () => {
        setShowDetailsModal(false);
        setFetchOrderId('');
    };

    return (
        <div class="relative overflow-x-auto shadow-md sm:rounded-lg mt-5 col-span-2 border border-black">
            <div class="flex bg-[#003B49] justify-between px-3 py-2 bg-white align-center flex-row dark:bg-gray-900">
                <div>
                    <h2 className='text-lg font-bold text-black'>Latest Orders</h2>
                </div>
            </div >
            <table class="w-full text-sm text-left rtl:text-right">
                <thead class="text-xs text-white uppercase bg-[#006279]">
                    <tr>
                        <th scope="col" class="px-6 py-3 text-center">
                            ORDER ID
                        </th>
                        <th scope="col" class="px-6 py-3 text-center">
                            PRODUCT DETAILS
                        </th>
                        <th scope="col" class="px-6 py-3 text-center">
                            CREATED ON
                        </th>
                        <th scope="col" class="px-6 py-3 text-center">
                            STATUS
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {
                        filteredList.length > 0 &&
                        filteredList.map((item) => (
                            <tr key={item.id} class="odd:bg-gray-100 even:bg-white border-b">
                                <td onClick={() => fetchOrderDetails(item.id)} class="px-6 py-4 text-white text-center cursor-pointer">
                                    <span className='text-blue-500'>
                                        {item.id}
                                        <br />
                                        {item?.awb_id ? item.awb_id : ''}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-black text-center">
                                    <span className='text-s text-black'>
                                        {item.order_type === "B2B" ?
                                            JSON.parse(item.data).product_desc
                                            :
                                            JSON.parse(item.data)?.order_items?.map((orderItem) => (
                                                <span key={orderItem.sku}>{orderItem.name}</span>
                                            ))
                                        }
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-black text-center">
                                    {new Date(item.timestamp.seconds * 1000).toLocaleString()}
                                </td>
                                <td class="px-6 py-4 text-black text-center">
                                    <span className='dark:bg-yellow-500 p-1 rounded'>
                                        {item.current_status}
                                    </span>
                                </td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>

            {
                showDetailsModal &&
                <OrderDetails order_id={fetchOrderId} onClose={handleCloseModal} />
            }
        </div >
    )
}
// Export the Latestorders component for use in other parts of the application.
export default Latestorders