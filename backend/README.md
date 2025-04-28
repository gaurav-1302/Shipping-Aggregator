# Umaxship Cloud Functions

## Overview

This project contains the backend Cloud Functions for the Umaxship Shipping and Logistics Management platform, built on Firebase. These functions handle various core functionalities, including:

*   **Courier Integration:** Connecting with multiple courier services via their APIs.
*   **Order Management:** Creating orders in integrated courier portals (Delhivery, XpressBees, Shiprocket) based on Firestore triggers.
*   **Shipment Tracking:** Fetching and updating shipment statuses from courier APIs (Delhivery B2C, Delhivery B2B, XpressBees) via scheduled tasks and on-demand requests.
*   **Warehouse Management:** Dynamically creating and managing warehouse/pickup locations across different courier platforms (Delhivery B2B, Shiprocket).
*   **Payment Processing:** Integrating with Razorpay and Cashfree for payment order generation, validation, and webhook handling.
*   **Rate Calculation:** Providing real-time shipping rate calculations by querying multiple courier APIs.
*   **Pickup & Labeling:** Generating pickup requests and shipping labels.
*   **COD Remittance:** Managing Cash on Delivery payment cycles and statuses.
*   **Order Cancellation:** Handling order cancellations and processing wallet refunds.
*   **User Management:** Retrieving aggregated user details.
*   **Token Management:** Automatically refreshing API authentication tokens for courier services.

## Live Demo & Mobile App

**Please note:** This codebase is primarily intended for **showcase purposes**.

*   To experience the live Umaxship platform, please visit: **[umaxship.com](https://www.umaxship.com)**
*   A mobile application for Umaxship is also available on the Google Play Store: **[Umaxship on Google Play](https://play.google.com/store/apps/details?id=com.atirun.umaxship)**

## Features

*   **Multi-Courier Integration:** Seamlessly works with Delhivery (B2C & B2B), XpressBees, and Shiprocket.
*   **Real-time Updates:** Utilizes Firestore triggers for automated workflows based on data changes (e.g., creating shipments when order status changes).
*   **Scheduled Tasks:** Regularly tracks shipments and refreshes API tokens using Cloud Scheduler.
*   **Payment Gateway Integration:** Supports Razorpay and Cashfree for secure online payments and wallet top-ups.
*   **Dynamic Rate Engine:** Calculates shipping costs across multiple partners based on package details and pincodes.
*   **Webhook Support:** Handles incoming webhooks from payment gateways (Cashfree) and courier services (Delhivery B2B Label).
*   **Wallet System:** Manages user wallet balances for shipping charges and refunds.

## Setup and Installation (For Showcase/Development)

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-folder>/functions
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Firebase Configuration:**
    *   Place your Firebase Admin SDK service account key file named `umaxship-firebase.json` inside the `functions` directory. You can download this from your Firebase project settings.
    *   Ensure your Firebase project has Firestore, Cloud Functions, and Cloud Scheduler enabled.

    * You need to set these environment variables in your Firebase project configuration. You can do this using the Firebase CLI tool. Replace the placeholder values with your actual credentials:
    ```bash
    firebase functions:config:set \
    firebase.project_id="YOUR_PROJECT_ID" \
    firebase.client_email="your-service-account@your-project-id.iam.gserviceaccount.com" \
    firebase.private_key="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_LINE_1\nYOUR_PRIVATE_KEY_LINE_2\n-----END PRIVATE KEY-----\n" \
    firebase.database_url="YOUR_REALTIME_DB_URL" \
    shiprocket.email="YOUR_SHIPROCKET_EMAIL" \
    shiprocket.password="YOUR_SHIPROCKET_PASSWORD" \
    delhivery_b2b.username="YOUR_DELHIVERY_B2B_USERNAME" \
    delhivery_b2b.password="YOUR_DELHIVERY_B2B_PASSWORD" \
    xpressbees.email="YOUR_XPRESSBEES_EMAIL" \
    xpressbees.password="YOUR_XPRESSBEES_PASSWORD" \
    delhivery.api_key="YOUR_DELHIVERY_B2C_API_KEY" \
    razorpay.key_id="YOUR_RAZORPAY_KEY_ID" \
    razorpay.key_secret="YOUR_RAZORPAY_SECRET" \
    delhivery_b2b_label_callback.url="YOUR_CALLBACK_URL_FOR_B2B_LABELS" \
    cashfree.webhook_secret="YOUR_CASHFREE_WEBHOOK_SECRET"

    # After setting, deploy your functions for the changes to take effect:
firebase deploy --only functions
    ```

4.  **Credential Configuration (Important Security Note):**
    *   **Crucially, the current code stores sensitive API keys and credentials directly within `index.js`. This is highly insecure and not recommended for production.**
    *   **You MUST replace the placeholder values in `index.js` with your actual credentials if you intend to run this code.**
    *   **Strongly consider refactoring to use Firebase Functions environment configuration or a secret management service (like Google Secret Manager) to store these secrets securely.**
    *   **Credentials/Placeholders to update:**
        *   Firebase Realtime Database URL (`databaseURL` in `admin.initializeApp`)
        *   Shiprocket email & password (`generateShiprocketAuthToken` function)
        *   Delhivery B2B username & password (`getDelhiveryToken` function)
        *   XpressBees email & password (`getXpreessBeesToken` function)
        *   Delhivery API Keys (various functions like `trackDelhivery`, `orderDelhivery`, `createWarehouses`, `calculateRate`, `createPickupRequest`, `generateShippingLabel`, `cancelOrder`)
        *   Razorpay `key_id` & `key_secret` (`generateRazorpayOrderId`, `validateRazorpayPayment` functions)
        *   B2B Delhivery Label Webhook `callbackUrl` (`generateShippingLabel` function)

5.  **Deploy Functions (If running your own instance):**
    ```bash
    firebase deploy --only functions
    ```

## Cloud Functions

This project deploys several types of Cloud Functions:

*   **HTTPS Callable Functions:** Triggered via HTTP requests. Used for actions like calculating rates, generating labels, creating pickups, processing payments, and fetching user/tracking data.
    *   `generateRazorpayOrderId`
    *   `validateRazorpayPayment`
    *   `dynamicWarehouse` (Potentially for manual/initial setup)
    *   `calculateRate`
    *   `createPickupRequest`
    *   `generateShippingLabel`
    *   `getTrackingDelhivery`
    *   `calculateRateBToB`
    *   `getUserDetails`
    *   `getAllTransactions`
    *   `trackWebOrder`
*   **Webhook Handlers:** HTTPS functions designed to receive data from external services.
    *   `cashfreeWebhookHandler`
    *   `B2BDelhiveryLabel`
*   **Firestore Triggers:** Functions that run in response to changes in Firestore documents.
    *   `createWarehouses` (`onDocumentCreated` in `warehouses`)
    *   `createOrder` (`onDocumentUpdated` in `orders`)
    *   `handleCODRemittances` (`onDocumentUpdated` in `orders`)
    *   `updateTransactions` (`onDocumentCreated` in `cashfreepayments`)
    *   `cancelOrder` (`onDocumentUpdated` in `orders`)
*   **Scheduled Functions (Pub/Sub):** Functions triggered on a defined schedule.
    *   `trackShipments` (Runs every 3 hours)
    *   `scheduledTokenRefreshB2B` (Runs every 24 hours for Delhivery B2B)
    *   `generateShiprocketAuthToken` (Schedules itself to run every 9 days)

## Contributing

Contributions are welcome! Please follow standard fork-and-pull-request workflows. Ensure code quality and add tests where applicable.

## License

This project is licensed under the terms specified in the LICENSE file. Copyright (c) 2024 Atirun Techs Pvt Ltd and Developers (Gaurav Singh, Garvit Varshney, Shivansh Srivastava, Rishabh Saxena).
