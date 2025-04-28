import React, { useEffect, useState } from 'react';
import Navbar from '../../common/Navbar';
import { auth } from '../../firebase.config';
import { onAuthStateChanged } from 'firebase/auth';
import { sendPasswordResetEmail, updateProfile, verifyBeforeUpdateEmail } from 'firebase/auth';

// Environment variables for API keys and credentials
const EMAIL_VERIFICATION_API_KEY = process.env.REACT_APP_EMAIL_VERIFICATION_API_KEY;

/**
 * Settings Component
 * This component allows users to update their profile information, including name, email, and password.
 */
function Settings() {
    // State variables for managing toast notifications
    const [errorToast, setErrorToast] = useState(false);
    const [successToast, setSuccessToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // State variable to indicate if an operation is in progress (e.g., sending email)
    const [sending, setSending] = useState(false);

    /**
     * updatePassword function
     * Sends a password reset email to the user's email address.
     */
    const updatePassword = () => {
        setSending(true);
        // Send password reset email using Firebase Authentication
        sendPasswordResetEmail(auth, auth.currentUser.email) 
            .then(() => {
                // If successful, show success toast
                setSuccessToast(true);
                setToastMessage('Password reset link has been sent to your email successfully!');
                setSending(false);
            })
            .catch((error) => {
                // If error, show error toast
                setErrorToast(true);
                setToastMessage('Error in sending the password reset link. Please login again and try again.');
                setSending(false);
                console.error('Error sending password reset email:', error);
            });
    };

    // State variables to store the current user's information
    const [currentUser, setCurrentUser] = useState();
    const [currentEmail, setCurrentEmail] = useState();

    /**
     * useEffect hook to listen for changes in the user's authentication state.
     * Updates the currentUser and currentEmail state variables accordingly.
     * This runs once when the component mounts and whenever the authentication state changes.
     */
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user.displayName);
                setCurrentEmail(user.email);
            } else {
                setCurrentUser(null);
                setCurrentEmail(null);
            }
        });

        return unsubscribe;
    }, []);

    // State variables to store the updated user's information
    const [updatedName, setUpdatedName] = useState('');
    const [updatedEmail, setUpdatedEmail] = useState('');

    /**
     * updateUserName function
     * Updates the user's display name in Firebase Authentication.
     */
    const updateUserName = async () => {
        const user = auth.currentUser;

        if (updatedName !== '') {
            try {
                // Update user profile with the new display name
                await updateProfile(user, { displayName: updatedName });
                // If successful, show success toast
                setSuccessToast(true);
                setToastMessage('Username has been updated successfully!');
            } catch (error) {
                // If error, show error toast
                setErrorToast(true);
                setToastMessage('Name not valid');
                console.error('Error updating user name:', error);
            }
        } else {
            // If name is empty, show error toast
            setErrorToast(true);
            setToastMessage('Name not valid');
        }
    };

    /**
     * updateUserEmail function
     * Verifies the new email address before updating it in Firebase Authentication.
     */
    const updateUserEmail = async () => {
        const user = auth.currentUser;

        if (!updatedEmail || updatedEmail === '') {
            // If email is empty or invalid, show error toast
            setErrorToast(true);
            setToastMessage('Email address is not valid');
            return;
        }

        try {
            // Verify the new email address before updating
            await verifyBeforeUpdateEmail(user, updatedEmail, {
                // Pass the API key for email verification
                apiKey: EMAIL_VERIFICATION_API_KEY,
            });
            // If successful, show success toast
            setSuccessToast(true);
            setToastMessage(
                'A verification email has been sent to the email. Please verify to update your email.'
            );
        } catch (error) {
            // If error, show error toast
            setErrorToast(true);
            setToastMessage(
                'Error updating the email. Try logout and login again into account.'
            );
            console.error('Error updating user email:', error);
        }
    };

    // Render the component
    return (
        <div>
            {/* Navbar component */}
            <Navbar />

            {
                successToast &&
                <div style={{ zIndex: 999 }} className='fixed right-10 top-10'>
                    <div id="toast-success" class="flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-[#0E9F6E]" role="alert">
                        <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-green-500 bg-green-100 rounded-lg dark:bg-green-800 dark:text-green-200">
                            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z" />
                            </svg>
                            <span class="sr-only">Check icon</span>
                        </div>
                        <div class="ms-3 text-sm text-black font-normal">{toastMessage}</div>
                        <button onClick={() => setSuccessToast(false)} type="button" class="ms-3 -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700" data-dismiss-target="#toast-success" aria-label="Close">
                            <span class="sr-only">Close</span>
                            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                            </svg>
                        </button>
                    </div>
                </div>
            }

            {
                errorToast &&
                <div style={{ zIndex: 999 }} className='fixed right-10 top-10'>
                    <div id="toast-danger" class="flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-[#F05252]" role="alert">
                        <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-red-500 bg-red-100 rounded-lg dark:bg-red-800 dark:text-red-200">
                            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 11.793a1 1 0 1 1-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 0 1 1.414-1.414L10 8.586l2.293-2.293a1 1 0 0 1 1.414 1.414L11.414 10l2.293 2.293Z" />
                            </svg>
                            <span class="sr-only">Error icon</span>
                        </div>
                        <div class="ms-3 text-sm text-black font-normal">{toastMessage}</div>
                        <button onClick={() => setErrorToast(false)} type="button" class="ms-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700" data-dismiss-target="#toast-danger" aria-label="Close">
                            <span class="sr-only">Close</span>
                            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                            </svg>
                        </button>
                    </div>
                </div>
            }

            {/* Main container for the settings page */}
            <div className='w-full mt-5 justify-between dark:bg-gray-800 rounded-lg p-10'>
                <p className='text-2xl dark:text-white font-semibold'>Update User Profile</p>

                <div class="mt-5 mb-5 max-w-sm ">
                    {/* Input field for updating user name */}
                    <div class="mb-5">
                        <label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Your name</label>
                        <input type="text" id="displayName" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder={currentUser} onChange={e => setUpdatedName(e.target.value)} required />
                    </div>
                    <button onClick={updateUserName} type="button" class="mb-5 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                        Update Name
                    </button>
                    {/* Input field for updating user email */}
                    <div class="mb-5">
                        <label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Your email</label>
                        <input type="email" id="currentEmail" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder={currentEmail} onChange={e => setUpdatedEmail(e.target.value)} required />
                    </div>
                    <button onClick={updateUserEmail} type="button" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                        Update Email
                    </button>
                </div>
                {/* Conditional rendering for loading state */}
                {
                    sending ? // If sending is true, show loading button

                        <button disabled type="button" class="py-2.5 px-5 me-2 text-sm font-medium text-gray-900 bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:outline-none focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 inline-flex items-center">
                            <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-gray-200 animate-spin dark:text-gray-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="#1C64F2" />
                            </svg>
                            Loading...
                        </button>
                        : // If sending is false, show update password button
                        <button type="button" onClick={() => updatePassword()} class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                            Update Password
                        </button>
                }
            </div>
        </div>
    );
}

export default Settings;