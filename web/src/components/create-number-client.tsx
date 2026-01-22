"use client";
import { useRouter } from "next/navigation";
import { CreateNumberDialog } from "@/components/create-number-dialog";
export function CreateNumberClient({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  return (
    <CreateNumberDialog onCreated={onCreated ?? (() => router.refresh())} />
  );
}