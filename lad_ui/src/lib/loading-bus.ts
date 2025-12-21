type Listener = (state: LoadingState) => void;

export type LoadingState = {
  activeCount: number;
  nextHideAt: number | null;
};

class LoadingBus {
  private listeners = new Set<Listener>();
  private activeCount = 0;
  private pendingHideTimes: number[] = [];

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    // push current state
    fn(this.getState());
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  private getState(): LoadingState {
    const nextHideAt = this.pendingHideTimes.length
      ? Math.max(...this.pendingHideTimes)
      : null;
    return { activeCount: this.activeCount, nextHideAt };
  }

  requestStart(minVisibleMs: number) {
    this.activeCount += 1;
    const hideAt = Date.now() + minVisibleMs;
    this.pendingHideTimes.push(hideAt);
    this.emit();
    return hideAt;
  }

  requestEnd(hideAt: number) {
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
