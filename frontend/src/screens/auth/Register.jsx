import React, { useState, useEffect } from 'react';
import './Auth.css';
import { auth, db } from '../../firebase.config';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile, } from "firebase/auth";
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from "firebase/firestore";

// Importing assets for the register page
const logo = require('../../assets/umax-logo.png')
const cargo = require('../../assets/images/login.png')

/**
 * Register component for user account creation.
 *
 * This component handles user registration, email verification, and navigation.
 * It interacts with Firebase for authentication and Firestore for user data.
 */
function Register() {

    const navigate = useNavigate();

    useEffect(() => {
        const user = window.localStorage.getItem('umaxshipuser');
        if (user) {
            navigate('/dashboard')
        }
    }, [navigate])


    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const [displayName, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');

    const [createLoading, setCreateLoading] = useState(false);

    const createAccount = async () => {
        setCreateLoading(true); // Set loading state to true
        createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => { // Handle successful account creation
                const user = userCredential.user; // Get user object
                // Update user profile with display name
                updateProfile(user, { displayName: displayName, }) 
                // Create a new user document in Firestore
                await setDoc(doc(db, "users", user.uid), { 
                    name: displayName, // Set user's display name
                    email: user.email, // Set user's email
                    earlyCod: 'Standard', // Set default earlyCod
                    phone: phone, // Set user's phone number
                });
                // Send email verification to the user
                sendEmailVerification(user); 
                // Set success message
                setToastMessage('Verification email has been sent! Please verify before login.'); 
                // Show toast message
                setShowToast(true); 
                // Set loading state to false
                setCreateLoading(false); 
            })
            .catch((error) => { // Handle error in account creation
                // const errorCode = error.code; // Get error code
                const errorMessage = error.message; // Get error message
                // Set error message
                setToastMessage(errorMessage); 
                // Show toast message
                setShowToast(true);
                setCreateLoading(false);
            });
    }


    return (
        <div class="min-h-screen bg-[#003B49] text-gray-900 flex justify-center">
            <div class="max-w-screen-xl m-0 sm:m-10 bg-[#07847F] bg-opacity-5 shadow-lg sm:rounded-lg flex justify-center flex-1">
                <div class="lg:w-1/2 xl:w-5/12 p-6 sm:p-12">
                    <div>
                        <img src={logo} class="w-mx-auto" alt="Umaxship Logo"/>
                    </div>
                    <div class="flex flex-col items-center" style={{ marginTop: '-50px' }}>
                        <div class="w-full flex-1">
                            <div class="my-12 text-center">
                                <div
                                    class="leading-none px-2 inline-block text-sm text-gray-500 tracking-wide font-medium transform translate-y-1/2">
                                    Create your account using email address
                                </div>
                            </div>

                            <div class="mx-auto max-w-xs">
                                <input
                                    class="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white"
                                    type="text" placeholder="Full Name" onChange={e => setName(e.target.value)} />
                                <input
                                    class="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white mt-5"
                                    type="text" placeholder="Phone Number" onChange={e => setPhone(e.target.value)} />
                                <input
                                    class="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white mt-5"
                                    type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} />
                                <input
                                    class="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white mt-5"
                                    type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} autoComplete="new-password"/>
                                {
                                    showToast &&
                                    <p class="mt-6 text-sm text-gray-500 text-center">
                                        {toastMessage}
                                    </p>
                                }
                                {
                                    createLoading ?
                                        <button disabled type="button" class="mt-5 tracking-wide font-semibold bg-[#FF7D44] text-white w-full py-4 rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none">
                                            <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg" >
                                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                                            </svg>
                                            Loading...
                                        </button>
                                        :
                                        <button onClick={createAccount}
                                            class="mt-5 tracking-wide font-semibold bg-[#FF7D44] text-white-500 w-full py-4 rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none">
                                            <span class="ml- text-white">
                                                Create Account
                                            </span>
                                        </button>
                                }
                            </div>

                            <div class="my-12 text-center">
                                <div
                                    class="leading-none px-2 inline-block text-sm text-white tracking-wide font-medium transform translate-y-1/2">
                                    Already have an account?&nbsp;
                                    <a href="../login" class="border-b border-white border-dotted">
                                        Login Here
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex-1 bg-green-100 text-center hidden lg:flex">
                    <div class="w-full bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url(" + cargo + ")" }}>
                    </div> 
                </div>
            </div>
        </div>
    )
}

export default Register