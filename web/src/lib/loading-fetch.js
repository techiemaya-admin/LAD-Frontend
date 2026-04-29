import { loadingBus } from "@/lib/loading-bus";
export async function loadingFetch(input, init, minVisibleMs = 300) {
    const hideAt = loadingBus.requestStart(minVisibleMs);
    try {
        const res = await fetch(input, init);
        return res;
    }
    finally {
        loadingBus.requestEnd(hideAt);
    }
}
//# sourceMappingURL=loading-fetch.js.map