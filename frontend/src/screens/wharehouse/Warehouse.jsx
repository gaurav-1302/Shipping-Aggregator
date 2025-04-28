import React, { useEffect, useState } from 'react';
import Navbar from "../../common/Navbar";
import { useNavigate } from 'react-router-dom';
import AddWarehouse from './Addwarehouse';
import ManageWarehouse from './ManageWarehouse';

/**
 * Warehouse Component
 *
 * This component serves as the main entry point for managing warehouses.
 * It provides a user interface for adding new warehouses and managing existing ones.
 * It uses a tab-like structure to switch between the "Add New Warehouse" and "Manage Warehouse" views.
 */
function Warehouse() {
    // Define CSS classes for active and non-active buttons
    const nonActiveClass = "px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:text-blue-700 focus:z-10 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white";
    const activeClass = "bg-blue-700 px-4 py-2 text-sm font-medium text-white border border-gray-200 rounded-lg focus:z-10 dark:bg-blue-500 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white";

    // State to manage the active tab (0: Add New Warehouse, 1: Manage Warehouse)
    const [activeTab, setActiveTab] = useState(0);
    // Hook for programmatic navigation
    const navigate = useNavigate();

    /**
     * useEffect hook to check for user authentication.
     * If the user is not authenticated, they are redirected to the login page.
     *
     * This runs once when the component mounts.
     */
    useEffect(() => {
        // Retrieve the user data from local storage
        const user = window.localStorage.getItem('umaxshipuser');
        // Check if the user data is null, undefined, or an empty string
        if (user === null || user === undefined || user === '') {
            // Redirect to the login page if the user is not authenticated
            navigate('/login/')
        }
    }, [])

    return (
        <div>
            {/* Navigation bar component */}
            <Navbar />

            {/* Tab navigation for switching between "Add New Warehouse" and "Manage Warehouse" */}
            <div className="inline-flex rounded-md shadow-sm mt-5 gap-5" role="group">
                {/* "Add New Warehouse" tab */}
                <button
                    type="button"
                    className={activeTab === 0 ? activeClass : nonActiveClass}
                    onClick={() => setActiveTab(0)}
                >
                    Add New Warehouse
                </button>
                {/* "Manage Warehouse" tab */}
                <button
                    type="button"
                    className={activeTab === 1 ? activeClass : nonActiveClass}
                    onClick={() => setActiveTab(1)}
                >
                    Manage Warehouse
                </button>
            </div>

            {
                /* Render the AddWarehouse component if the active tab is 0 */
                activeTab === 0 &&
                <AddWarehouse />
            }
            {
                /* Render the ManageWarehouse component if the active tab is 1 */
                activeTab === 1 &&
                <ManageWarehouse />
            }


        </div>
    )
}

export default Warehouse;