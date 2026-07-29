export interface EngineEvent {
  readonly type: string;
  readonly target?: unknown;
}

export type EventListener<TEvent extends EngineEvent> = (event: TEvent) => void;

/** Small synchronous event dispatcher with deterministic listener ordering. */
export class EventDispatcher<TEvent extends EngineEvent = EngineEvent> {
  private readonly listeners = new Map<string, Set<EventListener<TEvent>>>();

  addEventListener(type: TEvent["type"], listener: EventListener<TEvent>): this {
    let bucket = this.listeners.get(type);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(type, bucket);
    }
    bucket.add(listener);
    return this;
  }

  removeEventListener(type: TEvent["type"], listener: EventListener<TEvent>): this {
    this.listeners.get(type)?.delete(listener);
    return this;
  }

  dispatchEvent(event: TEvent): this {
    const bucket = this.listeners.get(event.type);
    if (!bucket) return this;
    for (const listener of [...bucket]) listener(event);
    return this;
  }

  removeAllEventListeners(): void {
    this.listeners.clear();
  }
}
