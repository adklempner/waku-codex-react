export class TypedEventEmitter<Events extends Record<string, any>> {
  private handlers = new Map<keyof Events, Set<Function>>();
  
  on<E extends keyof Events>(
    event: E,
    handler: Events[E]
  ): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }
  
  off<E extends keyof Events>(
    event: E,
    handler: Events[E]
  ): void {
    this.handlers.get(event)?.delete(handler);
  }
  
  emit<E extends keyof Events>(
    event: E,
    ...args: Parameters<Events[E]>
  ): void {
    this.handlers.get(event)?.forEach(handler => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in event handler for ${String(event)}:`, error);
      }
    });
  }
  
  once<E extends keyof Events>(
    event: E,
    handler: Events[E]
  ): void {
    const wrapper = ((...args: any[]) => {
      handler(...args);
      this.off(event, wrapper as Events[E]);
    }) as Events[E];
    
    this.on(event, wrapper);
  }
  
  removeAllListeners(event?: keyof Events): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
  
  listenerCount(event: keyof Events): number {
    return this.handlers.get(event)?.size || 0;
  }
}