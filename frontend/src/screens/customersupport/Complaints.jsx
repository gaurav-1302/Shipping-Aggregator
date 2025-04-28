import React, { useEffect, useState } from 'react';
import { db } from '../../firebase.config';
import { collection, getDocs, updateDoc, doc, query, where, arrayUnion, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const COMPLAINTS_COLLECTION = process.env.REACT_APP_COMPLAINTS_COLLECTION || 'complaints';

const Complaints = () => {
    const navigate = useNavigate();

    const [userId, setUserId] = useState('');

    useEffect(() => {
        const user = window.localStorage.getItem('umaxshipuser');
        if (user === null || user === undefined || user === '') {
            navigate('/login/');
        } else {
            const jsonData = JSON.parse(user);
            setUserId(jsonData.uid);
        }
    }, [navigate]);    
    useEffect(() => {
        const user = window.localStorage.getItem('umaxshipuser');
        if (user === null || user === undefined || user === '') {
            navigate('/login/');
        }
    }, [navigate]);

    const [complaints, setComplaints] = useState([]);

    const fetchComplaints = async () => {
        try {
            if(userId){
                const q = query(collection(db, "complaints"), where("userId", "==", userId));
                const querySnapshot = await getDocs(q);
                let orders = []; // Initialize empty array to store valid orders
                querySnapshot.forEach((doc) => {
                    const docData = doc.data();
                    orders.push({ ...docData, id: doc.id });
                });

                const sortedOrders = orders.sort((item1, item2) => {
                    return item2.timestamp.seconds - item1.timestamp.seconds;
                });
            }

            setComplaints(sortedOrders);
        } catch (error) {
            console.error("Error fetching complaints:", error);
            // Consider displaying an error message to the user
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, [userId])

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [paginatedTransactions, setPaginatedTransactions] = useState([]);

    useEffect(() => {
        const sortAndPaginate = () => {            
            const sorted = [...complaints].sort((a, b) => b.timestamp.seconds * 1000 - a.timestamp.seconds * 1000);
            const startIndex = (currentPage - 1) * pageSize;            
            const endIndex = Math.min(startIndex + pageSize, sorted.length);            
            setPaginatedTransactions(sorted.slice(startIndex, endIndex));            
        };        

        sortAndPaginate();
    }, [complaints, currentPage, pageSize]);

    const handlePrevClick = () => {
        if (currentPage > 1) {
            setCurrentPage(prevPage => prevPage - 1);
        }
    };

    const handleNextClick = () => {
        if (currentPage < Math.ceil(complaints.length / pageSize)) {
            setCurrentPage(nextPage => nextPage + 1);
        }
    }

    const [selectedId, setSelectedId] = useState('');
    const [complaintData, setComplaintData] = useState();
    const [loading, setLoading] = useState(true);

    const fetchSelectedQuery = async () => {
        try {
            const docRef = doc(db, COMPLAINTS_COLLECTION, selectedId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setComplaintData(docSnap.data());
            } else {
                console.log("No such document!");
            }
        } catch (error) {
            console.error("Error fetching complaint details:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedId.length > 0) {
            fetchSelectedQuery();
        }
    }, [selectedId])

    const [replyText, setReply] = useState('');

    const addReply = async () => {
        if (replyText.length < 1) {
            return;
        }
        try {
            const docRef = doc(db, COMPLAINTS_COLLECTION, selectedId);
            const timestamp = Date.now();

            await updateDoc(docRef, {
                replies: arrayUnion({
                    replyText,
                    user: "Customer Care",
                    timestamp,
                }),
            });

            setReply('');
            fetchSelectedQuery();
        } catch (error) {
            console.error("Error adding reply:", error);
            // Consider displaying an error message to the user
        }

    }

    return (
        <div>
            <div className='mt-5 overflow-x-auto shadow-md sm:rounded-lg'>
                <div className="relative overflow-x-auto shadow-md sm:rounded-lg border border-black">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3">Complaint Id</th>
                                <th className="px-6 py-3">Complaint Date</th>
                                <th className="px-6 py-3">Refrence No.</th>
                                <th className="px-6 py-3">Issue</th>
                                <th className="px-6 py-3">Complaint Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedTransactions.map((items) => (
                                <tr key={items.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4"><a onClick={() => setSelectedId(items.id)} className='text-blue-500 cursor-pointer'>{items.id}</a></td>
                                    <td className="px-6 py-4">{new Date(items.timestamp.seconds * 1000).toLocaleString()}</td>
                                    <td className="px-6 py-4">{items.awbNumber}</td>
                                    <td className="px-6 py-4">{items.issue}</td>
                                    <td className="px-6 py-4 text-center">
                                        {items.status === "OPEN" ? (
                                            <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
                                                <span className="w-2 h-2 me-1 bg-blue-500 rounded-full"></span>
                                                In Process
                                            </span>
                                        ) : items.status === "RESOLVED" ? (
                                            <span className="inline-flex items-center bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300">
                                                    <span className="w-2 h-2 me-1 bg-green-500 rounded-full"></span>
                                                    Resolved
                                                </span>
                                        ) : (
                                            <span className="inline-flex items-center bg-yellow-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-yellow-900 dark:text-yellow-300">
                                                    <span className="w-2 h-2 me-1 bg-yellow-500 rounded-full"></span>
                                                    New
                                                </span>
                                        )}
                                    </td>
                                </tr>
                            ))}                            
                        </tbody>
                    </table>
                </div>
                <nav class="bg-[#003B49] rounded-lg p-2 py-2 mt-2 flex items-center flex-column flex-wrap md:flex-row justify-between" aria-label="Table navigation">
                    <span class="text-sm font-normal text-white mb-4 md:mb-0 block w-full md:inline md:w-auto">
                        Showing <span class="font-semibold text-white">1-{complaints.length < pageSize ? complaints.length : pageSize}</span> of <span class="font-semibold text-white">{complaints.length}</span>
                    </span>
                    <ul className="inline-flex -space-x-px rtl:space-x-reverse text-sm h-8">
                        <li>
                            <a onClick={handlePrevClick} id="prevButton" className={`flex cursor-pointer items-center justify-center px-3 h-8 ms-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white ${currentPage === 1 ? 'disabled:opacity-50 disabled:cursor-not-allowed' : ''}`}>Previous</a>
                        </li>                        
                        <li>
                            <a onClick={handleNextClick} id="nextButton" class="flex cursor-pointer items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">Next</a>
                        </li>
                    </ul>
                </nav>
            </div>

            {
                selectedId.length > 0 && (
                <div id="timeline-modal" tabIndex="-1" aria-hidden="true" className="flex overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="relative p-4 w-full max-w-lg max-h-full">
                        <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
                            <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Track Complaint
                                </h3>
                                <button onClick={() => setSelectedId('')} type="button" className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm h-8 w-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" data-modal-toggle="timeline-modal">
                                    <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                                    </svg>
                                    <span class="sr-only">Close modal</span>
                                </button>
                            </div>
                            {
                                loading
                                    ?
                                    <p>Loading</p>
                                    :
                                    <div className="p-4 md:p-5">
                                        <ol className="relative border-s border-gray-200 dark:border-gray-600 ms-3.5 mb-4 md:mb-5">
                                            <li className="mb-10 ms-8">
                                                <span className="absolute flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full -start-3.5 ring-8 ring-white dark:ring-gray-700 dark:bg-gray-600">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <g id="Communication / Chat_Conversation_Circle">
                                                            <path id="Vector" d="M9.33814 15.9905C12.4946 15.8151 15 13.2003 15 10C15 6.68629 12.3137 4 9 4C5.68629 4 3 6.68629 3 10C3 11.1807 3.34094 12.2817 3.92989 13.21L3.50586 14.482L3.50518 14.4839C3.34278 14.9711 3.26154 15.2149 3.31938 15.3771C3.36979 15.5184 3.48169 15.6299 3.62305 15.6803C3.78472 15.7379 4.02675 15.6573 4.51069 15.4959L4.51758 15.4939L5.79004 15.0698C6.7183 15.6588 7.81935 15.9998 9.00006 15.9998C9.11352 15.9998 9.22624 15.9967 9.33814 15.9905ZM9.33814 15.9905C9.33822 15.9907 9.33806 15.9902 9.33814 15.9905ZM9.33814 15.9905C10.1591 18.3259 12.3841 20.0002 15.0001 20.0002C16.1808 20.0002 17.2817 19.6588 18.2099 19.0698L19.482 19.4939L19.4845 19.4944C19.9717 19.6567 20.2158 19.7381 20.378 19.6803C20.5194 19.6299 20.6299 19.5184 20.6803 19.3771C20.7382 19.2146 20.6572 18.9706 20.4943 18.4821L20.0703 17.21L20.2123 16.9746C20.7138 16.0979 20.9995 15.0823 20.9995 14C20.9995 10.6863 18.3137 8 15 8L14.7754 8.00414L14.6621 8.00967" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                                        </g>
                                                    </svg>
                                                </span>
                                                <h4 className="flex items-start mb-1 text-sm font-semibold text-gray-900 dark:text-white">
                                                    You
                                                    <time className="ml-2 text-gray-500 dark:text-gray-400">{new Date(complaintData.timestamp.seconds * 1000).toLocaleString()}</time>
                                                </h4>
                                                <p className='dark:text-gray-300'>
                                                    Refrence Number: {complaintData.awbNumber}
                                                </p>
                                                <p className='dark:text-white'>
                                                    {complaintData.issue}                                                    
                                                </p>
                                            </li>
                                            {
                                                complaintData.replies ? (complaintData.replies.map((item) => (
                                                    <li class="mb-10 ms-8">
                                                        <span class="absolute flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full -start-3.5 ring-8 ring-white dark:ring-gray-700 dark:bg-gray-600">
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <g id="Communication / Chat_Conversation_Circle">
                                                                    <path id="Vector" d="M9.33814 15.9905C12.4946 15.8151 15 13.2003 15 10C15 6.68629 12.3137 4 9 4C5.68629 4 3 6.68629 3 10C3 11.1807 3.34094 12.2817 3.92989 13.21L3.50586 14.482L3.50518 14.4839C3.34278 14.9711 3.26154 15.2149 3.31938 15.3771C3.36979 15.5184 3.48169 15.6299 3.62305 15.6803C3.78472 15.7379 4.02675 15.6573 4.51069 15.4959L4.51758 15.4939L5.79004 15.0698C6.7183 15.6588 7.81935 15.9998 9.00006 15.9998C9.11352 15.9998 9.22624 15.9967 9.33814 15.9905ZM9.33814 15.9905C9.33822 15.9907 9.33806 15.9902 9.33814 15.9905ZM9.33814 15.9905C10.1591 18.3259 12.3841 20.0002 15.0001 20.0002C16.1808 20.0002 17.2817 19.6588 18.2099 19.0698L19.482 19.4939L19.4845 19.4944C19.9717 19.6567 20.2158 19.7381 20.378 19.6803C20.5194 19.6299 20.6299 19.5184 20.6803 19.3771C20.7382 19.2146 20.6572 18.9706 20.4943 18.4821L20.0703 17.21L20.2123 16.9746C20.7138 16.0979 20.9995 15.0823 20.9995 14C20.9995 10.6863 18.3137 8 15 8L14.7754 8.00414L14.6621 8.00967" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                                                </g>
                                                            </svg>
                                                        </span>
                                                        <h4 className="flex items-start mb-1 text-sm font-semibold text-gray-900 dark:text-white">
                                                            {item.user}
                                                            <time class="ml-2 text-gray-500 dark:text-gray-400">{new Date(item.timestamp).toLocaleString()}</time>
                                                        </h4>
                                                        <p className='dark:text-gray-300'>
                                                            {item.replyText}
                                                        </p>
                                                    </li>
                                                )))
                                                    :
                                                    <></>
                                            }
                                            {
                                                complaintData.status !== "RESOLVED" &&
                                                <>
                                                    <li className="mb-5 ms-8 max-w-sm mx-auto">
                                                        <span className="absolute flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full -start-3.5 ring-8 ring-white dark:ring-gray-700 dark:bg-gray-600">
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <g id="Communication / Chat_Conversation_Circle">
                                                                    <path id="Vector" d="M9.33814 15.9905C12.4946 15.8151 15 13.2003 15 10C15 6.68629 12.3137 4 9 4C5.68629 4 3 6.68629 3 10C3 11.1807 3.34094 12.2817 3.92989 13.21L3.50586 14.482L3.50518 14.4839C3.34278 14.9711 3.26154 15.2149 3.31938 15.3771C3.36979 15.5184 3.48169 15.6299 3.62305 15.6803C3.78472 15.7379 4.02675 15.6573 4.51069 15.4959L4.51758 15.4939L5.79004 15.0698C6.7183 15.6588 7.81935 15.9998 9.00006 15.9998C9.11352 15.9998 9.22624 15.9967 9.33814 15.9905ZM9.33814 15.9905C9.33822 15.9907 9.33806 15.9902 9.33814 15.9905ZM9.33814 15.9905C10.1591 18.3259 12.3841 20.0002 15.0001 20.0002C16.1808 20.0002 17.2817 19.6588 18.2099 19.0698L19.482 19.4939L19.4845 19.4944C19.9717 19.6567 20.2158 19.7381 20.378 19.6803C20.5194 19.6299 20.6299 19.5184 20.6803 19.3771C20.7382 19.2146 20.6572 18.9706 20.4943 18.4821L20.0703 17.21L20.2123 16.9746C20.7138 16.0979 20.9995 15.0823 20.9995 14C20.9995 10.6863 18.3137 8 15 8L14.7754 8.00414L14.6621 8.00967" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                                                </g>
                                                            </svg>
                                                        </span>
                                                        <textarea id="message" rows="4" className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                                            placeholder="Add a reply" onChange={e => setReply(e.target.value)} value={replyText}>
                                                        </textarea>
                                                    </li>
                                                    <li className="mb-10 ms-8">
                                                        <button onClick={addReply} type="button" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">
                                                            Add reply
                                                        </button>
                                                    </li>
                                                </>
                                            }
                                        </ol>
                                    </div>
                            }                            
                        </div>
                    </div>
                </div>)

            }

        </div>
    )
}

export default Complaints;