import React, { useMemo, useState } from 'react';
import {
  X,
  ShoppingCart,
  ClipboardList,
  CreditCard,
  Truck,
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  RotateCw,
  AlertTriangle,
  FileText,
  ArrowLeftRight,
  MessagesSquare,
  UploadCloud,
} from 'lucide-react';
import type { Lead } from './types';

const casesMockData = {
  leadId: '24',
  leadName: 'Prem Kumar',
  email: 'prem.kumar@company.com',
  phone: '+91 98765 43210',
  avatar: null as string | null,
  summary: {
    totalOrders: 10,
    inProgress: 2,
    pending: 3,
    delivered: 3,
    paymentPending: 1,
    creditsToIssue: 1,
    activeReturns: 2,
    activeCases: 3,
  },
  orders: [
    {
      id: 'ORD-2024-001',
      date: '2024-10-15',
      product: 'Dell XPS 15 Laptop',
      amount: 1299.99,
      status: 'delivered',
      paymentStatus: 'paid',
      deliveryDate: '2024-10-18',
    },
    {
      id: 'ORD-2024-002',
      date: '2024-10-12',
      product: 'Logitech MX Master 3 Mouse',
      amount: 99.99,
      status: 'in_progress',
      paymentStatus: 'paid',
      estimatedDelivery: '2024-10-25',
    },
    {
      id: 'ORD-2024-003',
      date: '2024-10-10',
      product: 'Sony WH-1000XM5 Headphones',
      amount: 399.99,
      status: 'pending',
      paymentStatus: 'payment_pending',
      estimatedDelivery: '2024-10-28',
    },
    {
      id: 'ORD-2024-004',
      date: '2024-10-08',
      product: 'Samsung 27" Monitor',
      amount: 349.99,
      status: 'delivered',
      paymentStatus: 'paid',
      deliveryDate: '2024-10-11',
    },
    {
      id: 'ORD-2024-005',
      date: '2024-10-05',
      product: 'Mechanical Keyboard RGB',
      amount: 149.99,
      status: 'pending',
      paymentStatus: 'paid',
      estimatedDelivery: '2024-10-26',
    },
    {
      id: 'ORD-2024-006',
      date: '2024-09-28',
      product: 'iPhone 15 Pro',
      amount: 999.99,
      status: 'delivered',
      paymentStatus: 'credit_to_issue',
      deliveryDate: '2024-10-01',
      creditAmount: 100.0,
      creditReason: 'Delayed delivery compensation',
    },
    {
      id: 'ORD-2024-007',
      date: '2024-09-25',
      product: 'iPad Air',
      amount: 599.99,
      status: 'in_progress',
      paymentStatus: 'paid',
      estimatedDelivery: '2024-10-22',
    },
    {
      id: 'ORD-2024-008',
      date: '2024-09-20',
      product: 'AirPods Pro',
      amount: 249.99,
      status: 'pending',
      paymentStatus: 'paid',
      estimatedDelivery: '2024-10-24',
    },
  ],
  returns: [
    {
      id: 'RET-2024-001',
      orderId: 'ORD-2024-001',
      product: 'Dell XPS 15 Laptop - Faulty Battery',
      returnDate: '2024-10-19',
      reason: 'Defective product',
      status: 'approved',
      refundAmount: 1299.99,
      refundStatus: 'processing',
      expectedRefundDate: '2024-10-25',
    },
    {
      id: 'RET-2024-002',
      orderId: 'ORD-2024-004',
      product: 'Samsung 27" Monitor - Dead Pixels',
      returnDate: '2024-10-13',
      reason: 'Product not as described',
      status: 'pending_review',
      refundAmount: 349.99,
      refundStatus: 'pending',
    },
  ],
  cases: [
    {
      id: 'CASE-2024-101',
      type: 'complaint',
      title: 'Delayed Delivery',
      description: "Order ORD-2024-003 hasn't arrived yet",
      orderId: 'ORD-2024-003',
      openedDate: '2024-10-14',
      status: 'open',
      priority: 'high',
      assignedTo: 'Support Team A',
      lastUpdate: '2024-10-20',
    },
    {
      id: 'CASE-2024-102',
      type: 'inquiry',
      title: 'Product Compatibility Question',
      description: 'Need to know if the keyboard is compatible with Mac',
      orderId: 'ORD-2024-005',
      openedDate: '2024-10-07',
      status: 'resolved',
      priority: 'low',
      assignedTo: 'Support Team B',
      lastUpdate: '2024-10-08',
      resolvedDate: '2024-10-08',
    },
    {
      id: 'CASE-2024-103',
      type: 'return_request',
      title: 'Defective Battery in Laptop',
      description: 'Laptop battery not charging properly',
      orderId: 'ORD-2024-001',
      openedDate: '2024-10-19',
      status: 'in_progress',
      priority: 'high',
      assignedTo: 'Support Team A',
      lastUpdate: '2024-10-21',
    },
  ],
};

const statusBadgeStyles: Record<string, string> = {
  delivered: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  in_progress: 'bg-sky-100 text-sky-700 border border-sky-200',
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  paid: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  payment_pending: 'bg-rose-100 text-rose-700 border border-rose-200',
  credit_to_issue: 'bg-amber-100 text-amber-700 border border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  pending_review: 'bg-amber-100 text-amber-700 border border-amber-200',
  processing: 'bg-sky-100 text-sky-700 border border-sky-200',
  open: 'bg-rose-100 text-rose-700 border border-rose-200',
  resolved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
};

const priorityBadgeStyles: Record<string, string> = {
  high: 'border border-rose-200 text-rose-600 bg-rose-50',
  medium: 'border border-amber-200 text-amber-600 bg-amber-50',
  low: 'border border-sky-200 text-sky-600 bg-sky-50',
};

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

type BadgeProps = {
  text: string;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  variant?: 'solid' | 'subtle' | 'outline';
  className?: string;
};

const Badge = ({ text, tone = 'default', variant = 'subtle', className = '' }: BadgeProps) => {
  const toneClasses: Record<string, Record<string, string>> = {
    default: {
      subtle: 'bg-slate-100 text-slate-600 border border-slate-200',
      outline: 'border border-slate-300 text-slate-700',
      solid: 'bg-slate-800 text-white',
    },
    primary: {
      subtle: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      outline: 'border border-indigo-200 text-indigo-600',
      solid: 'bg-indigo-600 text-white',
    },
    success: {
      subtle: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      outline: 'border border-emerald-200 text-emerald-600',
      solid: 'bg-emerald-600 text-white',
    },
    warning: {
      subtle: 'bg-amber-50 text-amber-600 border border-amber-100',
      outline: 'border border-amber-200 text-amber-600',
      solid: 'bg-amber-500 text-white',
    },
    danger: {
      subtle: 'bg-rose-50 text-rose-600 border border-rose-100',
      outline: 'border border-rose-200 text-rose-600',
      solid: 'bg-rose-600 text-white',
    },
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${toneClasses[tone][variant]} ${className}`}
    >
      {text}
    </span>
  );
};

const SummaryCards = ({ summary }: { summary: (typeof casesMockData)['summary'] }) => {
  const cards = useMemo(
    () => [
      { label: 'Total Orders', value: summary.totalOrders, icon: ShoppingCart },
      { label: 'In Progress', value: summary.inProgress, icon: Truck },
      { label: 'Pending', value: summary.pending, icon: Clock3 },
      { label: 'Delivered', value: summary.delivered, icon: CheckCircle2 },
      { label: 'Payment Pending', value: summary.paymentPending, icon: CreditCard },
      { label: 'Credits to Issue', value: summary.creditsToIssue, icon: BadgeDollarSign },
      { label: 'Active Returns', value: summary.activeReturns, icon: ArrowLeftRight },
      { label: 'Active Cases', value: summary.activeCases, icon: ClipboardList },
    ],
    [summary],
  );

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-2xl font-semibold text-slate-800">{value}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        </div>
      ))}
    </div>
  );
};

const OrdersTab = ({ orders }: { orders: (typeof casesMockData)['orders'] }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
    <div className="hidden bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[1.3fr,0.9fr,1.3fr,1fr,1fr,1fr]">
      <div className="px-4 py-3">Order ID</div>
      <div className="px-4 py-3">Date</div>
      <div className="px-4 py-3">Product</div>
      <div className="px-4 py-3 text-right">Amount</div>
      <div className="px-4 py-3">Order Status</div>
      <div className="px-4 py-3">Payment</div>
    </div>
    <div className="divide-y divide-slate-100">
      {orders.map((order) => (
        <div
          key={order.id}
          className="grid gap-3 px-4 py-4 transition hover:bg-slate-50 md:grid-cols-[1.3fr,0.9fr,1.3fr,1fr,1fr,1fr]"
        >
          <div>
            <div className="font-semibold text-indigo-600">{order.id}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400 md:hidden">Order ID</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700">{formatDate(order.date)}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400 md:hidden">Date</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{order.product}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400 md:hidden">Product</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-800">{formatCurrency(order.amount)}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400 md:hidden">Amount</div>
          </div>
          <div className="space-y-1">
            <Badge
              text={order.status.replace('_', ' ')}
              variant="subtle"
              className={`capitalize ${statusBadgeStyles[order.status] ?? 'bg-slate-100 text-slate-600 border border-slate-200'}`}
            />
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400 md:hidden">Order Status</div>
          </div>
          <div className="space-y-1">
            <Badge
              text={order.paymentStatus.replace('_', ' ')}
              variant="subtle"
              className={`capitalize ${statusBadgeStyles[order.paymentStatus] ?? 'bg-slate-100 text-slate-600 border border-slate-200'}`}
            />
            {order.creditAmount && (
              <div className="text-xs font-medium text-amber-600">Credit: {formatCurrency(order.creditAmount)}</div>
            )}
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400 md:hidden">Payment</div>
          </div>
          <div className="col-span-full md:col-span-1">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400 md:hidden">Delivery</div>
            {order.deliveryDate ? (
              <div className="mt-1 text-sm font-semibold text-emerald-600">
                Delivered {formatDate(order.deliveryDate)}
              </div>
            ) : (
              <div className="mt-1 text-sm font-medium text-slate-600">
                Est. {formatDate(order.estimatedDelivery)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ReturnsTab = ({ returns }: { returns: (typeof casesMockData)['returns'] }) => (
  <div className="space-y-4">
    {returns.map((returnItem) => (
      <div key={returnItem.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-indigo-600">{returnItem.id}</h3>
              <Badge text={returnItem.status.replace('_', ' ')} className={`capitalize ${statusBadgeStyles[returnItem.status] ?? ''}`} />
              <Badge text={returnItem.refundStatus} className={`capitalize ${statusBadgeStyles[returnItem.refundStatus] ?? ''}`} variant="outline" />
            </div>
            <p className="mt-1 text-sm font-medium text-slate-500">Order {returnItem.orderId}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <RotateCw className="h-4 w-4" />
            {formatDate(returnItem.returnDate)}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Product</div>
            <div className="mt-1 text-sm font-semibold text-slate-800">{returnItem.product}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reason</div>
            <div className="mt-1 text-sm font-medium text-slate-700">{returnItem.reason}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Refund Amount</div>
            <div className="mt-1 text-sm font-semibold text-emerald-600">{formatCurrency(returnItem.refundAmount)}</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-slate-400" />
            Expected refund by {formatDate(returnItem.expectedRefundDate)}
          </div>
        </div>
      </div>
    ))}
  </div>
);

const CasesTab = ({ cases }: { cases: (typeof casesMockData)['cases'] }) => (
  <div className="space-y-4">
    {cases.map((caseItem) => (
      <div key={caseItem.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-indigo-600">{caseItem.id}</h3>
              <Badge text={caseItem.type.replace('_', ' ')} variant="outline" className="capitalize" />
              <Badge
                text={caseItem.status.replace('_', ' ')}
                className={`capitalize ${statusBadgeStyles[caseItem.status] ?? ''}`}
              />
              <Badge text={caseItem.priority} className={`capitalize ${priorityBadgeStyles[caseItem.priority] ?? ''}`} />
            </div>
            <p className="text-base font-semibold text-slate-800">{caseItem.title}</p>
            <p className="text-sm text-slate-600">{caseItem.description}</p>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm text-slate-500 md:items-end">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Order {caseItem.orderId}
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              Opened {formatDate(caseItem.openedDate)}
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Updated {formatDate(caseItem.lastUpdate)}
            </div>
            <div className="flex items-center gap-2">
              <MessagesSquare className="h-4 w-4" />
              {caseItem.assignedTo}
            </div>
          </div>
        </div>

        {caseItem.resolvedDate && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Resolved on {formatDate(caseItem.resolvedDate)}
          </div>
        )}
      </div>
    ))}
  </div>
);

type CasesPopupProps = {
  open: boolean;
  onClose: () => void;
  lead?: Lead;
};

export default function CasesPopup({ open, onClose, lead }: CasesPopupProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'returns' | 'cases'>('overview');
  const casesData = casesMockData;

  if (!open) return null;

  const tabs: Array<{ id: typeof activeTab; label: string; badge?: number; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Overview', icon: ClipboardList },
    { id: 'orders', label: 'Orders', badge: casesData.orders.length, icon: ShoppingCart },
    { id: 'returns', label: 'Returns', badge: casesData.returns.length, icon: ArrowLeftRight },
    { id: 'cases', label: 'Cases', badge: casesData.cases.length, icon: FileText },
  ];

  const initials = casesData.leadName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="relative flex items-start gap-4 bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-5 text-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-white transition hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white/40 bg-indigo-500 text-2xl font-semibold">
            {casesData.avatar ? (
              <img src={casesData.avatar} alt={casesData.leadName} className="h-full w-full rounded-2xl object-cover" />
            ) : (
              initials
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">{casesData.leadName}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/90">
              <div>{casesData.email}</div>
              <div className="hidden h-1.5 w-1.5 rounded-full bg-white/60 sm:block" />
              <div>{casesData.phone}</div>
              <Badge text={`ID: ${casesData.leadId}`} variant="outline" className="border-white/60 text-white" />
            </div>
          </div>
        </div>

        <div className="border-b border-slate-100 bg-slate-50">
          <div className="flex flex-wrap gap-2 px-4 py-2 md:px-6">
            {tabs.map(({ id, label, badge, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-white'
                  }`}
                  type="button"
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
                  <span>{label}</span>
                  {badge !== undefined && (
                    <span
                      className={`ml-1 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-xs font-bold ${
                        isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-6 md:px-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Customer Overview</h3>
                <p className="text-sm text-slate-500">Snapshot of open orders, pending cases, and fulfilment performance.</p>
              </div>
              <SummaryCards summary={casesData.summary} />

              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h4 className="text-base font-semibold text-slate-800">Recent activity</h4>
                <p className="mt-1 text-sm text-slate-500">Quick summary of pending actions and blockers that need follow-up.</p>
                <div className="mt-4 space-y-3">
                  {casesData.summary.paymentPending > 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-600">
                      <CreditCard className="h-5 w-5" />
                      <span>
                        <strong>{casesData.summary.paymentPending}</strong> order(s) with payment pending
                      </span>
                    </div>
                  )}
                  {casesData.summary.creditsToIssue > 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-600">
                      <BadgeDollarSign className="h-5 w-5" />
                      <span>
                        <strong>{casesData.summary.creditsToIssue}</strong> credit(s) awaiting issuance
                      </span>
                    </div>
                  )}
                  {casesData.summary.activeReturns > 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-600">
                      <ArrowLeftRight className="h-5 w-5" />
                      <span>
                        <strong>{casesData.summary.activeReturns}</strong> active return request(s)
                      </span>
                    </div>
                  )}
                  {casesData.summary.activeCases > 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-600">
                      <ClipboardList className="h-5 w-5" />
                      <span>
                        <strong>{casesData.summary.activeCases}</strong> open customer case(s)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && <OrdersTab orders={casesData.orders} />}
          {activeTab === 'returns' && <ReturnsTab returns={casesData.returns} />}
          {activeTab === 'cases' && <CasesTab cases={casesData.cases} />}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <button
            onClick={onClose}
            type="button"
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Close
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <UploadCloud className="h-4 w-4" />
            Export report
          </button>
        </div>
      </div>
    </div>
  );
}

