import React, { useEffect, useState } from 'react';
import Navbar from "../../common/Navbar";
import { IoSearchSharp } from "react-icons/io5";
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { db } from '../../firebase.config';
import { query, getDocs, collection, where, } from 'firebase/firestore';
import OrderDetails from '../../common/OrderDetails';
/**
 * Reports Component
 * This component displays a list of orders with various filtering and sorting options.
 */
function Reports() {

    // State to store the user ID
    const [userId, setUserId] = useState('');

    /**
     * useEffect hook to fetch and set the user ID from local storage.
     * This runs once when the component mounts.
     */
    useEffect(() => {
        const currentUser = localStorage.getItem('umaxshipuser');
        const jsonData = JSON.parse(currentUser); // Parse the user data from local storage
        // If user data exists, set the user ID
        if (jsonData) {
            setUserId(jsonData.uid);
        }
    }, [])

    const navigate = useNavigate();

    /**
     * useEffect hook to redirect to the login page if the user is not authenticated.
     * This runs once when the component mounts.
     */
    useEffect(() => {
        const user = window.localStorage.getItem('umaxshipuser');
        if (user === null || user === undefined || user === '') {
            navigate('/login/')
        }
    }, [])

    // CSS classes for active and non-active buttons
    const nonActiveClass = "px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-[#003B49] border-dashed rounded-lg hover:text-blue-700 focus:z-10";
    const activeClass = "bg-blue-700 px-4 py-2 text-sm font-medium text-white border border-[#003B49] border-dashed rounded-lg focus:z-10 ";

    // State to manage the order type filter
    const [orderType, setOrderType] = useState('ALL');

    // State to store the list of orders and filtered list
    const [ordersList, setOrdersList] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    // State to manage search queries
    const [searchQuery, setSearchQuery] = useState('');
    const [phoneQuery, setPhoneQuery] = useState('');
    const [awbQuery, setAwbQuery] = useState('');
    // State to manage date range filter
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            /**
             * Fetches orders from Firestore based on the current user ID and order type filter.
             * Updates the ordersList state with the fetched orders.
             */
            setLoading(true);
            var q = query(collection(db, "orders"), where("user_id", "==", userId))
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
            } else if (orderType === "CANCELLED") {
                q = query(collection(db, "orders"), where("user_id", "==", userId), where("current_status", "==", "CANCELLED"));
            }

            const querySnapshot = await getDocs(q);

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

    /**
     * useEffect hook to fetch orders when the user ID or order type changes.
     */
    useEffect(() => {
        fetchOrders();
    }, [userId, orderType])

    /**
     * useEffect hook to sort the orders list by timestamp in descending order.
     */
    useEffect(() => {
        if (ordersList.length < 1) { // Check if ordersList is empty
            return;
        }
        ordersList.sort((item1, item2) => {
            const orderId1 = item1.timestamp;
            const orderId2 = item2.timestamp;
            // Descending order comparison
            return orderId2 - orderId1;
        });
    }, [ordersList])

    /**
     * useEffect hook to update the filtered list when the orders list changes.
     */
    useEffect(() => {
        setFilteredList(ordersList);
    }, [ordersList])

    // State to manage pagination
    const [currentPage, setCurrentPage] = useState(1);
    /**
     * State to manage the number of items per page.
     */
    const [pageSize, setPageSize] = useState(8);
    const [sortedOrders, setSortedOrders] = useState([]);

    useEffect(() => {
        const sortAndPaginate = () => {
            const sorted = filteredList.slice().sort((a, b) => b.timestamp - a.timestamp); // Sort descending
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, sorted.length);
            setSortedOrders(sorted.slice(startIndex, endIndex));
        };
        sortAndPaginate();
    }, [filteredList, currentPage, pageSize]);

    /**
     * useEffect hook to filter orders based on search queries and date range.
     * Updates the filteredList state with the filtered orders.
     */
    useEffect(() => {
        const filteredOrders = ordersList.filter((item) => {
            if (searchQuery) {
                return item.id.toLowerCase().includes(searchQuery.toLowerCase().replace(/\s/g, ""));
            }
            if (awbQuery) {
                return item.awb_id?.includes(awbQuery.toLowerCase().replace(/\s/g, ""));
            }
            if (phoneQuery) {
                const jsonData = JSON.parse(item.data);
                return jsonData.billing_phone.includes(phoneQuery.toLowerCase());
            }
            if (startDate && endDate) {
                const itemMoment = moment(item.timestamp?.toDate());
                if (!itemMoment.isValid()) return false;
                const startDateMoment = moment(startDate, 'YYYY-MM-DD');
                const endDateMoment = moment(endDate, 'YYYY-MM-DD');
                if (!startDateMoment.isValid() || !endDateMoment.isValid()) return false;
                return itemMoment >= startDateMoment && itemMoment <= endDateMoment;
            }
            return true;
        });
    
        setFilteredList(filteredOrders); // Update the filtered list
    }, [ordersList, searchQuery, awbQuery, phoneQuery, startDate, endDate]);

    /**
     * Event handler for search query input change.
     */
    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
        setAwbQuery('');  // Clear AWB query when searching by Order ID
    };
    /**
     * Event handler for AWB query input change.
     */
    const handleAwbChange = (event) => {
        setAwbQuery(event.target.value);
        setSearchQuery('');  // Clear Order ID query when searching by AWB ID.
    };
    
    


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

    // State to manage order details modal
    const [fetchOrderId, setFetchOrderId] = useState('');
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    /**
     * Function to fetch order details and show the order details modal.
     */
    const fetchOrderDetails = (order_id) => {
        setFetchOrderId(order_id)
        /**
         * Show the order details modal.
         */
        setShowDetailsModal(true);
    }

    const handleCloseModal = () => {
        setShowDetailsModal(false);
        setFetchOrderId('');
    };

    return (
        <div>
            {/* Navbar component */}
            <Navbar />

            <div className='flex w-full mt-5 justify-between bg-[#003B49] rounded-lg p-2'>

                <form class="flex items-center max-w-sm mx-full">
                    <label for="simple-search" class="sr-only">Search</label>
                    <div class="relative w-full">
                        <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                            <IoSearchSharp size={18} color='blue' />
                        </div>
                        <input type="text" id="simple-search" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder="Search by Order ID" value={searchQuery} onChange={handleSearchChange} required />
                    </div>
                </form>

                <form class="flex items-center max-w-sm mx-full">
                    <label for="simple-search" class="sr-only">Search</label>
                    <div class="relative w-full">
                        <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                            <IoSearchSharp size={18} color='blue' />
                        </div>
                        <input type="number" id="simple-search" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder="Search by AWB ID" value={awbQuery} onChange={e => setAwbQuery(e.target.value)} required />
                    </div>
                </form>

                <form class="flex items-center max-w-sm mx-full">
                    <label for="simple-search" class="sr-only">Search</label>
                    <div class="relative w-full">
                        <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                            <IoSearchSharp size={18} color='blue' />
                        </div>
                        <input type="number" id="simple-search" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder="Search by Customer Phone" value={phoneQuery} onChange={e => setPhoneQuery(e.target.value)} required />
                    </div>
                </form>

                <div date-rangepicker class="flex items-center">
                    <span class="mx-4 text-white">from</span>
                    <div class="relative">
                        <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                            <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                            </svg>
                        </div>
                        <input type="date" name="start" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder="Select date start" onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <span class="mx-4 text-white">to</span>
                    <div class="relative">
                        <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                            <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                            </svg>
                        </div>
                        <input name="end" type="date" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder="Select date end" onChange={e => setEndDate(e.target.value)} />
                    </div>
                </div>
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
                <button type="button" class={orderType === 'CANCELLED' ? activeClass : nonActiveClass} onClick={() => setOrderType('CANCELLED')}>
                    CANCELLED
                </button>
            </div>

            <div class="relative overflow-x-auto shadow-md sm:rounded-lg mt-2 border border-[#003B49]">
                <table class="w-full overflow-y-scroll text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                    <thead class="text-xs text-gray-800 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                        <tr>
                            <th scope="col" class="px-6 py-3 text-center">
                                Order ID
                            </th>
                            <th scope="col" class="px-6 py-3 text-center">
                                Product Details
                            </th>
                            <th scope="col" class="px-6 py-3 text-center">
                                Order Value
                            </th>
                            <th scope="col" class="px-6 py-3 text-center">
                                Customer Details
                            </th>
                            <th scope="col" class="px-6 py-3 text-center">
                                Billable Weight
                            </th>
                            <th scope="col" class="px-6 py-3 text-center">
                                Status
                            </th>
                        </tr>
                    </thead>
                    {
                        loading &&
                        <tr class="bg-white border-b">
                            <td class="w-4 p-4" colSpan={8}>
                                <div class="flex items-center text-center text-black">
                                    Loading Data...
                                </div>
                            </td>
                        </tr>
                        // Map through the sorted orders and render each order row
                    }
                    <tbody>
                        {
                            sortedOrders.map((item) => (
                                <tr key={item.id} class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td onClick={() => fetchOrderDetails(item.id)} class="px-6 py-4 text-blue-500 cursor-pointer">
                                        ID - {item.id}
                                        <br />
                                        <span className='text-blue-500'>
                                            AWB - {item?.awb_id ? item.awb_id : ''}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-white text-center">
                                        <span className='text-s text-[#003B49]'>
                                            {item.order_type === "B2B" ?
                                                JSON.parse(item.data).product_desc
                                                :
                                                JSON.parse(item.data)?.order_items?.map((orderItem) => (
                                                    <span key={orderItem.sku}>{orderItem.name} - {orderItem.units} units</span>
                                                ))
                                            }
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-[#003B49] text-center">
                                        {JSON.parse(item.data).sub_total}
                                        <br />
                                        {JSON.parse(item.data).payment_method}
                                    </td>
                                    <td class="px-6 py-4 text-[#003B49] text-center">
                                        {JSON.parse(item.data).billing_customer_name} {JSON.parse(item.data).billing_last_name}
                                        <br />
                                        {JSON.parse(item.data).billing_phone}
                                    </td>
                                    <td class="px-6 py-4 text-[#003B49] text-center">
                                        {JSON.parse(item.data).weight} KG
                                    </td>
                                    <td class="px-6 py-4 text-[#003B49] text-center">
                                        {item.current_status === "DELIVERED" ?
                                            <span className='bg-green-500 p-1 rounded text-white'>
                                                {item.current_status}
                                            </span>
                                            : item.current_status === "CANCELLED" ?
                                                <span className='bg-red-500 p-1 rounded text-white'>
                                                    {item.current_status}
                                                </span>
                                                :
                                                <span className='bg-yellow-300 p-1 rounded text-white'>
                                                    {item.current_status}
                                                </span>
                                        }
                                    </td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>

            {
                showDetailsModal &&
                <OrderDetails order_id={fetchOrderId} onClose={handleCloseModal} />
            }

            {/* Pagination controls */}
            <nav class="bg-[#003B49] rounded-lg p-2 py-2 mt-2 flex items-center flex-column flex-wrap md:flex-row justify-between" aria-label="Table navigation">
                <span class="text-sm font-normal text-white mb-4 md:mb-0 block w-full md:inline md:w-auto">
                    Showing <span class="font-semibold text-white">1-{ordersList.length < pageSize ? ordersList.length : pageSize}</span> of <span class="font-semibold text-white">{ordersList.length}</span>
                </span>
                <ul class="inline-flex -space-x-px rtl:space-x-reverse text-sm h-8">
                    <li>
                        <a onClick={handlePrevClick} id="prevButton" class="flex cursor-pointer items-center justify-center px-3 h-8 ms-0 leading-tight text-black bg-white border border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">Previous</a>
                    </li>
                    <li>
                        <a onClick={handleNextClick} id="nextButton" class="flex cursor-pointer items-center justify-center px-3 h-8 leading-tight text-black bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">Next</a>
                    </li>
                </ul>
            </nav>

        </div >
    )
}

// Export the Reports component
export default Reports