/**
 * Billing Feature - API Client
 * All API calls for billing operations
 * This is the only place that makes direct HTTP calls for billing
 */

import { getApiClient } from '../../shared/apiClient';

export interface CreditsBalance {
  walletId: string;
  tenantId: string;
  currentBalance: number;
  reservedBalance: number;
  availableBalance: number;
  currency: string;
  status: string;
  lowBalanceThreshold?: number;
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
  const api = await getApiClient();
  const response = await api.get('/api/billing/wallet');
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
  const api = await getApiClient();
  const response = await api.get('/api/billing/pricing', { params });
  return response.data.price;
}

/**
 * Get cost quote before charging
 */
export async function getQuote(items: QuoteItem[]): Promise<QuoteResponse> {
  const api = await getApiClient();
  const response = await api.post('/api/billing/quote', { items });
  return response.data.quote;
}

/**
 * Charge usage (creates usage event and debits wallet)
 */
export async function chargeUsage(request: ChargeRequest): Promise<{
  usageEvent: UsageEvent;
  transaction: LedgerTransaction;
}> {
  const api = await getApiClient();
  const response = await api.post('/api/billing/charge', request);
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
  const api = await getApiClient();
  const response = await api.post('/api/billing/topup', params);
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
  const api = await getApiClient();
  const response = await api.get('/api/billing/usage', { params });
  return response.data.usage;
}

/**
 * Get usage aggregation summary
 */
export async function getUsageAggregation(params?: {
  from?: string;
  to?: string;
  featureKey?: string;
}): Promise<UsageAggregation[]> {
  const api = await getApiClient();
  const response = await api.get('/api/billing/usage/aggregation', { params });
  return response.data.aggregation;
}

/**
 * List ledger transactions
 */
export async function listTransactions(params?: {
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<LedgerTransaction[]> {
  const api = await getApiClient();
  const response = await api.get('/api/billing/transactions', { params });
  return response.data.transactions;
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
  const api = await getApiClient();
  const response = await api.get('/api/wallet/balance');
  return response.data;
}

// Backward compatibility alias
export const getWalletBalanceLegacy = getCreditsBalanceLegacy;

/**
 * LEGACY COMPATIBILITY
 * Get credit packages
 */
export async function getCreditPackages(): Promise<any[]> {
  const api = await getApiClient();
  const response = await api.get('/api/wallet/packages');
  return response.data.packages;
}
