import React, { useEffect, useState } from 'react';
import { db, auth } from '../../firebase.config';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';

/**
 * ManageWarehouse Component
 * This component allows users to view and manage their warehouses.
 * It fetches warehouse data from Firestore and provides functionality to delete warehouses.
 */
const ManageWarehouse = () => {
    // State to store the list of warehouses
    const [warehouses, setWarehouses] = useState([]);
    // Get the current user from Firebase Authentication
    const currentUser = auth.currentUser;

    /**
     * useEffect hook to fetch warehouses when the component mounts or when the current user changes.
     * It ensures that the warehouse list is updated whenever the user logs in or out.
     */
    useEffect(() => {
        if (currentUser) {
            fetchWarehouses();
        }
    }, [currentUser]);

    /**
     * fetchWarehouses function
     * Fetches the list of warehouses associated with the current user from Firestore.
     * Updates the warehouses state with the fetched data.
     */
    const fetchWarehouses = async () => {
        try {
            // Create a query to fetch warehouses where the user_id matches the current user's UID
            const q = query(collection(db, 'warehouses'), where('user_id', '==', currentUser.uid));
            // Execute the query and get the results
            const querySnapshot = await getDocs(q);
            // Map the documents to an array of objects, including the document ID
            const warehouseList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Update the state with the fetched warehouse list
            setWarehouses(warehouseList);
        } catch (error) {
            // Log any errors that occur during the fetch process
            console.error('Error fetching warehouses:', error);
        }
    };

    /**
     * deleteWarehouse function
     * Deletes a warehouse from Firestore based on its ID.
     * Refreshes the warehouse list after deletion.
     *
     * @param {string} id - The ID of the warehouse to delete.
     */
    const deleteWarehouse = async (id) => {
        try {
            // Get a reference to the warehouse document using its ID
            const warehouseDocRef = doc(db, 'warehouses', id);
            // Delete the warehouse document
            await deleteDoc(warehouseDocRef);
            // Refresh the warehouse list after deletion
            fetchWarehouses();
        } catch (error) {
            // Log any errors that occur during the deletion process
            console.error('Error deleting warehouse:', error);
        }
    };

    return (
        <div>
            {/* Container for the warehouse table */}
            <div className='mt-5 overflow-x-auto shadow-md sm:rounded-lg border border-black'>
                <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                    {/* Warehouse Table */}
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        {/* Table Header */}
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                            <tr>
                                {/* Table Header Columns */}
                                <th className="px-6 py-3">Warehouse Details</th>
                                <th className="px-6 py-3">Address</th>
                                <th className="px-6 py-3">City</th>
                                <th className="px-6 py-3">State</th>
                                <th className="px-6 py-3">Country</th>
                                <th className="px-6 py-3">Pincode</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        {/* Table Body */}
                        <tbody>
                            {/* Map through the warehouses array and render each warehouse row */}
                            {warehouses.map((warehouse) => (
                                <tr key={warehouse.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 text-black">
                                        {/* Display Warehouse Details */}
                                        <div>
                                            <span>{warehouse.name}</span><br />
                                            <span>{warehouse.email}</span><br />
                                            <span>{warehouse.phone}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-black">{warehouse.address}</td>
                                    <td className="px-6 py-4 text-black">{warehouse.city}</td>
                                    <td className="px-6 py-4 text-black">{warehouse.state}</td>
                                    <td className="px-6 py-4 text-black">{warehouse.country}</td>
                                    <td className="px-6 py-4 text-black">{warehouse.pin_code}</td>
                                    <td className="px-6 py-4 text-black">
                                        {/* Delete Button */}
                                        <button type="button" class="px-3 py-2 text-xs font-medium text-center text-white bg-blue-700 rounded-lg" onClick={() => deleteWarehouse(warehouse.id)}>
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default ManageWarehouse;
