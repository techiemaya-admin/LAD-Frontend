class LoadingBus {
    constructor() {
        this.listeners = new Set();
        this.activeCount = 0;
        this.pendingHideTimes = [];
    }
    subscribe(fn) {
        this.listeners.add(fn);
        // push current state
        fn(this.getState());
        return () => this.listeners.delete(fn);
    }
    emit() {
        const state = this.getState();
        this.listeners.forEach((l) => l(state));
    }
    getState() {
        const nextHideAt = this.pendingHideTimes.length
            ? Math.max(...this.pendingHideTimes)
            : null;
        return { activeCount: this.activeCount, nextHideAt };
    }
    requestStart(minVisibleMs) {
        this.activeCount += 1;
        const hideAt = Date.now() + minVisibleMs;
        this.pendingHideTimes.push(hideAt);
        this.emit();
        return hideAt;
    }
    requestEnd(hideAt) {
        this.activeCount = Math.max(0, this.activeCount - 1);
        // keep hideAt until timer elapses; a sweeper will remove elapsed ones
        this.emit();
    }
    sweepElapsed() {
        const now = Date.now();
        this.pendingHideTimes = this.pendingHideTimes.filter((t) => t > now);
        this.emit();
    }
}
export const loadingBus = new LoadingBus();
//# sourceMappingURL=loading-bus.js.map