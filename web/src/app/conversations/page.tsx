"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import { ConversationSkeleton } from '@/components/skeletons/ConversationSkeleton';
import { PageLoadingSentry } from '@/components/loader/PageLoadingSentry';

const ConversationsPage = dynamic(
  () => import('@/components/conversations/ConversationsPage').then(mod => mod.ConversationsPage),
  {
    loading: () => (
      <>
        <PageLoadingSentry />
        <ConversationSkeleton />
      </>
    )
  }
);

const Index = () => {
  return <ConversationsPage />;
};

export default Index;
