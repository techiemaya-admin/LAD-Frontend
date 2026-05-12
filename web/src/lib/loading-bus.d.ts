type Listener = (state: LoadingState) => void;
export type LoadingState = {
    activeCount: number;
    nextHideAt: number | null;
};
declare class LoadingBus {
    private listeners;
    private activeCount;
    private pendingHideTimes;
    subscribe(fn: Listener): () => boolean;
    private emit;
    private getState;
    requestStart(minVisibleMs: number): number;
    requestEnd(hideAt: number): void;
    sweepElapsed(): void;
}
export declare const loadingBus: LoadingBus;
export {};
//# sourceMappingURL=loading-bus.d.ts.map