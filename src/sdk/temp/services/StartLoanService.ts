/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StartLoanService {
    /**
     * Prepare loan start
     * Accepts parameters for starting a loan and returns a PSBT and a request UUID.
     * @returns any Successful response with loan start transaction details
     * @throws ApiError
     */
    public static postApiV1BorrowerLoansStartPrepare({
        requestBody,
    }: {
        /**
         * Payload for preparing loan start transaction
         */
        requestBody: {
            /**
             * UUID of the instant loan offer to be activated
             */
            instant_offer_id: string;
            /**
             * Transaction fee rate in satoshis per virtual byte (sat/vB)
             */
            fee_rate: number;
            /**
             * Amount of tokens/runes to use as collateral, expressed as a string representation of the raw value before decimal adjustment. For example, for a rune with 2 decimal places, a user amount of 800 would be entered as '80000' (800 * 10^2)
             */
            token_amount: string;
            /**
             * Bitcoin payment address of the borrower for receiving loan funds
             */
            borrower_payment_address: string;
            /**
             * Public key corresponding to the borrower's payment address
             */
            borrower_payment_pubkey: string;
            /**
             * Taproot address of the borrower for handling ordinals and inscriptions
             */
            borrower_ordinal_address: string;
            /**
             * Public key corresponding to the borrower's taproot address
             */
            borrower_ordinal_pubkey: string;
            /**
             * Type of wallet used for login
             */
            borrower_wallet: 'xverse' | 'orange';
        },
    }): CancelablePromise<{
        /**
         * ID of the prepared loan activation transaction
         */
        prepare_offer_id: string;
        /**
         * Base64-encoded Partially Signed Bitcoin Transaction (PSBT) that requires borrower signature
         */
        base64_psbt: string;
        /**
         * List of all inputs in the transaction that require signatures, with their signing parameters
         */
        sides: Array<{
            /**
             * Zero-based index of this input in the PSBT transaction
             */
            index: number;
            /**
             * Bitcoin address associated with this input, or null if not available
             */
            address: string | null;
            /**
             * Signature hash type for this input (1=ALL, 2=NONE, 3=SINGLE, etc.), or null if not applicable
             */
            sighash: number | null;
            /**
             * Should tweaking be disabled
             */
            disable_tweak_signer: boolean;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/borrower/loans/start/prepare',
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
     * Submit loan start
     * Submits the signed loan transaction to complete loan origination.
     * @returns any Successful response confirming loan origination
     * @throws ApiError
     */
    public static postApiV1BorrowerLoansStartSubmit({
        requestBody,
    }: {
        /**
         * Payload for submitting loan start transaction
         */
        requestBody: {
            /**
             * Base64-encoded signed PSBT transaction with borrower's signature to activate the loan
             */
            signed_psbt_base_64: string;
            /**
             * ID of the prepared loan activation transaction received from the prepare-start endpoint
             */
            prepare_offer_id: string;
        },
    }): CancelablePromise<{
        /**
         * Bitcoin transaction ID (txid) of the successfully broadcasted loan activation transaction
         */
        loan_transaction_id: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/borrower/loans/start/submit',
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
