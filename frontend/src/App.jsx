import React from "react";
import "./App.scss";
import { ThemeContext } from "./context/ThemeContext";
import { BrowserRouter as Router, Routes, Route, } from "react-router-dom";
import BaseLayout from "./layout/BaseLayout";
import { Dashboard, PageNotFound } from "./screens";
import Login from "./screens/auth/Login";
import Register from "./screens/auth/Register";
import Orders from "./screens/orders/Orders";
import Reports from "./screens/reports/Reports";
import Transactions from "./screens/transactions/Transactions";
import Ratecalc from "./screens/ratecalc/Ratecalc";
import Profile from "./screens/profile/Profile";
import Kyc from "./screens/kyc/Kyc";
import Warehouse from "./screens/wharehouse/Warehouse";
import CustomerSupport from "./screens/customersupport/CustomerSupport";
import Settings from "./screens/settings/Settings";
import Payments from "./screens/payments/Payments";
import Pricing from "./screens/pricing/Pricing";
import Processorders from "./screens/orders/Processorders";
import Cloneorders from "./screens/orders/Cloneorder";
import CloneorderB2b from "./screens/orders/CloneorderB2b";

/**
 * Main App Component
 *
 * This component serves as the root of the application and handles routing.
 * It sets up the application's layout and defines the routes for different pages.
 */
function App() {

  // Set default body classes for light mode
  document.body.classList.add("light-mode");
  document.body.classList.add("light");

  return (
    // Router component to handle navigation
    // Routes component to define the different routes of the application
    <Router>
      <Routes>
        <Route element={<BaseLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/addorders" element={<Orders />} />
          <Route path="/processorders" element={<Processorders />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/ratecalc" element={<Ratecalc />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/warehouse" element={<Warehouse />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/cloneorders" element={<Cloneorders />} />
          <Route path="/cloneorderb2b" element={<CloneorderB2b />} />
          <Route path="*" element={<Dashboard />} />
          {/* Customer Support Route */}
          <Route path="/customersupport" element={<CustomerSupport />} />
        </Route>
        {/* KYC Route */}
        <Route path="/kyc" element={<Kyc />} />
        {/* Login Route */}
        <Route path="/login" element={<Login />} />
        {/* Register Route */}
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  );
}

export default App;