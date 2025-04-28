import React, { useEffect, useState } from 'react';
import Navbar from '../../common/Navbar';
import { LuBox } from "react-icons/lu";
import { FaFileDownload } from "react-icons/fa";
import { IoCashOutline } from "react-icons/io5";
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { db } from '../../firebase.config';
import { query, getDocs, collection, where } from 'firebase/firestore';

// Environment variable for the download API URL (if you have one)
const DOWNLOAD_TRANSACTIONS_API_URL = process.env.REACT_APP_DOWNLOAD_TRANSACTIONS_API_URL;

/**
 * Transactions Component
 * This component displays a list of transactions for the logged-in user.
 * It allows filtering by date range, searching by transaction details,
 * and downloading transaction data.
 */
function Transactions() {
    // Hook for programmatic navigation
    const navigate = useNavigate();

    // State to store the user ID
    const [userId, setUserId] = useState('');

    /**
     * useEffect hook to fetch and set the user ID from local storage.
     * This runs once when the component mounts.
     */
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
    }, []);

    /**
     * useEffect hook to redirect to the login page if the user is not authenticated.
     * This runs once when the component mounts.
     */
    useEffect(() => {
        const user = window.localStorage.getItem('umaxshipuser');
        if (user === null || user === undefined || user === '') {
            navigate('/login/');
        }
    }, []);

    // State to store the list of transactions
    const [transactions, setTransactions] = useState([]);

    /**
     * fetchTransactions function
     * Fetches transactions from Firestore based on the current user ID.
     * Updates the transactions state with the fetched transactions.
     */
    const fetchTransactions = async () => {
        try {
            // Query to fetch transactions for the current user
            const q = query(collection(db, "transactions"), where("user_id", "==", userId));
            const querySnapshot = await getDocs(q);
            let orders = [];
            querySnapshot.forEach((doc) => {
                const docData = doc.data();
                orders.push({ ...docData, id: doc.id });
            });
            setTransactions(orders);
        } catch (error) {
            console.error("Error fetching orders:", error);
            // Handle errors appropriately (e.g., display an error message to the user)
        }
    };

    /**
     * useEffect hook to fetch transactions when the user ID changes.
     */
    useEffect(() => {
        fetchTransactions();
    }, [userId]);

    // State to manage search queries and date range filter
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filteredList, setFilteredList] = useState([]);

    /**
     * useEffect hook to sort the transactions list by timestamp in descending order.
     */
    useEffect(() => {
        if (transactions.length > 0) {
            transactions.sort((item1, item2) => {
                // Convert Firestore timestamp to milliseconds for comparison
                const orderId1 = item1.created_at.seconds * 1000;
                const orderId2 = item2.created_at.seconds * 1000;
                // Descending order comparison
                return orderId2 - orderId1;
            });
        }
    }, [transactions]);

    // State to manage pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [paginatedTransactions, setPaginatedTransactions] = useState([]);

    /**
     * useEffect hook to sort and paginate the filtered transactions list.
     * This runs when the filtered list, current page, or page size changes.
     * It sorts the filtered list in descending order by timestamp and then
     * paginates the sorted list based on the current page and page size.
     * The paginated transactions are stored in the paginatedTransactions state.
     */
    useEffect(() => {
        const sortAndPaginate = () => {
            const sorted = filteredList.slice().sort((a, b) => b.created_at.seconds * 1000 - a.created_at.seconds * 1000);
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, sorted.length);
            setPaginatedTransactions(sorted.slice(startIndex, endIndex));
        };
        sortAndPaginate();
    }, [filteredList, currentPage, pageSize]);

    /**
     * useEffect hook to filter transactions based on search queries and date range.
     * Updates the filteredList state with the filtered transactions.
     * This runs when the transactions list, search query, start date, or end date changes.
     * It filters the transactions based on the search query and date range.
     */
    useEffect(() => {
        const filteredOrders = transactions.filter((item) => {
            // Filter by search query (if applicable)
            if (searchQuery && !item.transaction_details.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }

            // Filter by date range (if both start and end dates are selected)
            if (startDate && endDate) {
                const itemMoment = moment(item.created_at?.toDate());

                // Ensure itemMoment is valid before comparison
                if (!itemMoment.isValid()) {
                    return false; // Exclude items with missing or invalid timestamps
                }

                const startDateMoment = moment(startDate, 'YYYY-MM-DD');
                const endDateMoment = moment(endDate, 'YYYY-MM-DD');

                // Ensure parsed moments are valid before comparison
                if (!startDateMoment.isValid() || !endDateMoment.isValid()) {
                    return false; // Exclude if parsing fails
                }

                return (
                    itemMoment >= startDateMoment && itemMoment <= endDateMoment
                );
            }

            // No date range filter or search query applied, return all items
            return true;
        });

        setFilteredList(filteredOrders);
    }, [transactions, searchQuery, startDate, endDate]);

    // State to store the total recharge amount
    const [totalRechargeAmount, setTotalRechargeAmount] = useState();

    /**
     * useEffect hook to calculate the total recharge amount.
     * This runs when the transactions list changes.
     * It iterates through the transactions and sums up the amounts for
     * transactions with the description "Payment received for Wallet".
     */
    useEffect(() => {
        if (transactions.length < 1) {
            return;
        }

        function getTotalRechargeAmount(transactions) {
            let totalRecharge = 0;
            for (const transaction of transactions) {
                if (transaction.transaction_details === "Payment received for Wallet") {
                    totalRecharge += transaction.amount;
                    console.log(transaction.amount)
                }
            }
            setTotalRechargeAmount(totalRecharge);
        }

        getTotalRechargeAmount(transactions);
    }, [transactions]);

    /**
     * handlePrevClick function
     * Decrements the current page number if it's greater than 1.
     */
    const handlePrevClick = () => {
        if (currentPage > 1) {
            setCurrentPage((prevPage) => prevPage - 1);
        }
    };

    /**
     * handleNextClick function
     * Increments the current page number if it's less than the total number of pages.
     */
    const handleNextClick = () => {
        if (currentPage < Math.ceil(transactions.length / pageSize)) {
            setCurrentPage((nextPage) => nextPage + 1);
        }
    };

    const handleDownloadTransactions = () => {
        if (DOWNLOAD_TRANSACTIONS_API_URL) {
            window.open(DOWNLOAD_TRANSACTIONS_API_URL, '_blank');
        }
    }

    return (
        <div>
            <Navbar />

            <div className='bg-white rounded flex w-full mt-5 justify-between border border-[#003B49] px-2 py-3'>

                <form class="flex items-center max-w-sm mx-full">
                    <label for="simple-search" class="sr-only">Search</label>
                    <div class="relative w-full">
                        <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                            <LuBox size={18} />
                        </div>
                        <input onChange={(e) => setSearchQuery(e.target.value)} type="text" id="simple-search" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder="Search by AWB, Purpose..." required />
                    </div>
                    <button type="submit" class="p-2.5 ms-2 text-sm font-medium text-white bg-blue-700 rounded-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                        <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                        </svg>
                        <span class="sr-only">Search</span>
                    </button>
                </form>

                <div date-rangepicker class="flex items-center">
                    <span class="mx-4 text-gray-500">from</span>
                    <div class="relative">
                        <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                            <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                            </svg>
                        </div>
                        <input onChange={(e) => setStartDate(e.target.value)} type="date" name="start" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder="Select date start" />
                    </div>
                    <span class="mx-4 text-gray-500">to</span>
                    <div class="relative">
                        <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                            <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                            </svg>
                        </div>
                        <input onChange={(e) => setEndDate(e.target.value)} name="end" type="date" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder="Select date end" />
                    </div>
                </div>

                <button onClick={handleDownloadTransactions} type="button" class="text-white bg-[#050708] hover:bg-[#050708]/90 focus:ring-4 focus:outline-none focus:ring-[#050708]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#050708]/50 dark:hover:bg-[#050708]/30 me-2">
                    <FaFileDownload className='mr-2' />
                    Download orders
                </button>

            </div>

            <div class="flex px-5 py-3 mt-2 text-gray-700 rounded-lg bg-gray-50 border border-[#003B49]" aria-label="Breadcrumb">
                <ol class="inline-flex items-center space-x-1 md:space-x-2">
                    <li class="inline-flex items-center">
                        <a href="#" class="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white">
                            <IoCashOutline className='mr-2' />
                            Your cash flow
                        </a>
                    </li>
                    <li>
                        <div class="flex items-center">
                            <svg class="rtl:rotate-180 block w-3 h-3 mx-1 text-gray-400 " aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 9 4-4-4-4" />
                            </svg>
                            <span class="ms-1 text-sm font-medium text-[#003B49] md:ms-2">
                                Total Recharge Amount - ₹ {totalRechargeAmount}
                            </span>
                        </div>
                    </li>
                </ol>
            </div>

            <div class="mt-2 relative overflow-x-auto shadow-md sm:rounded-lg border border-[#003B49]">
                <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                        <tr>
                            <th scope="col" class="px-6 py-3">
                                Date &amp; Time
                            </th>
                            <th scope="col" class="px-6 py-3">
                                Amount(Rs.)
                            </th>
                            <th scope="col" class="px-6 py-3">
                                Transaction ID
                            </th>
                            <th scope="col" class="px-6 py-3">
                                Transaction Details
                            </th>
                            <th scope="col" class="px-6 py-3">
                                Type
                            </th>
                            <th scope="col" class="px-6 py-3">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            paginatedTransactions.map((item, index) => (
                                <tr class="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700">
                                    <th scope="row" class="px-6 py-4 font-medium text-[#003B49] whitespace-nowrap">
                                        {new Date(item.created_at.seconds * 1000).toLocaleString()}
                                    </th>
                                    <td class="px-6 py-4 text-[#003B49]">
                                        {(item.amount).toFixed(2)}
                                    </td>
                                    <td class="px-6 py-4 text-[#003B49]">
                                        {item.id}
                                    </td>
                                    <td class="px-6 py-4 text-[#003B49]">
                                        {item.transaction_details}
                                    </td>
                                    <td class="px-6 py-4 text-[#003B49]">
                                        {item.transaction_type}
                                    </td>
                                    <td class="px-6 py-4 text-[#003B49]">
                                        {item.status}
                                    </td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>

            <nav class="bg-[#003B49] rounded-lg p-2 py-2 mt-2 flex items-center flex-column flex-wrap md:flex-row justify-between" aria-label="Table navigation">
                <span class="text-sm font-normal text-white mb-4 md:mb-0 block w-full md:inline md:w-auto">
                    Showing <span class="font-semibold text-white">1-{transactions.length < pageSize ? transactions.length : pageSize}</span> of <span class="font-semibold text-white">{transactions.length}</span>
                </span> 
                <ul class="inline-flex -space-x-px rtl:space-x-reverse text-sm h-8">
                    <li>
                        <a onClick={handlePrevClick} id="prevButton" class="flex cursor-pointer items-center justify-center px-3 h-8 ms-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">Previous</a>
                    </li>
                    <li>
                        <a onClick={handleNextClick} id="nextButton" class="flex cursor-pointer items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">Next</a>
                    </li>
                </ul>
            </nav>

        </div>
    )
}
export default Transactions;