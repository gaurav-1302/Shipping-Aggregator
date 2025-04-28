import React, { useEffect, useState } from 'react';
import Navbar from "../../common/Navbar";
import Addsingleorder from './Addsingleorder';
import Addheavyorder from './Addheavyorder'; // Import the Addheavyorder component
import { useNavigate } from 'react-router-dom';

/**
 * Orders Component:
 * This component serves as a container for different order types (B2C and B2B).
 * It allows users to switch between adding single orders (B2C) and heavy orders (B2B).
 */
function Orders() {
    // Define CSS classes for active and non-active buttons
    const nonActiveClass = "px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:text-blue-700 focus:z-10 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white";
    const activeClass = "bg-blue-700 px-4 py-2 text-sm font-medium text-white border border-gray-200 rounded-lg focus:z-10 dark:bg-blue-500 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white";

    // State to manage the active order type (0 for B2C, 1 for B2B)
    const [orderType, setOrderType] = useState(0);

    // Hook for navigation
    const navigate = useNavigate();

    /**
     * useEffect Hook:
     * This hook checks if a user is logged in. If not, it redirects to the login page.
     * It runs once when the component mounts.
     */
    useEffect(() => {
        // Retrieve user data from local storage
        const user = window.localStorage.getItem('umaxshipuser');
        // Check if user data is missing or invalid
        if (user === null || user === undefined || user === '') {
            // Redirect to the login page if the user is not logged in
            navigate('/login/')
        }
    }, [])

    return (
        <div>
            {/* Render the navigation bar */}
            <Navbar />

            {/* Container for order type selection buttons */}
            <div className="inline-flex rounded-md shadow-sm mt-5 gap-5" role="group">
                {/* Button for adding single orders (B2C) */}
                <button
                    type="button"
                    className={orderType === 0 ? activeClass : nonActiveClass}
                    onClick={() => setOrderType(0)}
                >
                    Add Single Orders (B2C)
                </button>
                {/* Button for adding heavy orders (B2B) */}
                <button
                    type="button"
                    className={orderType === 1 ? activeClass : nonActiveClass}
                    onClick={() => setOrderType(1)}
                >
                    Add Heavy Orders (B2B)
                </button>
            </div>

            {/* Conditional rendering of order forms based on the selected order type */}
            {
                // Render the Addsingleorder component if orderType is 0 (B2C)
                orderType === 0 &&
                <Addsingleorder />
            }

            {
                // Render the Addheavyorder component if orderType is 1 (B2B)
                orderType === 1 &&
                <Addheavyorder />
            }
        </div>
    )
}

export default Orders;