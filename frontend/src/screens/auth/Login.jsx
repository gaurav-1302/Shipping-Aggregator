import React, { useState, useEffect } from "react";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase.config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

const logo = require("../../assets/umax-logo.png");
const cargo = require("../../assets/images/login.png");

/**
 * Login component for user authentication.
 *
 * This component handles user login, password reset, and navigation.
 * It interacts with Firebase for authentication and Firestore for user data.
 */
function Login() {
  const navigate = useNavigate();

  /**
   * useEffect hook to check if a user is already logged in.
   * If a user is found in local storage, they are redirected to the dashboard.
   * Otherwise, they remain on the login page.
   */
  useEffect(() => {
    const user = window.localStorage.getItem("umaxshipuser");
    if (user === null || user === undefined || user === "") {
      navigate("/login/");
    } else {
      navigate("/dashboard");
    }
  }, [navigate]);

  // State variables for managing the component's UI and data.
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signinLoading, setSigninLoading] = useState(false);

  /**
   * Handles the successful login process.
   *
   * This function signs in the user with email and password,
   * stores the authentication token and user data,
   * and creates a user document in Firestore if it doesn't exist.
   */
    const handleSuccessfulLogin = async () => {
        setShowToast(false);
        setSigninLoading(true);

        signInWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                console.log(user);
                if (user) {                    
                    sessionStorage.setItem('Auth Token', userCredential._tokenResponse.refreshToken);
                    localStorage.setItem('umaxshipuser', JSON.stringify(user));                    
                    const docRef = doc(db, "users", user.uid);                    
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        // No action as user document exist 
                    } else {
                        await setDoc(doc(db, "users", user.uid), {
                            name: user.displayName,
                            email: user.email,
                            earlyCod: 'Standard'
                        });
                    }
                    navigate('/');                    
                    setSigninLoading(false);
                } else {
                    setToastMessage('Error in login! Please try again after sometime.');                    
                    setShowToast(true);
                    setSigninLoading(false);
                }
            })
            .catch((error) => {
                setToastMessage('Invalid login credentials');
                setShowToast(true);
                setSigninLoading(false);
            });
    };

    /**
     * Handles the password reset process.
     *
     * Sends a password reset email to the user's email address.
     */
    const resetPassword = () => {
        sendPasswordResetEmail(auth, email)
            .then(() => {
                setToastMessage('Password reset link has been sent to your email successfully.');                
                setShowToast(true);
            })
            .catch((error) => {
                setToastMessage('Error in sending password reset link. Trying again after sometime.');                
                setShowToast(true);
            });
    }


    return (
        <div class="min-h-screen bg-[#003B49] text-gray-900 flex justify-center">
            <div class="max-w-screen-xl m-0 sm:m-10 bg-[#07847F] bg-opacity-5 shadow-lg sm:rounded-lg flex justify-center flex-1">
                <div class="lg:w-1/2 xl:w-5/12 p-6 sm:p-12">
                    <div>
                        <img src={logo} class="w-mx-auto" />
                    </div>
                    <div class="flex flex-col items-center" style={{ marginTop: '-50px' }}>
                        <div class="w-full flex-1">
                            <div class="my-12 text-center">
                                <div
                                    class="leading-none px-2 inline-block text-sm text-gray-500 tracking-wide font-medium transform translate-y-1/2">
                                    Sign In using email & password
                                </div>
                            </div>

                            <div class="mx-auto max-w-xs">
                                <input
                                    class="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white"
                                    type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} />
                                <input
                                    class="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white mt-5"
                                    type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
                                {
                                    showToast &&
                                    <p class="mt-6 text-sm text-gray-500 text-center">
                                        {toastMessage}
                                    </p>
                                }
                                {
                                    signinLoading ?
                                        <button disabled type="button" class="mt-5 tracking-wide font-semibold bg-[#FF7D44] text-white-500 w-full py-4 rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none">
                                            <svg aria-hidden="true" role="status" class="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                                            </svg>
                                            Loading...
                                        </button>
                                        :
                                        <button onClick={handleSuccessfulLogin}
                                            class="mt-5 tracking-wide font-semibold bg-[#FF7D44] text-white-500 w-full py-4 rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none">
                                            <span class="ml- text-white">
                                                Sign In
                                            </span>
                                        </button>
                                }
                                <p class="mt-6 text-sm text-gray-500 text-right">
                                    Forgot Password?&nbsp;
                                    <a onClick={resetPassword} class="border-b border-white border-dotted">
                                        Click to reset
                                    </a>
                                </p>
                            </div>

                            <div class="my-12 text-center">
                                <div
                                    class="leading-none px-2 inline-block text-sm text-white tracking-wide font-medium transform translate-y-1/2">
                                    Don't have an account?&nbsp;
                                    <a href="/register" class="border-b border-white border-dotted">
                                        Register Here
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

export default Login;