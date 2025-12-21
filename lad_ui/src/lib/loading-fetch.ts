import { loadingBus } from "@/lib/loading-bus";

export async function loadingFetch(input: RequestInfo | URL, init?: RequestInit, minVisibleMs = 30000) {
  const hideAt = loadingBus.requestStart(minVisibleMs);
  try {
    const res = await fetch(input as any, init as any);
    return res;
  } finally {
    loadingBus.requestEnd(hideAt);
  }
}
