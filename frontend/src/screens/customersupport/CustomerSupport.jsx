import React, { useEffect, useState } from "react";
import Navbar from "../../common/Navbar";
import { useNavigate } from "react-router-dom";
import RaisedComplaints from "./RaisedComplaints";
import Complaints from "./Complaints";

/**
 * CustomerSupport Component:
 * This component provides a user interface for managing customer support related tasks.
 * It allows users to view and switch between "Raised Complaints" and "Complaints" sections.
 */
const CustomerSupport = () => {
  // Define CSS classes for active and non-active buttons using Tailwind CSS.
  const nonActiveClass =
    "px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:text-blue-700 focus:z-10 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white";
  const activeClass =
    "bg-blue-700 px-4 py-2 text-sm font-medium text-white border border-gray-200 rounded-lg focus:z-10 dark:bg-blue-500 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white";

  // State to manage the currently selected complaints type (0: Raised Complaints, 1: Complaints).
  const [ComplaintsType, setComplaintsType] = useState(0);

  // React Router's useNavigate hook for programmatic navigation.
  const navigate = useNavigate();

  /**
   * useEffect Hook:
   * This effect checks for user authentication on component mount.
   * If the user is not authenticated, it redirects them to the login page.
   */
  useEffect(() => {
    // Retrieve user data from local storage.
    const user = window.localStorage.getItem("umaxshipuser");
    // Check if user data is missing or invalid.
    if (user === null || user === undefined || user === "") {
      // Redirect to the login page if the user is not authenticated.
      navigate("/login/");
    }
  }, [navigate]); // Include 'navigate' in the dependency array to avoid stale closure issues.

  return (
    <div>
      {/* Render the navigation bar. */}
      <Navbar />

      {/* Container for the complaints type selection buttons. */}
      <div className="inline-flex rounded-md shadow-sm mt-5 gap-5" role="group">
        {/* Button for "Raised Complaints". */}
        <button
          type="button"
          className={ComplaintsType === 0 ? activeClass : nonActiveClass}
          onClick={() => setComplaintsType(0)}
        >
          Raised Complaints
        </button>
        {/* Button for "Complaints". */}
        <button
          type="button"
          className={ComplaintsType === 1 ? activeClass : nonActiveClass}
          onClick={() => setComplaintsType(1)}
        >
          Complaints
        </button>
      </div>

      {/* Conditional rendering of components based on the selected complaints type. */}
      {ComplaintsType === 0 && <RaisedComplaints />}
      {ComplaintsType === 1 && <Complaints />}
    </div>
  );
};

export default CustomerSupport;