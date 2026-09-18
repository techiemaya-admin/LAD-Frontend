'use client';

/**
 * Tenant Studio — train your own workspace.
 *
 * Three rooms share one loop: every room ends in a Tailor proposal with a
 * review card, applied through the same customisation PUT a hand-made
 * change takes. The unapplied proposal is a DRAFT the next request builds
 * on, across rooms, until it is applied or discarded.
 */
import { useState } from 'react';
import { Loader2, MessagesSquare, Target, Theater } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StudioStatus from '@/components/studio/StudioStatus';
import RehearsalRoom from '@/components/studio/RehearsalRoom';
import IcpRoom from '@/components/studio/IcpRoom';
import TailorRoom from '@/components/studio/TailorRoom';
import { useStudioState, type Overlay } from '@lad/frontend-features/tenant-studio';

export default function StudioPage() {
  const state = useStudioState();
  const [draft, setDraft] = useState<Overlay | undefined>(undefined);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Tenant Studio</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Teach the platform your business: finish the interview, train it on real leads, rehearse against your own agent, and turn feedback into changes you review before they apply.
        </p>
      </header>

      {state.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your studio…</div>
      )}
      {state.isError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">The studio could not load. Refresh, or try again in a moment.</p>
      )}
      {state.data && (
        <>
          <StudioStatus state={state.data} />
          {draft && (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              You have an unapplied proposal. The next request in any room builds on it; apply or discard it from its review card.
            </p>
          )}
          <Tabs defaultValue={state.data.rehearsal.ready ? 'rehearse' : state.data.icpTraining.ready ? 'icp' : 'tailor'} className="mt-5">
            <TabsList>
              <TabsTrigger value="icp"><Target className="mr-1.5 h-4 w-4" />Train the ICP</TabsTrigger>
              <TabsTrigger value="rehearse"><Theater className="mr-1.5 h-4 w-4" />Rehearse</TabsTrigger>
              <TabsTrigger value="tailor"><MessagesSquare className="mr-1.5 h-4 w-4" />Ask the Tailor</TabsTrigger>
            </TabsList>
            <TabsContent value="icp" className="mt-4">
              <IcpRoom ready={state.data.icpTraining.ready} draft={draft} onDraft={setDraft} />
            </TabsContent>
            <TabsContent value="rehearse" className="mt-4">
              <RehearsalRoom ready={state.data.rehearsal.ready} draft={draft} onDraft={setDraft} />
            </TabsContent>
            <TabsContent value="tailor" className="mt-4">
              <TailorRoom draft={draft} onDraft={setDraft} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
