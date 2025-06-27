/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RepayLoanService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Prepare loan repayment
     * Accepts parameters for loan repayment and returns a PSBT and a request UUID.
     * @returns any Successful response with repayment transaction details
     * @throws ApiError
     */
    public postApiV1BorrowerLoansRepayPrepare({
        requestBody,
    }: {
        /**
         * Payload for preparing loan repayment
         */
        requestBody: {
            /**
             * ID of the active loan offer to be repaid
             */
            offer_id: string;
            /**
             * Transaction fee rate in satoshis per virtual byte (sat/vB)
             */
            fee_rate: number;
        },
    }): CancelablePromise<{
        /**
         * UUID of the loan offer being repaid (echoed from request)
         */
        offer_id: string;
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
        utxo_content: {
            /**
             * Warning flag indicating that selected UTXOs contain runes that will be spent in this transaction. A utxo containing runes is only chosen as a last resort
             */
            contains_runes: boolean;
            /**
             * Warning flag indicating that selected UTXOs contain inscriptions that will be spent in this transaction. A utxo containing runes is only chosen as a last resort
             */
            contains_inscriptions: boolean;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/borrower/loans/repay/prepare',
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
     * Submit loan repayment
     * Submits the signed repayment transaction to complete loan repayment.
     * @returns any Successful response confirming repayment completion
     * @throws ApiError
     */
    public postApiV1BorrowerLoansRepaySubmit({
        requestBody,
    }: {
        /**
         * Payload for submitting loan repayment transaction
         */
        requestBody: {
            /**
             * ID of the loan offer being repaid
             */
            offer_id: string;
            /**
             * Base64-encoded signed PSBT transaction with borrower's signature
             */
            signed_psbt_base_64: string;
        },
    }): CancelablePromise<{
        /**
         * Bitcoin transaction ID (txid) of the successfully broadcasted loan repayment transaction
         */
        repayment_transaction_id: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/borrower/loans/repay/submit',
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
