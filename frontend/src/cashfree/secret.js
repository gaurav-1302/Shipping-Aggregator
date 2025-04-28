/**
 * Configuration module for Cashfree API credentials.
 * This module exports the secret key and app ID required for Cashfree API interactions.
 */
module.exports = {
    // Retrieve the Cashfree secret key from environment variables.
    secret_key: process.env.REACT_APP_CASHFREE_KEY,
    // Retrieve the Cashfree app ID from environment variables.
    app_id: process.env.REACT_APP_CASHFREE_APP_ID
}