/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class BorrowerService {
    /**
     * Get all collateral details
     * Retrieves a list of all supported collateral runes along with their minimal details. Optionally includes counts for total offers and active offers, and can filter offers based on provided LTV parameters.
     * @returns any Successful response with collateral details
     * @throws ApiError
     */
    public static getApiV1BorrowerCollateralRunes({
        includeOffersCount,
        includeActiveCount,
    }: {
        includeOffersCount?: boolean,
        includeActiveCount?: boolean,
    }): CancelablePromise<{
        /**
         * List of supported collateral runes with details
         */
        runes: Array<{
            /**
             * Collateral rune identifier
             */
            rune_id: string;
            /**
             * A friendly URL slug for the collateral
             */
            slug: string;
            /**
             * Floor price in satoshis
             */
            price_sats: number;
            /**
             * Optional count of total offers available for this rune
             */
            available_offers_count?: number;
            /**
             * Optional count of active offers for this rune
             */
            active_offers_count?: number;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/borrower/collateral/runes',
            query: {
                'include_offers_count': includeOffersCount,
                'include_active_count': includeActiveCount,
            },
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
     * Get individual collateral rune details
     * Retrieves details for a specific collateral rune, optionally including counts for total offers and active offers.
     * @returns any Successful response with collateral details
     * @throws ApiError
     */
    public static getApiV1BorrowerCollateralRunes1({
        runeId,
        includeOffersCount,
        includeActiveCount,
    }: {
        runeId: string,
        includeOffersCount?: boolean,
        includeActiveCount?: boolean,
    }): CancelablePromise<{
        /**
         * Collateral rune identifier
         */
        rune_id: string;
        /**
         * Rune slug
         */
        slug: string;
        /**
         * Floor price in satoshis
         */
        floor_price_sats: number;
        /**
         * Optional count of total offers available for this rune
         */
        available_offers_count?: number;
        /**
         * Optional count of active offers for this rune
         */
        active_offers_count?: number;
        valid_ranges: {
            rune_amount: {
                /**
                 * Explicit valid ranges for rune amounts
                 */
                ranges: Array<{
                    /**
                     * Minimum amount in this range (as string for precision)
                     */
                    min: string;
                    /**
                     * Maximum amount in this range (as string for precision)
                     */
                    max: string;
                }>;
            };
            /**
             * Valid loan term days
             */
            loan_term_days: Array<number>;
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/borrower/collateral/runes/{runeId}',
            path: {
                'runeId': runeId,
            },
            query: {
                'include_offers_count': includeOffersCount,
                'include_active_count': includeActiveCount,
            },
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
     * Get collateral rune offers
     * Retrieves available offers for a specific collateral rune
     * @returns any Successful response with collateral offers
     * @throws ApiError
     */
    public static getApiV1BorrowerCollateralRunesOffers({
        runeId,
        runeAmount,
    }: {
        runeId: string,
        runeAmount: string,
    }): CancelablePromise<{
        runeDetails: {
            /**
             * Collateral rune identifier
             */
            rune_id: string;
            /**
             * A friendly URL slug for the collateral
             */
            slug: string;
            /**
             * Floor price in satoshis
             */
            floor_price_sats: number;
            /**
             * Timestamp of the last floor update for the collection
             */
            floor_price_last_updated_at: string;
            common_offer_data: {
                /**
                 * Common interest rate percentage for all offers
                 */
                interest_rate: number;
                /**
                 * Common number of rune divisibility for all offers
                 */
                rune_divisibility: number;
            };
            valid_ranges: {
                rune_amount: {
                    /**
                     * Explicit valid ranges for rune amounts
                     */
                    ranges: Array<{
                        /**
                         * Minimum amount in this range (as string for precision)
                         */
                        min: string;
                        /**
                         * Maximum amount in this range (as string for precision)
                         */
                        max: string;
                    }>;
                };
                /**
                 * Valid loan term days
                 */
                loan_term_days: Array<number>;
            };
            /**
             * List of unique offer details
             */
            offers: Array<{
                /**
                 * Internal ID of the instant offer
                 */
                offer_id: string;
                /**
                 * Fungible amount
                 */
                fungible_amount: number;
                loan_term_days?: number | null;
                /**
                 * LTV percentage
                 */
                ltv_rate: number;
                /**
                 * Breakdown of loan repayment details
                 */
                loan_breakdown: {
                    /**
                     * Total amount required for repayment taking the borrowers discount and interest amount into consideration
                     */
                    total_repayment_sats: number;
                    /**
                     * Principal loan amount in sats
                     */
                    principal_sats: number;
                    /**
                     * Interest amount in sats
                     */
                    interest_sats: number;
                    /**
                     * Due date for the loan repayment
                     */
                    loan_due_by_date: string;
                    /**
                     * Platform fee in satoshis taken to start the loan, added as an output on the start loan transaction
                     */
                    activation_fee_sats: number;
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
            }>;
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/borrower/collateral/runes/{runeId}/offers',
            path: {
                'runeId': runeId,
            },
            query: {
                'rune_amount': runeAmount,
            },
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
