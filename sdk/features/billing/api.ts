/**
 * Billing Feature - API Client
 * All API calls for billing operations
 * This is the only place that makes direct HTTP calls for billing
 */
import { apiClient } from '../../shared/apiClient';
export interface CreditsBalance {
  walletId: string;
  tenantId: string;
  currentBalance: number;
  reservedBalance: number;
  availableBalance: number;
  currency: string;
  status: string;
  lowBalanceThreshold?: number;
  balance?: number;
  transactions?: [];
}
// Backward compatibility alias
export type WalletBalance = CreditsBalance;
export interface UsageEvent {
  id: string;
  tenantId: string;
  userId?: string;
  featureKey: string;
  totalCost: number;
  status: 'pending' | 'charged' | 'voided' | 'failed';
  createdAt: string;
  chargedAt?: string;
}
export interface LedgerTransaction {
  id: string;
  tenantId: string;
  transactionType: 'topup' | 'credit' | 'debit' | 'adjustment' | 'refund';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  createdAt: string;
}
export interface PricingItem {
  category: string;
  provider: string;
  model: string;
  unit: string;
  unitPrice: number;
  description?: string;
}
export interface QuoteItem {
  category: string;
  provider: string;
  model: string;
  unit: string;
  quantity: number;
}
export interface QuoteResponse {
  totalCost: number;
  currency: string;
  items: Array<QuoteItem & {
    unitPrice: number;
    cost: number;
  }>;
}
export interface ChargeRequest {
  featureKey: string;
  externalReferenceId?: string;
  idempotencyKey: string;
  items: QuoteItem[];
  metadata?: Record<string, any>;
}
export interface UsageAggregation {
  featureKey: string;
  status: string;
  eventCount: number;
  totalCost: number;
}
export interface UsageSummary {
  totalEvents: number;
  totalCost: number;
  byFeature: Record<string, { events: number; cost: number }>;
  byStatus: Record<string, { events: number; cost: number }>;
}
/**
 * Get current credits balance
 */
export async function getCreditsBalance(): Promise<CreditsBalance> {
  const response = await apiClient.get<{ wallet: CreditsBalance }>('/api/billing/wallet');
  return response.data.wallet;
}
// Backward compatibility alias
export const getWalletBalance = getCreditsBalance;
/**
 * Get pricing for a specific component
 */
export async function getPricing(params: {
  category: string;
  provider: string;
  model: string;
  unit: string;
}): Promise<PricingItem> {
  const response = await apiClient.get('/api/billing/pricing', { params });
  return response.data.price;
}
/**
 * Get cost quote before charging
 */
export async function getQuote(items: QuoteItem[]): Promise<QuoteResponse> {
  const response = await apiClient.post('/api/billing/quote', { items });
  return response.data.quote;
}
/**
 * Charge usage (creates usage event and debits wallet)
 */
export async function chargeUsage(request: ChargeRequest): Promise<{
  usageEvent: UsageEvent;
  transaction: LedgerTransaction;
}> {
  const response = await apiClient.post('/api/billing/charge', request);
  return response.data;
}
/**
 * Top up credits (admin only)
 */
export async function topUpCredits(params: {
  amount: number;
  description?: string;
  idempotencyKey: string;
}): Promise<LedgerTransaction> {
  const response = await apiClient.post('/api/billing/topup', params);
  return response.data.transaction;
}
/**
 * List usage events with filters
 */
export async function listUsage(params?: {
  from?: string;
  to?: string;
  featureKey?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  events: UsageEvent[];
  summary: UsageSummary;
}> {
  const response = await apiClient.get('/api/billing/usage', { params });
  return response.data.usage;
}
/**
 * Recharge wallet via package selection
 */
export async function rechargeWallet(params: {
  packageId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionUrl: string }> {
  const response = await apiClient.post('/api/wallet/recharge', params);
  return response.data;
}
/**
 * Recurring billing - monthly subscription + low-balance auto-recharge
 */
export interface RecurringPlan {
  kind: 'monthly' | 'auto_recharge';
  packageId: string;
  priceUsd: number;
  credits: number;
  status: 'incomplete' | 'active' | 'past_due' | 'canceled';
  thresholdCredits?: number | null;
  currentPeriodEnd?: string | null;
  lastChargedAt?: string | null;
  lastError?: string | null;
}
export interface RecurringStatus {
  monthly: RecurringPlan | null;
  autoRecharge: RecurringPlan | null;
}
/** Start a hosted Checkout for a fixed MONTHLY subscription. */
export async function subscribeMonthly(params: {
  packageId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionUrl: string }> {
  const response = await apiClient.post('/api/stripe/subscribe', params);
  return response.data;
}
/** Start a hosted Checkout (setup mode) to save a card for low-balance auto-recharge. */
export async function setupAutoRecharge(params: {
  packageId: string;
  thresholdCredits?: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionUrl: string }> {
  const response = await apiClient.post('/api/stripe/auto-recharge', params);
  return response.data;
}
/** Current recurring arrangements (monthly + auto-recharge). */
export async function getRecurring(): Promise<RecurringStatus> {
  const response = await apiClient.get('/api/stripe/recurring');
  return { monthly: response.data.monthly, autoRecharge: response.data.autoRecharge };
}
/** Cancel the monthly subscription (at period end) or disable auto-recharge. */
export async function cancelRecurring(kind: 'monthly' | 'auto_recharge'): Promise<{ cancelled: boolean }> {
  const response = await apiClient.post('/api/stripe/recurring/cancel', { kind });
  return response.data;
}
/**
 * Get usage aggregation summary
 */
export async function getUsageAggregation(params?: {
  from?: string;
  to?: string;
  featureKey?: string;
}): Promise<UsageAggregation[]> {
  const response = await apiClient.get('/api/billing/usage/aggregation', { params });
  return response.data.aggregation;
}
/**
 * List ledger transactions
 * Normalizes API response to match frontend expectations
 */
export async function listTransactions(params?: {
  type?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<any> {
  // The backend reads `fromDate`/`toDate` query params (not `from`/`to`), so map them  - 
  // otherwise the date-range filter is silently ignored.
  const { from, to, ...rest } = params || {};
  const query: Record<string, any> = { ...rest };
  if (from) query.fromDate = from;
  if (to) query.toDate = to;
  const response = await apiClient.get('/api/billing/transactions', { params: query });
  
  const creditsPerDollar: number = response.data.creditsPerDollar ?? (1000 / 99);
  const planTier: string = response.data.planTier ?? 'starter';

  // Normalize transactions: map transaction_type to type, handle string amounts
  const normalizedTransactions = response.data.transactions?.map((tx: any) => {
    const amountUsd = parseFloat(tx.amount || '0');
    const balanceAfterUsd = tx.balance_after != null ? parseFloat(tx.balance_after) : null;
    const balanceBeforeUsd = tx.balance_before != null ? parseFloat(tx.balance_before) : null;
    return {
      id: tx.id,
      type: mapTransactionType(tx.transaction_type),
      transaction_type: tx.transaction_type,
      source: tx.source || 'ledger',
      // Raw USD amounts (kept for reference)
      amount: amountUsd.toString(),
      balance_before: tx.balance_before?.toString(),
      balance_after: tx.balance_after?.toString(),
      balanceBefore: balanceBeforeUsd,
      balanceAfter: balanceAfterUsd,
      // Credits equivalents (converted using plan rate)
      // Ledger amounts are already CREDIT-denominated - do NOT multiply by creditsPerDollar.
      credits_amount: Math.round(Math.abs(amountUsd) * 100) / 100,
      credits_balance_after: balanceAfterUsd != null ? Math.round(balanceAfterUsd * 100) / 100 : null,
      credits_balance_before: balanceBeforeUsd != null ? Math.round(balanceBeforeUsd * 100) / 100 : null,
      description: tx.description || '',
      reference_type: tx.reference_type,
      reference_id: tx.reference_id,
      created_at: tx.created_at,
      createdAt: tx.created_at,
      status: 'completed',
      metadata: tx.metadata,
      tenant_id: tx.tenant_id,
      wallet_id: tx.wallet_id,
    };
  }) || [];

  return {
    transactions: normalizedTransactions,
    count: response.data.count,
    pagination: response.data.pagination,
    creditsPerDollar,
    planTier,
  };
}

/**
 * Map backend transaction_type to frontend type
 */
function mapTransactionType(transactionType: string): 'credit' | 'debit' {
  if (transactionType === 'topup' || transactionType === 'credit') {
    return 'credit';
  }
  return 'debit';
}
/**
 * LEGACY COMPATIBILITY
 * Get credits balance in legacy format for existing UI components
 */
export async function getCreditsBalanceLegacy(): Promise<{
  credits: number;
  balance: number;
  currency: string;
  lastRecharge: {
    amount: number;
    credits: number;
    date: string;
  } | null;
  monthlyUsage: number;
  totalSpent: number;
  transactions?: any[];
}> {
  const response = await apiClient.get('/api/wallet/balance');
  return response.data;
}
// Backward compatibility alias
export const getWalletBalanceLegacy = getCreditsBalanceLegacy;
/**
 * Get wallet balance with transaction history
 * Calls /wallet/balance which returns balance + transactions
 */
export async function getWalletBalanceWithTransactions(): Promise<{
  credits: number;
  balance: number;
  currency: string;
  lastRecharge: { amount: number; credits: number; date: string } | null;
  monthlyUsage: number;
  totalSpent: number;
  transactions: Array<{
    id: string;
    amount: string;
    type: 'credit' | 'debit';
    description: string;
    reference_type?: string;
    reference_id?: string;
    balance_after?: string;
    created_at: string;
    status: 'completed' | 'pending' | 'failed';
  }>;
}> {
  const response = await apiClient.get('/api/wallet/balance');
  return response.data;
}
/**
 * LEGACY COMPATIBILITY
 * Get credit packages
 */
export async function getCreditPackages(): Promise<any[]> {
  const response = await apiClient.get('/api/wallet/packages');
  return response.data.packages;
}

/**
 * Create Stripe checkout session for credit purchase
 */
export async function createStripeCheckoutSession(params: {
  amount: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}): Promise<{ url: string; sessionId: string }> {
  const response = await apiClient.post('/api/stripe/create-credits-checkout', {
    amount: params.amount,
    successUrl: params.successUrl,
    cancelUrl: params.cancelUrl,
    metadata: params.metadata,
  });
  return response.data;
}

/**
 * Get wallet usage analytics
 */
export async function getWalletUsageAnalytics(params: {
  timeRange: '7d' | '30d' | '90d';
}): Promise<{
  totalCreditsUsed: number;
  topFeatures: Array<{
    featureName: string;
    totalCredits: number;
    usageCount: number;
    percentage: number;
    icon: string;
  }>;
  dailyUsage: Array<{ date: string; credits: number }>;
  monthlyTrend: {
    currentMonth: number;
    lastMonth: number;
    percentageChange: number;
  };
}> {
  const response = await apiClient.get('/api/wallet/usage/analytics', { params });
  return response.data;
}