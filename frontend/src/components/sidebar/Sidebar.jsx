import { useContext, useEffect, useRef } from "react"; // Import necessary hooks from React
import { useNavigate } from 'react-router-dom';
import {
  MdOutlineAttachMoney,
  MdOutlineClose,
  MdOutlineCurrencyExchange,
  MdOutlineGridView,
  MdOutlineLogout, // Import necessary icons from react-icons
  MdOutlineSettings,
  MdOutlineWarehouse
} from "react-icons/md";
import { IoBagAddSharp, IoBagCheckOutline } from "react-icons/io5";
import { TbReportAnalytics } from "react-icons/tb";
import { IoCalculator } from "react-icons/io5";
import { Link, useLocation } from "react-router-dom"; // Import necessary components from react-router-dom
import { MdReportGmailerrorred } from "react-icons/md";
import "./Sidebar.scss";
import { SidebarContext } from "../../context/SidebarContext";
import { useSignOut } from 'react-firebase-hooks/auth';
import { auth } from "../../firebase.config";

// Import the logo image
const logo = require('../../assets/umax-logo.png');

/**
 * Sidebar Component
 * This component renders the sidebar navigation menu.
 */
const Sidebar = () => {

  const navigate = useNavigate();

  const { isSidebarOpen, closeSidebar } = useContext(SidebarContext);

  const navbarRef = useRef(null);

  const location = useLocation();
  const currentPath = location.pathname;

  // console.log(currentPath);

  // closing the navbar when clicked outside the sidebar area
  const handleClickOutside = (event) => {
    if (
      navbarRef.current &&
      !navbarRef.current.contains(event.target) &&
      event.target.className !== "sidebar-oepn-btn"
    ) {
      closeSidebar();
    }
  };

  // Add and remove the event listener for outside clicks
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /**
   * Closes the sidebar by applying a CSS transform.
   */
  const clsSidebar = () => {
    const sidebar = document.getElementsByClassName('sidebar')[0];

    if (sidebar) {
      sidebar.style.transform = 'translateX(-100%)';
    }
  }

  // Check if the user is logged in, otherwise redirect to the login page
  useEffect(() => {
    // Retrieve the user data from local storage

    const user = window.localStorage.getItem('umaxshipuser');
    if (user === null || user === undefined || user === '') {
      navigate('/login/')
    }
  }, [])

  const [signOut, loading, error] = useSignOut(auth);


  return (
    <nav
      className={`sidebar ${isSidebarOpen ? "sidebar-show" : ""} bg-[#003B49]`}
      ref={navbarRef}
    >
      <div className="sidebar-top">
        <div className="sidebar-brand justify-center w-full">
          <div style={{ marginTop: -5, width: 185, alignSelf: 'center' }}>
            <img src={logo} alt="" />
          </div>
        </div>
        <button className="sidebar-close-btn" onClick={clsSidebar}>
          <MdOutlineClose size={24} />
        </button>
      </div>
      <div className="sidebar-body divide-y divide-gray-100">
        <div className="sidebar-menu">
          <ul className="menu-list">
            {/* Dashboard */}
            <li className="menu-item">
              <Link to="/" className={currentPath == '/dashboard' || currentPath == '/' ? "menu-link active" : "menu-link"}>
                <span className="menu-link-icon">
                  <MdOutlineGridView size={18} color="white" />
                </span>
                <span className="menu-link-text">Dashboard</span>
              </Link>
            </li>
            {/* Add Orders */}
            <li className="menu-item">
              <Link to="/addorders" className={currentPath == '/addorders' ? "menu-link active" : "menu-link"}>
                <span className="menu-link-icon">
                  <IoBagAddSharp size={20} color="white" />
                </span>
                <span className="menu-link-text">Add Orders</span>
              </Link>
              {/* Process Orders */}
            </li>
            <li className="menu-item">
              <Link to="/processorders" className={currentPath == '/processorders' ? "menu-link active" : "menu-link"}>
                <span className="menu-link-icon">
                  <IoBagCheckOutline size={20} color="white" />
                </span>
                <span className="menu-link-text">Process Orders</span>
              </Link>
              {/* Reports */}
            </li>
            <li className="menu-item">
              <Link to="/reports" className={currentPath == '/reports' ? "menu-link active" : "menu-link"}>
                <span className="menu-link-icon">
                  <TbReportAnalytics size={20} color="white" />
                </span>
                <span className="menu-link-text">Reports</span>
              </Link>
              {/* Remittance */}
            </li>
            <li className="menu-item">
              <Link to="/payments" className={currentPath == '/payments' ? "menu-link active" : "menu-link"}>
                <span className="menu-link-icon">
                  <MdOutlineAttachMoney size={20} color="white" />
                </span>
                <span className="menu-link-text">Remittance</span>
              </Link>
              {/* Transactions */}
            </li>
            <li className="menu-item">
              <Link to="/transactions" className={currentPath == '/transactions' ? "menu-link active" : "menu-link"}>
                <span className="menu-link-icon">
                  <MdOutlineCurrencyExchange size={18} color="white" />
                </span>
                <span className="menu-link-text">Transactions</span>
              </Link>
              {/* Warehouse */}
            </li>
            <li className="menu-item">
              <Link to="/warehouse" className={currentPath == '/warehouse' ? "menu-link active" : "menu-link"}>
                <span className="menu-link-icon">
                  <MdOutlineWarehouse size={18} color="white" />
                </span>
                <span className="menu-link-text">Warehouse</span>
              </Link>
              {/* Rate Calculator */}
            </li>
            <li className="menu-item">
              <Link to="/ratecalc" className={currentPath == '/ratecalc' ? "menu-link active" : "menu-link"}>
                <span className="menu-link-icon">
                  <IoCalculator size={18} color="white" />
                </span>
                <span className="menu-link-text">Rate Calculator</span>
              </Link>
              {/* Customer Support */}
            </li>
            <li className="menu-item">
              <Link to="/customersupport" className={currentPath == '/customersupport' ? "menu-link active" : "menu-link"}>
                <span className="menu-link-icon">
                  <MdReportGmailerrorred size={18} color="white" />
                </span>
                <span className="menu-link-text">Customer Support</span>
              </Link>
            </li>
          </ul>
        </div>

        <div className="sidebar-menu sidebar-menu2">
          <ul className="menu-list">
            {/* Settings */}
            <li className="menu-item mt-1">
              <Link to="/settings" className={currentPath == '/settings' ? "menu-link active" : "menu-link"}>
                <span className="menu-link-icon">
                  <MdOutlineSettings size={20} color="white" />
                </span>
                <span className="menu-link-text">Settings</span>
              </Link>
            </li>
            {/* Logout */}
            <li className="menu-item"
              onClick={async () => {
                // Sign out the user
                const success = await signOut();
                if (success) {
                  // Remove user data from local storage and session storage
                  localStorage.removeItem('umaxshipuser');
                  sessionStorage.removeItem('Auth Token');
                  // Alert the user that they have been logged out
                  alert('You are logged out');
                  // Navigate to the login page
                  navigate('/login/');
                }
              }}
            >
              <Link to="/" className="menu-link">
                <span className="menu-link-icon">
                  <MdOutlineLogout size={20} color="white" />
                </span>
                <span className="menu-link-text">Logout</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav >
  );
};

export default Sidebar;
