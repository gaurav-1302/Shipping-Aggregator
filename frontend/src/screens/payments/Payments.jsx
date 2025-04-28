import React, { useEffect, useState } from 'react'
import Navbar from '../../common/Navbar'
import { LuBox } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { db } from '../../firebase.config';
import { query, getDocs, collection, where } from 'firebase/firestore';

// Environment variables (replace with actual environment variable access)
const API_KEY = process.env.REACT_APP_API_KEY; // Example: Accessing API key from environment

function Payments() {
    const navigate = useNavigate();

    // State variables for managing user data, transactions, search, and pagination
    const [userId, setUserId] = useState('');
    
    // State variables for managing transactions, search, and pagination
    const [transactions, setTransactions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filteredList, setFilteredList] = useState([]);

    useEffect(() => {
        // Retrieve user data from local storage on component mount
        const currentUser = localStorage.getItem('umaxshipuser');
        const jsonData = JSON.parse(currentUser);
        if (jsonData) {
            setUserId(jsonData.uid);
        }
    }, []);

    useEffect(() => {
        // Redirect to login if user data is not found in local storage
        const user = window.localStorage.getItem('umaxshipuser');
        if (!user) {
            navigate('/login/');
        }
    }, [navigate]);

    const fetchTransactions = async () => {
        // Fetch transactions from Firestore for the current user
        if (!userId) return;

        try {
            const q = query(collection(db, 'remittances'), where('user_id', '==', userId));
            const querySnapshot = await getDocs(q);
            let orders = [];
            querySnapshot.forEach((doc) => {
                const docData = doc.data();
                // Add document ID to the data for easier reference
                orders.push({ ...docData, id: doc.id });

            });
            setTransactions(orders);
        } catch (error) {
            console.error("Error fetching orders:", error);
        }
    };

    useEffect(() => {
        // Fetch transactions when the userId changes
        if (userId) {
            fetchTransactions();
        }
    }, [userId]);
    useEffect(() => {
        if (transactions.length > 0) {
            // Sort transactions by timestamp in descending order
            transactions.sort((item1, item2) => {
                const orderId1 = item1.timestamp.seconds * 1000;
                const orderId2 = item2.timestamp.seconds * 1000;
                return orderId2 - orderId1;
            });
        }
    }, [transactions]);

    // State variables for pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [paginatedTransactions, setPaginatedTransactions] = useState([]);

    useEffect(() => {
        // Sort and paginate transactions based on current page and page size
        const sortAndPaginate = () => {
            const sorted = transactions.slice().sort((a, b) => b.timestamp.seconds * 1000 - a.timestamp.seconds * 1000);
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, sorted.length);
            setPaginatedTransactions(sorted.slice(startIndex, endIndex));
        };
        sortAndPaginate();
    }, [filteredList, currentPage, pageSize]);

    const handlePrevClick = () => {
        // Go to the previous page if not on the first page
        if (currentPage > 1) {
            setCurrentPage(prevPage => prevPage - 1);
        }
    };

    const handleNextClick = () => {
        // Go to the next page if not on the last page
        if (currentPage < Math.ceil(transactions.length / pageSize)) {
            setCurrentPage(nextPage => nextPage + 1);
        }
    }

    useEffect(() => {
        const filteredOrders = transactions.filter((item) => {
            // Filter by search query
            if (searchQuery && !item.order_id.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }

            if (startDate && endDate) {

                const itemMoment = moment(item.timestamp?.toDate());

                if (!itemMoment.isValid()) {
                    return false;
                }

                const startDateMoment = moment(startDate, 'YYYY-MM-DD');
                const endDateMoment = moment(endDate, 'YYYY-MM-DD');

                if (!startDateMoment.isValid() || !endDateMoment.isValid()) {
                    return false;
                }

                return itemMoment >= startDateMoment && itemMoment <= endDateMoment;
            }

            return true;
        });

        setPaginatedTransactions(filteredOrders);
    }, [transactions, searchQuery, startDate, endDate]);

    return (
        <div className="container mx-auto p-4">
            <Navbar />

            {/* Search and Filter Section */}
            <div className='bg-white rounded flex w-full mt-5 justify-between border border-[#003B49] px-4 py-3'>
                <form className="flex items-center max-w-sm">
                    <label htmlFor="simple-search" className="sr-only">Search by Order ID</label>
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-gray-500">
                            <LuBox size={18} />
                        </div>
                        <input onChange={e => setSearchQuery(e.target.value)} type="text" id="simple-search" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder="Search by order id..." required />
                    </div>
                    <button type="submit" className="p-2.5 ms-2 text-sm font-medium text-white bg-blue-700 rounded-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                        <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                        </svg>
                        <span className="sr-only">Search</span>
                    </button>
                </form>

                {/* Date Range Filter */}
                <div className="flex items-center">
                    <span className="mx-4 text-gray-500">from</span>
                    <div className="relative">
                        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-gray-500">
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                            </svg>
                        </div>
                        <input
                            onChange={e => setStartDate(e.target.value)}
                            type="date"
                            name="start"
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder="Select date start"
                        />
                    </div>
                    <span className="mx-4 text-gray-500">to</span>
                    <div className="relative">
                        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-gray-500">
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                            </svg>
                        </div>
                        <input
                            onChange={e => setEndDate(e.target.value)}
                            name="end"
                            type="date"
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder="Select date end"
                        />
                    </div>
                </div>

            </div>

            {/* Transactions Table */}
            <div className="mt-5 relative overflow-x-auto shadow-md sm:rounded-lg border border-[#003B49]">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                        <tr>
                            <th scope="col" class="px-6 py-3 text-center">
                                Order Date
                            </th>
                            <th scope="col" class="px-6 py-3 text-center">
                                Order ID Ref
                            </th>
                            <th scope="col" class="px-6 py-3 text-center">
                                COD Amount (Rs.)
                            </th>
                            <th scope="col" class="px-6 py-3 text-center">
                                Deduction
                            </th>
                            <th scope="col" class="px-6 py-3 text-center">
                                Early COD
                            </th>
                            <th scope="col" class="px-6 py-3 text-center">
                                Status
                            </th>
                            <th scope="col" class="px-6 py-3 text-center">
                                Amount Settled
                            </th>
                            <th scope="col" class="px-6 py-3 text-center">
                                Remark
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            paginatedTransactions.map((item, index) => (
                                <tr class="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700">
                                    <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        {new Date(item.timestamp.seconds * 1000).toLocaleString()}
                                    </th>
                                    <td class="px-6 py-4 text-center text-[#003B49]">
                                        {item.order_id}
                                    </td>
                                    <td class="px-6 py-4 text-center text-[#003B49]">
                                        {item.cod_amount.toFixed(2)}
                                    </td>
                                    <td class="px-6 py-4 text-center text-[#003B49]">{/* Use optional chaining for deduction */}
                                        {item.deduction?.toFixed(2)}
                                    </td>
                                    <td class="px-6 py-4 text-center text-[#003B49]">{/* Display early_cod or empty string if undefined */}
                                        {item.early_cod}
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                        {item.status === "Not paid" ?
                                            <span class="inline-flex items-center bg-red-100 text-red-800 text-xs font-medium px-2.5 py-1.5 rounded-full dark:bg-orange-900 dark:text-orange-300">
                                                <span class="w-2 h-2 me-1 bg-orange-500 rounded-full"></span>
                                                Pending
                                            </span>
                                            :
                                            <span class="inline-flex items-center bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1.5 rounded-full dark:bg-green-900 dark:text-green-300">
                                                <span class="w-2 h-2 me-1 bg-green-500 rounded-full"></span>
                                                Paid
                                            </span>
                                        }
                                    </td>
                                    <td class="px-6 py-4 text-center text-[#003B49]">
                                        {item.transfered_amount.toFixed(2)}
                                    </td>
                                    <td class="px-6 py-4 text-center text-[#003B49]">
                                        {item.remark}
                                    </td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <nav className="bg-[#003B49] rounded-lg p-2 py-2 mt-2 flex items-center flex-column flex-wrap md:flex-row justify-between" aria-label="Table navigation">
                <span className="text-sm font-normal text-white mb-4 md:mb-0 block w-full md:inline md:w-auto">
                    Showing <span className="font-semibold text-white">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-semibold text-white">{Math.min(currentPage * pageSize, transactions.length)}</span> of <span className="font-semibold text-white">{transactions.length}</span>
                </span>                
                <ul className="inline-flex -space-x-px rtl:space-x-reverse text-sm h-8">
                    <li>
                        <a
                            onClick={handlePrevClick}
                            className={`flex cursor-pointer items-center justify-center px-3 h-8 ms-0 leading-tight text-black bg-white border border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Previous
                        </a>
                    </li>
                    <li>
                        <a
                            onClick={handleNextClick}
                            className={`flex cursor-pointer items-center justify-center px-3 h-8 leading-tight text-black bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 ${currentPage >= Math.ceil(transactions.length / pageSize) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Next
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
    );
}

export default Payments;
