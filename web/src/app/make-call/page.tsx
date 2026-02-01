"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import MakeCallContent from "./make-call-content";

export default function MakeCallPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
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
  }, [router, mounted]);

  // Prevent hydration mismatch - don't render until client-side
  if (!mounted || !authed) return <></>;

  return <MakeCallContent />;
}
