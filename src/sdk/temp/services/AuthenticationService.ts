/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthenticationService {
    /**
     * Prepare authentication
     * Initiates authentication process and returns a challenge for signing.
     * @returns any Successful response with authentication challenge
     * @throws ApiError
     */
    public static postApiV1AuthPrepare({
        requestBody,
    }: {
        /**
         * Authentication preparation parameters
         */
        requestBody: {
            /**
             * Payment address for the wallet (can be same as ordinals address)
             */
            payment_address: string;
            /**
             * Ordinals address for the wallet
             */
            ordinals_address: string;
            /**
             * Wallet used for login
             */
            wallet: string;
        },
    }): CancelablePromise<{
        /**
         * Signing information for the payment address (if different from ordinals)
         */
        payment?: Record<string, any>;
        /**
         * Signing information for the ordinals address
         */
        ordinals: Record<string, any>;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/prepare',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request - The request was malformed or contained invalid parameters`,
                401: `Unauthorized - Authentication is required or the provided credentials are invalid`,
                403: `Forbidden - The authenticated user doesn't have permission to access this resource`,
                404: `Not Found - The requested resource does not exist`,
                405: `Not Found - The requested resource does not exist`,
                409: `Conflict - The request conflicts with the current state of the server`,
                422: `Unprocessable Entity - The request was well-formed but contains semantic errors`,
                429: `Too Many Requests - Rate limit exceeded, please try again later`,
                500: `Internal Server Error - An unexpected error occurred on the server`,
            },
        });
    }
    /**
     * Submit authentication
     * Completes authentication process by submitting signed challenge.
     * @returns any Successful response with authentication token
     * @throws ApiError
     */
    public static postApiV1AuthSubmit({
        requestBody,
    }: {
        /**
         * Authentication submission parameters
         */
        requestBody: {
            /**
             * Signature validation information for the payment address. Only required if using a separate payment address for transactions. If omitted, the ordinals address will be used for all transactions.
             */
            payment?: {
                /**
                 * Bitcoin address that signed the authentication message
                 */
                address?: string;
                /**
                 * Cryptographic signature produced by the wallet when signing the message
                 */
                signature?: string;
                /**
                 * One-time cryptographic nonce that was included in the signed message
                 */
                nonce?: string;
            };
            /**
             * Signature validation information for the ordinals (taproot) address. This is always required.
             */
            ordinals: {
                /**
                 * Bitcoin ordinals address that signed the authentication message
                 */
                address?: string;
                /**
                 * Cryptographic signature produced by the wallet when signing the message
                 */
                signature?: string;
                /**
                 * One-time cryptographic nonce that was included in the signed message
                 */
                nonce?: string;
            };
        },
    }): CancelablePromise<{
        /**
         * JSON Web Token (JWT) for authenticating subsequent API requests
         */
        user_jwt: string;
        /**
         * Flag indicating whether this is the first time the user has logged in with address pair
         */
        is_first_login: boolean;
        /**
         * Bitcoin address of the user's instant loan vault (only required for lenders, used for creating loan offers)
         */
        vault_address?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/submit',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request - The request was malformed or contained invalid parameters`,
                401: `Unauthorized - Authentication is required or the provided credentials are invalid`,
                403: `Forbidden - The authenticated user doesn't have permission to access this resource`,
                404: `Not Found - The requested resource does not exist`,
                405: `Not Found - The requested resource does not exist`,
                409: `Conflict - The request conflicts with the current state of the server`,
                422: `Unprocessable Entity - The request was well-formed but contains semantic errors`,
                429: `Too Many Requests - Rate limit exceeded, please try again later`,
                500: `Internal Server Error - An unexpected error occurred on the server`,
            },
        });
    }
}
