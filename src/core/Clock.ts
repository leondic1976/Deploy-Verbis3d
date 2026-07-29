/** Monotonic frame clock with clamped deltas. */
export class Clock {
  elapsedTime = 0;
  deltaTime = 0;
  running = false;
  private previousTime = 0;

  constructor(public maxDeltaTime = 0.1) {}

  start(now = performance.now()): void {
    this.previousTime = now;
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  reset(): void {
    this.elapsedTime = 0;
    this.deltaTime = 0;
    this.previousTime = 0;
  }

  tick(now = performance.now()): number {
    if (!this.running) {
      this.start(now);
      return 0;
    }
    this.deltaTime = Math.min(Math.max((now - this.previousTime) / 1000, 0), this.maxDeltaTime);
    this.previousTime = now;
    this.elapsedTime += this.deltaTime;
    return this.deltaTime;
  }
}
