"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import dynamic from "next/dynamic";
import { CallOptionsSkeleton } from "@/components/skeletons/CallOptionsSkeleton";
import { PageLoadingSentry } from "@/components/loader/PageLoadingSentry";

const MakeCallContent = dynamic(
  () => import("./make-call-content"),
  {
    loading: () => (
      <div className="max-w-4xl mx-auto p-6">
        <PageLoadingSentry />
        <CallOptionsSkeleton />
      </div>
    )
  }
);

export default function MakeCallPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        await getCurrentUser();
        setAuthed(true);
      } catch {
        setAuthed(false);
        const redirect = encodeURIComponent("/make-call");
        router.replace(`/login?redirect_url=${redirect}`);
      }
    })();
  }, [router]);

  if (!authed) return <></>;

  return <MakeCallContent />;
}
