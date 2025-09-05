// Mock Socket.IO event emitter for in-memory demo
export class MockEventEmitter {
  private listeners: Record<string, Function[]> = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        setTimeout(() => callback(...args), 0); // Async like real Socket.IO
      });
    }
  }

  off(event: string, callback?: Function) {
    if (!this.listeners[event]) return;
    
    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      this.listeners[event] = [];
    }
  }
}

// Global event bus for the app
export const eventBus = new MockEventEmitter();