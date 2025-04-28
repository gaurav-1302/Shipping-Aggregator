// Import necessary modules and components from React, Firebase, and React Router.
import { useEffect, useState } from "react";
import Navbar from "../../common/Navbar";
import Shippingchart from "./Shippingchart";
import Latestorders from "./Latestorders";
import { auth, db } from '../../firebase.config';
import { useNavigate } from "react-router-dom";
import { query, getDocs, collection, where, doc, getDoc } from 'firebase/firestore';
import { useSignOut } from 'react-firebase-hooks/auth';

// Dashboard Component
const Dashboard = () => {

  // React Router's useNavigate hook for programmatic navigation.
  const navigate = useNavigate();

  // State to store the current user's ID.
  const [userId, setUserId] = useState('');

  // React Firebase Hooks' useSignOut hook for user sign-out functionality.
  const [signOut, loading, error] = useSignOut(auth);

  /**
   * logoutUser Function:
   * Signs out the current user and redirects them to the login page.
   */
  const logoutUser = async () => {
    const success = await signOut();
    if (success) {
      // Remove user data from local storage upon successful logout.
      localStorage.removeItem('umaxshipuser');
      // Redirect to the login page.
      navigate('/login/');
    }
  }

  /**
   * useEffect Hook: Authentication Check
   * Checks if a user is authenticated on component mount.
   * If not authenticated, redirects to the login page.
   */
  useEffect(() => {
    const user = window.localStorage.getItem('umaxshipuser');
    if (user === null || user === undefined || user === '') {
      navigate('/login/')
    }
  }, [navigate])

  /**
   * useEffect Hook: Fetch User ID
   * Fetches the current user's ID from local storage and updates the userId state.
   */
  useEffect(() => {
    const currentUser = localStorage.getItem('umaxshipuser');
    const jsonData = JSON.parse(currentUser);
    if (jsonData) { setUserId(jsonData.uid); }
  }, [])

  // Date calculations for filtering orders.
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + (24 * 60 * 60 * 1000));
  const yesterdayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const yesterdayEnd = new Date(yesterdayStart.getTime() + (24 * 60 * 60 * 1000));

  /**
   * calculateYesterdaysShipment Function:
   * Calculates the number of shipments made yesterday.
   * @param {Array} data - Array of order data.
   */
  const calculateYesterdaysShipment = (data) => {
    return data.filter(item => {
      const timestamp = item.timestamp.toDate(); // Convert Firestore timestamp to Date
      return timestamp >= yesterdayStart && timestamp < yesterdayEnd; // Check if within yesterday's range
    }).length;
  };

  /**
   * calculateTodaysShipment Function:
   * Calculates the number of shipments made today.
   * @param {Array} data - Array of order data.
   */
  const calculateTodaysShipment = (data) => {
    return data.filter(item => {
      const timestamp = item.timestamp.toDate(); // Convert Firestore timestamp to Date
      return timestamp >= todayStart && timestamp < tomorrowStart; // Check if within today's range
    }).length;
  };

  /**
   * calculateTotalShipment Function:
   * Calculates the total number of shipments made in the last 30 days.
   * @param {Array} data - Array of order data.
   */
  const calculateTotalShipment = (data) => {
    return data.filter(item => {
      const timestamp = item.timestamp.toDate(); // Convert Firestore timestamp to Date
      return timestamp >= thirtyDaysAgo; // Check if created in the last 30 days
    }).length;
  };

  /**
   * calculateTotalLoad Function:
   * Calculates the total load (weight) of all shipments.
   * @param {Array} data - Array of order data.
   */
  const calculateTotalLoad = (data) => {
    var totalLoad = 0; // Reset total load before recalculating

    for (const item of data) {
      const parsedData = JSON.parse(item.data);
      totalLoad += parsedData.weight;
    }

    return totalLoad;
  };

  // State to store the list of orders.
  const [ordersList, setOrdersList] = useState([]);

  /**
   * fetchOrders Function:
   * Fetches orders from Firestore for the current user.
   */
  const fetchOrders = async () => {
    try {
      // Query to fetch orders where the user_id matches the current user's ID.
      const q = query(collection(db, "orders"), where("user_id", "==", userId));
      const querySnapshot = await getDocs(q);

      let orders = []; // Initialize empty array to store valid orders

      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        orders.push({ ...docData, id: doc.id });
      });

      setOrdersList(orders);
    } catch (error) { // Handle errors appropriately (e.g., display error message to user)
      console.error("Error fetching orders:", error);
    }
  };

  // States to store calculated shipment data.
  const [totalShipment, setTotalShipment] = useState(0)
  const [todayShipment, setTodayShipment] = useState(0)
  const [yesterdayShipment, setYesterdayShipment] = useState(0)
  const [totalLoad, setTotalLoad] = useState(0)

  /**
   * useEffect Hook: Calculate Shipment Data
   * Calculates and updates shipment data whenever the ordersList changes.
   */
  useEffect(() => {
    if (ordersList.length > 0) {
      // Calculate and set total shipments in the last 30 days.
      setTotalShipment(calculateTotalShipment(ordersList))
      
      // Calculate and set today's shipments.
      setTodayShipment(calculateTodaysShipment(ordersList))
      
      // Calculate and set yesterday's shipments.
      setYesterdayShipment(calculateYesterdaysShipment(ordersList))
      setTotalLoad(calculateTotalLoad(ordersList));
    }
  }, [ordersList])

  useEffect(() => {
    fetchOrders();
  }, [userId]) // Fetch orders whenever the userId changes.

  return (

    <div className="content-area">
      {/* Render the navigation bar. */}
      <Navbar />

      {/* Top Cards: Displaying Key Metrics */}
      <div className="mt-4">
        <div className="max-w-full rounded-lg grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

          <div class="w-full p-4 border border-[#07847F] border-dashed bg-[#003B49] rounded-lg shadow">
            <h5 class="mb-2 text-2xl font-semibold tracking-tight text-[#FF7D44] text-left">{ordersList.length}</h5>
            <h5 class="mb-2 text-lg font-semibold tracking-tight text-white text-left">Total Shipment</h5>
            <p class="inline-flex font-medium items-center text-white ml-1">
              All time
            </p>
          </div>

          <div class="w-full p-4 border border-[#07847F] border-dashed bg-[#003B49] rounded-lg shadow">
            <h5 class="mb-2 text-2xl font-semibold tracking-tight text-[#FF7D44] text-left">{todayShipment}</h5>
            <h5 class="mb-2 text-lg font-semibold tracking-tight text-white text-left">Today Shipment</h5>
            <p class="inline-flex font-medium items-center text-white ml-1">
              From 00:00 hours
            </p>
          </div>

          <div class="w-full p-4 border border-[#07847F] border-dashed bg-[#003B49] rounded-lg shadow">
            <h5 class="mb-2 text-2xl font-semibold tracking-tight text-[#FF7D44] text-left">{yesterdayShipment}</h5>
            <h5 class="mb-2 text-lg font-semibold tracking-tight text-white text-left">Yesterday Shipment</h5>
            <p class="inline-flex font-medium items-center text-white ml-1">
              Last 24 hours
            </p>
          </div>

          <div class="w-full p-4 border border-[#07847F] border-dashed bg-[#003B49] rounded-lg shadow">
            <h5 class="mb-2 text-2xl font-semibold tracking-tight text-[#FF7D44] text-left">{totalLoad.toFixed(2)} KG</h5>
            <h5 class="mb-2 text-lg font-semibold tracking-tight text-white text-left">Total Load</h5>
            <p class="inline-flex font-medium items-center text-white ml-1">
              All time
            </p>
          </div>
        </div>
      </div>

      {/* Middle Cards: Displaying Latest Orders and Shipping Chart */}
      <div class="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-3">
        <Latestorders />
        <Shippingchart />
      </div>

    </div >
  );
};

export default Dashboard;