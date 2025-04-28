import React, { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../firebase.config";
import { FaCheckCircle } from "react-icons/fa";
import { RxCrossCircled } from "react-icons/rx";

/**
 * RaisedComplaints Component:
 * This component allows users to submit complaints related to their shipments.
 * It interacts with Firebase Firestore to store complaint data and fetches
 * the user's account manager details.
 */
function RaisedComplaints() {
  // State variables for form inputs, loading states, and toast messages.
  const [awbNumber, setAwbNumber] = useState("");
  const [issue, setIssue] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorToast, setErrorToast] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [manager, setManager] = useState(null);

  /**
   * useEffect Hook:
   * Fetches the account manager details for the current user on component mount.
   */
  useEffect(() => {
    const fetchManagerDetails = async () => {
      try {
        // Get a reference to the user document in Firestore.
        const userRef = doc(db, "users", auth.currentUser.uid);
        // Fetch the user document.
        const userDoc = await getDoc(userRef);
        // Check if the document exists.
        if (userDoc.exists()) {
          // Extract user data.
          const userData = userDoc.data();
          // Update the manager state with the fetched details.
          setManager({
            name: userData.account_manager_name,
            email: userData.account_manager,
            phone: userData.account_manager_phone_no,
          });
        }
      } catch (error) {
        console.error("Error fetching manager details:", error);
      }
    };

    // Call the function to fetch manager details.
    fetchManagerDetails();
  }, []);

  /**
   * handleSubmit Function:
   * Handles the form submission to save a new complaint to Firestore.
   * @param {Event} e - The form submission event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Set saving state to true to show loading indicator.
      setSaving(true);
      // Get a reference to the 'complaints' collection in Firestore.
      const complaintsRef = collection(db, "complaints");
      // Add a new document to the 'complaints' collection with the complaint data.
      await addDoc(complaintsRef, {
        userId: auth.currentUser.uid,
        awbNumber: awbNumber,
        issue: issue,
        timestamp: serverTimestamp(), // Add a timestamp for when the complaint was submitted.
      });
      // Reset form fields.
      setAwbNumber("");
      setIssue("");
      // Show success toast.
      setSuccessToast(true);
      setToastMessage("Complaint submitted successfully!");
    } catch (error) {
      console.error("Error submitting complaint:", error);
      // Show error toast.
      setErrorToast(true);
      setToastMessage("Error submitting complaint!");
    } finally {
      // Set saving state to false to hide loading indicator.
      setSaving(false);
      // Hide toast after a delay.
      setTimeout(() => {
        setSuccessToast(false);
        setErrorToast(false);
      }, 3000);
    }
  };

  return (
    <div className="mt-8 rounded-lg shadow dark:bg-gray-800 py-10 relative border border-black space-y-20">
      {/* Success toast */}
      {successToast && (
        <div
          className="absolute right-0 top-0 transform -translate-x-full p-4 mb-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-gray-700"
          role="alert"
        >
          <div className="flex items-center">
            <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-green-500 bg-green-100 rounded-lg dark:bg-green-800 dark:text-green-200">
              <FaCheckCircle />
            </div>
            <div className="ml-3 text-sm text-black font-normal">
              {toastMessage}
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {errorToast && (
        <div
          className="absolute right-0 top-0 transform -translate-x-full p-4 mb-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-gray-700"
          role="alert"
        >
          <div className="flex items-center">
            <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-red-500 bg-red-100 rounded-lg dark:bg-red-800 dark:text-red-200">
              <RxCrossCircled />
            </div>
            <div className="ml-3 text-sm text-black font-normal">
              {toastMessage}
            </div>
          </div>
        </div>
      )}

      {/* Complaint Submission Form */}
      <form className="max-w-sm mx-auto" onSubmit={handleSubmit}>
        {/* Reference Number Input */}
        <div className="mb-5">
          <label
            htmlFor="AWB"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Reference Number
          </label>
          <input
            type="number"
            id="AWB"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="AWB/ Order Id/ Transaction ID"
            value={awbNumber}
            onChange={(e) => setAwbNumber(e.target.value)}
            required
          />
        </div>
        {/* Issues Textarea */}
        <div className="mb-5">
          <label
            htmlFor="Issues"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Issues
          </label>
          <textarea
            id="Issues"
            rows="4"
            className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Describe your Issues..."
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
          ></textarea>
        </div>
        {/* Submit Button */}
        <button
          type="submit"
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >
          {saving ? (
            <>
              <svg
                aria-hidden="true"
                role="status"
                className="inline w-4 h-4 me-3 text-white animate-spin"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="#E5E7EB"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.913 86.7995 32.2954 88.1814 35.8754C89.083 38.2331 91.5423 39.6781 93.9676 39.0409Z"
                  fill="currentColor"
                />
              </svg>
              Loading...
            </>
          ) : (
            "Submit"
          )}
        </button>
      </form>

      {/* Account Manager Details */}
      {manager && (
        <div className="flex justify-center mt-10">
          <div className="bg-gray-200 p-4 rounded-lg w-full max-w-md">
            <p className="text-center font-semibold mb-2">
              Account Manager Details
            </p>
            <p className="text-center">
              <span className="font-semibold">Name:</span> {manager.name}
            </p>
            <p className="text-center">
              <span className="font-semibold">Email:</span> {manager.email}
            </p>
            <p className="text-center">
              <span className="font-semibold">Phone:</span> {manager.phone}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default RaisedComplaints;
