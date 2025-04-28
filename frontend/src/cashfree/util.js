/**
 * @module CashfreeUtility
 * @description This module initializes and exports the Cashfree SDK instance.
 * It sets up the Cashfree environment for production use.
 */
import { load } from '@cashfreepayments/cashfree-js';

/**
 * @constant {Promise<Cashfree>} cashfree
 * @description A promise that resolves with an initialized Cashfree SDK instance.
 * The SDK is configured for production mode.
 */
export const cashfree = await load({
    mode: "production"
});