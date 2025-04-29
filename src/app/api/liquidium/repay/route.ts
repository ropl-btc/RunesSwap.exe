import { createErrorResponse, createSuccessResponse } from '@/lib/apiUtils';
import { supabase } from '@/lib/supabase';

// POST /api/liquidium/repay
export async function POST(request: Request) {
  try {
    const { loanId, address, signedPsbt } = await request.json();
    if (!loanId || !address) {
      console.log('[Repay API] Missing loanId or address', { loanId, address });
      return createErrorResponse('Missing parameters', 'loanId and address are required', 400);
    }
    // Look up JWT for this address
    const { data: tokenRows, error: tokenError } = await supabase
      .from('liquidium_tokens')
      .select('jwt')
      .eq('wallet_address', address)
      .limit(1);
    if (tokenError) {
      console.error('[Repay API] Supabase error:', tokenError);
      return createErrorResponse('Database error', JSON.stringify(tokenError), 500);
    }
    if (!tokenRows || tokenRows.length === 0) {
      console.warn('[Repay API] No JWT found for address:', address);
      return createErrorResponse('Not authenticated with Liquidium', 'No JWT found for this address', 401);
    }
    const userJwt = tokenRows[0].jwt;
    const apiKey = process.env.LIQUIDIUM_API_KEY;
    const apiUrl = process.env.LIQUIDIUM_API_URL || 'https://alpha.liquidium.fi';
    console.log('[Repay API] Using JWT:', userJwt?.slice(0, 16) + '...' + userJwt?.slice(-8));
    console.log('[Repay API] Headers:', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'x-user-token': userJwt,
    });
    if (signedPsbt) {
      // Step 2: Submit signed PSBT to Liquidium
      console.log('[Repay API] Submitting signed PSBT for loanId:', loanId);
      const submitRes = await fetch(`${apiUrl}/api/v1/borrower/loans/repay/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'x-user-token': userJwt,
        },
        body: JSON.stringify({ offer_id: loanId, signed_psbt_base_64: signedPsbt }),
      });
      const submitData = await submitRes.json();
      console.log('[Repay API] Liquidium /repay/submit response:', submitData);
      if (!submitRes.ok) {
        return createErrorResponse('Liquidium API error', submitData?.error || 'Failed to submit repayment', 500);
      }
      return createSuccessResponse(submitData);
    } else {
      // Step 1: Prepare repayment PSBT
      const feeRate = 5; // default fee rate in sat/vB
      console.log('[Repay API] Preparing repayment for loanId:', loanId, 'with feeRate:', feeRate);
      const liquidiumRes = await fetch(`${apiUrl}/api/v1/borrower/loans/repay/prepare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'x-user-token': userJwt,
        },
        body: JSON.stringify({ offer_id: loanId, fee_rate: feeRate }),
      });
      const repayData = await liquidiumRes.json();
      console.log('[Repay API] Liquidium /repay/prepare response:', repayData);
      if (!liquidiumRes.ok) {
        return createErrorResponse('Liquidium API error', repayData?.error || 'Failed to prepare repayment', 500);
      }
      // Highlight repayment amount and PSBT fields
      console.log('[Repay API] Repayment amount (sats):', repayData.repayment_amount_sats);
      console.log('[Repay API] PSBT (base64):', repayData.psbt?.slice(0, 32) + '...');
      return createSuccessResponse(repayData);
    }
  } catch (error) {
    console.error('[Repay API] Exception:', error);
    return createErrorResponse('Failed to process repayment', error instanceof Error ? error.message : String(error), 500);
  }
} 