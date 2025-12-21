"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  AlertTriangle,
  Loader2,
  MessageCircle,
  Sparkles,
  UserCircle2,
} from 'lucide-react';
import customer360Service from '../../services/Customer360Service';
import EngagementFeedCard from './EngagementFeed';
import NextBestActionsCard from './Actions';
import OutreachAnalysisCard from './OutreachAnalysis';
import Customer360Card from './Customer360';
import type { Lead } from './types';

const CUSTOMER_ILLUSTRATION_SRC = '/customer.jpg';

type CustomerProfileProps = {
  leadId?: number | string | null;
  leadData?: Lead | null;
};

type RequestState = 'idle' | 'loading' | 'error' | 'ready';

const LoadingState = () => (
  <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-100 bg-white shadow-sm">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      <p className="text-sm font-medium text-slate-600">Loading customer data…</p>
    </div>
  </div>
);

const EmptyState = () => (
    <div 
      className="flex min-h-[420px] flex-col rounded-3xl px-10 pb-12 pt-8 text-center"
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0px 4px 60px 0px #E2ECF980'
      }}
    >
    <div className="flex items-center gap-3 self-start">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-white text-slate-700">
        <UserCircle2 className="h-5 w-5" />
      </span>
      <h2 className="text-lg font-semibold text-slate-900">Customer 360</h2>
    </div>

    <div className="mt-8 flex flex-1 flex-col items-center justify-center">
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-[32px] bg-slate-50">
        <Image
          src={CUSTOMER_ILLUSTRATION_SRC}
          alt="Customer illustration"
          width={720}
          height={420}
          className="h-auto w-full object-cover"
          priority
        />
      </div>
      <p className="mt-8 text-sm font-medium text-slate-500">
        Start by selecting a customer from the left panel.
      </p>
    </div>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-rose-100 bg-rose-50 px-6 py-10 text-center shadow-sm">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
      <AlertTriangle className="h-6 w-6" />
    </div>
    <h2 className="mt-4 text-lg font-semibold text-rose-600">We couldn’t load this profile</h2>
    <p className="mt-2 max-w-sm text-sm text-rose-500">{message}</p>
  </div>
);

const CustomerProfile: React.FC<CustomerProfileProps> = ({ leadId, leadData }) => {
  const [lead, setLead] = useState<Lead | null>(leadData ?? null);
  const [status, setStatus] = useState<RequestState>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!leadId && !leadData) {
      setLead(null);
      setStatus('idle');
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    if (leadData) {
      setLead(leadData);
      setStatus('ready');
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    if (!leadId) {
      return () => {
        cancelled = true;
      };
    }

    const fetchLead = async () => {
      setStatus('loading');
      setError(null);

      const [leadResponse, engagementResponse] = await Promise.all([
        customer360Service.getHotLeadById(leadId),
        customer360Service.getEngagementFeed(leadId),
      ]);

      if (cancelled) return;

      if (!leadResponse.success) {
        setStatus('error');
        setError(leadResponse.error ?? 'Unable to fetch lead details.');
        setLead(null);
        return;
      }

      const normalized = customer360Service.normalizeHotLeadData(leadResponse.data);
      setLead(normalized);

      if (engagementResponse.success) {
        console.debug('Engagement feed', engagementResponse.data);
      }

      setStatus('ready');
    };

    fetchLead().catch((err) => {
      if (cancelled) return;
      console.error('Failed to load customer profile', err);
      setStatus('error');
      setError('Something went wrong while loading this customer. Please try again.');
      setLead(null);
    });

    return () => {
      cancelled = true;
    };
  }, [leadId, leadData]);

  if (!leadId && !lead) {
    return <EmptyState />;
  }

  if (status === 'loading') {
    return <LoadingState />;
  }

  if (status === 'error' || !lead) {
    return <ErrorState message={error ?? 'Lead data is unavailable.'} />;
  }

  return (
    <div id="slate-div" className="min-h-screen bg-slate-50 p-0">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="space-y-3 xl:col-span-2">
            <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
              <Customer360Card lead={lead} />
            </section>

            {/* <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"> */}
              <OutreachAnalysisCard lead={lead} />
            {/* </section> */}
          </div>

          <div className="flex flex-col gap-3">
            <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
              <EngagementFeedCard lead={lead} />
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
              <NextBestActionsCard />
            </section>

          
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;

