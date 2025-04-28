# Umaxship - Shipping Aggregator Platform

## Overview

Umaxship is an advanced Shipping and Logistics Management platform designed to streamline shipping operations for businesses. It serves as a one-stop solution for managing couriers, tracking shipments, calculating shipping rates, and much more. The platform is divided into two primary components:

1. **Backend (Cloud Functions)**: Built using Firebase, it handles core functionalities such as courier integration, order management, shipment tracking, warehouse management, payment processing, and API token management.
2. **Frontend (React)**: Provides an intuitive and user-friendly interface for businesses to manage their shipping activities.

**Live Availability:**
- **Web Application**: [www.umaxship.com](https://www.umaxship.com)
- **Mobile Application**: Available on the Google Play Store (search for "Umaxship").

---

## Features

### Backend Features
- **Courier Integration**: Connects with multiple courier APIs (Delhivery, XpressBees, Shiprocket) for seamless order and shipment management.
- **Order Management**: Automates order creation, tracking, and cancellation.
- **Shipment Tracking**: Fetches and updates shipment statuses in real time.
- **Warehouse Management**: Dynamically manages warehouse and pickup locations.
- **Payment Processing**: Integrates with Razorpay and Cashfree for secure payments.
- **Rate Calculation**: Offers real-time shipping rate calculations across multiple courier partners.
- **Pickup & Labeling**: Supports generating pickup requests and shipping labels.
- **COD Remittance**: Manages Cash on Delivery payment cycles.
- **Scheduled Tasks**: Automates token refresh and shipment tracking with Cloud Scheduler.
- **Multi-Courier Support**: Works with B2C and B2B models for various courier services.

### Frontend Features
- **Dashboard**: Provides an overview of shipping activities.
- **Order Management**: Enables adding, processing, and cloning orders.
- **Reports**: Displays comprehensive shipping and transaction reports.
- **Rate Calculator**: Calculates shipping costs based on package details and destination.
- **User Management**: Allows users to manage their profiles and account settings.
- **Warehouse Management**: Simplifies warehouse and pickup location management.
- **Payment Integration**: Facilitates payment management and wallet top-ups.
- **KYC Verification**: Supports Know Your Customer (KYC) processes.
- **Theming**: Offers light and dark mode for enhanced user experience.
- **Authentication**: Secure user login and registration.

---

## Technology Stack

### Backend
- **Firebase Cloud Functions**: Core backend service for implementing business logic.
- **Firestore**: Database for storing shipping data in real time.
- **Cloud Scheduler**: Automates recurring tasks like token refresh and shipment tracking.
- **Payment Integrations**: Razorpay and Cashfree for secure payment processing.
- **Courier APIs**: Delhivery, XpressBees, Shiprocket for courier integration.

### Frontend
- **React**: JavaScript library for building the user interface.
- **SCSS**: Advanced styling for the application.
- **React Router**: Declarative routing for seamless navigation.
- **Context API**: State management for global application data.

---

## Setup Instructions

### Backend
1. Clone the repository:
   ```bash
   git clone https://github.com/gaurav-1302/shipping-aggregator
   cd shipping-aggregator/backend/functions
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Firebase:
   - Place the Firebase Admin SDK service account key (`umaxship-firebase.json`) in the `functions` directory.
   - Set environment variables using the Firebase CLI:
     ```bash
     firebase functions:config:set \
     firebase.project_id="YOUR_PROJECT_ID" \
     firebase.client_email="your-service-account@your-project-id.iam.gserviceaccount.com" \
     firebase.private_key="YOUR_PRIVATE_KEY" \
     ...
     ```
4. Deploy the functions:
   ```bash
   firebase deploy --only functions
   ```

### Frontend
1. Clone the repository:
   ```bash
   git clone https://github.com/gaurav-1302/shipping-aggregator
   cd shipping-aggregator/frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the project root and add the required environment variables:
   ```env
   REACT_APP_API_BASE_URL=https://api.yourbackend.com
   ```
4. Run the development server:
   ```bash
   npm start
   ```

---

## Deployment

- **Backend**: Deployed on Firebase using `firebase deploy`.
- **Frontend**: Deployed on a live server and accessible at [www.umaxship.com](https://www.umaxship.com).

---

## Development Team

- **Gaurav Singh**
- **Garvit Varshney**
- **Shivansh Srivastava**
- **Rishabh Saxena**

---

## License

This project is licensed under the terms specified in the LICENSE file. All rights reserved by Developers.
