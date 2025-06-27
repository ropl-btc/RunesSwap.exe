/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class PortfolioService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get user portfolio
     * Retrieves complete portfolio including both lending and borrowing offers for a user based on authentication.
     * @returns any Successful response with portfolio details including lending and borrowing positions
     * @throws ApiError
     */
    public getApiV1Portfolio(): CancelablePromise<{
        lender: {
            runes: {
                offers: Array<{
                    /**
                     * ID of the instant offer
                     */
                    id: string;
                    instant_offer_details: {
                        /**
                         * Current state of the instant offer
                         */
                        state: string;
                        /**
                         * Address of the vault holding the collateral
                         */
                        vault_address: string;
                        /**
                         * Public key of the vault
                         */
                        vault_pubkey: string;
                        /**
                         * Duration of the loan term in days
                         */
                        loan_term_days: number;
                        /**
                         * Interest rate percentage for the loan term
                         */
                        interest_rate_percentage: number;
                        /**
                         * Original loan principal amount in satoshis
                         */
                        principal_amount_sats: number;
                        /**
                         * Auto-used principal amount in satoshis
                         */
                        auto_principal_amount_used_sats: number;
                        /**
                         * Maximum loan-to-value ratio for the offer
                         */
                        ltv_max: number;
                    };
                    collateral_details: {
                        /**
                         * Unique identifier for the rune token used as collateral
                         */
                        rune_id: string;
                        /**
                         * Type of asset used as collateral (Rune, Brc20, Inscription)
                         */
                        collateral_type: 'Rune' | 'Brc20' | 'Inscription';
                        /**
                         * Number of decimal places for the rune token (0-32)
                         */
                        rune_divisibility: number;
                        /**
                         * Amount of rune tokens used as collateral (in user-friendly display format)
                         */
                        rune_amount: number;
                    };
                }>;
                loans: Array<{
                    /**
                     * ID of the loan offer in the system
                     */
                    id: string;
                    loan_details: {
                        /**
                         * Current state of the loan offer (OFFERED, ACCEPTED, ACTIVE, REPAID, etc.)
                         */
                        state: 'OFFERED' | 'ACCEPTED' | 'ACTIVATING' | 'ACTIVE' | 'REPAYING' | 'REPAID' | 'DEFAULTED' | 'CLAIMING' | 'CLAIMED' | 'LIQUIDATING' | 'LIQUIDATED' | 'CANCELLED' | 'FAILED';
                        /**
                         * Total amount required for repayment taking the borrowers discount and interest amount into consideration
                         */
                        total_repayment_sats: number;
                        /**
                         * Original loan principal amount in satoshis
                         */
                        principal_amount_sats: number;
                        /**
                         * Duration of the loan term in days
                         */
                        loan_term_days: number;
                        /**
                         * Deadline for loan repayment in ISO 8601 format. Should not be null unless there is an internal error.
                         */
                        loan_term_end_date: string;
                        /**
                         * Date when the loan was activated in ISO 8601 format. Should not be null unless there is an internal error.
                         */
                        start_date: string;
                        /**
                         * Bitcoin address holding the collateral during the loan term
                         */
                        escrow_address: string;
                        discount: {
                            /**
                             * Discount percentage on liquidium fee due to holding liquidium token
                             */
                            discount_rate: number;
                            /**
                             * Discount sats on liquidium fee due to holding liquidium token
                             */
                            discount_sats: number;
                        };
                    };
                    collateral_details: {
                        /**
                         * Unique identifier for the rune token used as collateral
                         */
                        rune_id: string;
                        /**
                         * Type of asset used as collateral (Rune, Brc20, Inscription)
                         */
                        collateral_type: 'Rune' | 'Brc20' | 'Inscription';
                        /**
                         * Number of decimal places for the rune token (0-32)
                         */
                        rune_divisibility: number;
                        /**
                         * Amount of rune tokens used as collateral (in user-friendly display format)
                         */
                        rune_amount: number;
                    };
                }>;
            };
        };
        borrower: {
            runes: {
                loans: Array<{
                    /**
                     * ID of the loan offer in the system
                     */
                    id: string;
                    loan_details: {
                        /**
                         * Current state of the loan offer (OFFERED, ACCEPTED, ACTIVE, REPAID, etc.)
                         */
                        state: 'OFFERED' | 'ACCEPTED' | 'ACTIVATING' | 'ACTIVE' | 'REPAYING' | 'REPAID' | 'DEFAULTED' | 'CLAIMING' | 'CLAIMED' | 'LIQUIDATING' | 'LIQUIDATED' | 'CANCELLED' | 'FAILED';
                        /**
                         * Total amount required for repayment taking the borrowers discount and interest amount into consideration
                         */
                        total_repayment_sats: number;
                        /**
                         * Original loan principal amount in satoshis
                         */
                        principal_amount_sats: number;
                        /**
                         * Duration of the loan term in days
                         */
                        loan_term_days: number;
                        /**
                         * Deadline for loan repayment in ISO 8601 format. Should not be null unless there is an internal error.
                         */
                        loan_term_end_date: string;
                        /**
                         * Date when the loan was activated in ISO 8601 format. Should not be null unless there is an internal error.
                         */
                        start_date: string;
                        /**
                         * Bitcoin address holding the collateral during the loan term
                         */
                        escrow_address: string;
                        discount: {
                            /**
                             * Discount percentage on liquidium fee due to holding liquidium token
                             */
                            discount_rate: number;
                            /**
                             * Discount sats on liquidium fee due to holding liquidium token
                             */
                            discount_sats: number;
                        };
                    };
                    collateral_details: {
                        /**
                         * Unique identifier for the rune token used as collateral
                         */
                        rune_id: string;
                        /**
                         * Type of asset used as collateral (Rune, Brc20, Inscription)
                         */
                        collateral_type: 'Rune' | 'Brc20' | 'Inscription';
                        /**
                         * Number of decimal places for the rune token (0-32)
                         */
                        rune_divisibility: number;
                        /**
                         * Amount of rune tokens used as collateral (in user-friendly display format)
                         */
                        rune_amount: number;
                    };
                }>;
            };
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/portfolio',
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
