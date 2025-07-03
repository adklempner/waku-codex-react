export type ServiceStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ServiceConfig {
  id?: string;
  debug?: boolean;
}

export interface ServiceEvents {
  statusChange: (status: ServiceStatus) => void;
  error: (error: ServiceError) => void;
  connect: () => void;
  disconnect: () => void;
}

export interface IService {
  readonly id: string;
  readonly status: ServiceStatus;
  
  connect(config?: ServiceConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  on<E extends keyof ServiceEvents>(
    event: E, 
    handler: ServiceEvents[E]
  ): void;
  
  off<E extends keyof ServiceEvents>(
    event: E, 
    handler: ServiceEvents[E]
  ): void;
  
  emit<E extends keyof ServiceEvents>(
    event: E, 
    ...args: Parameters<ServiceEvents[E]>
  ): void;
}

export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly service: string,
    public readonly recoverable: boolean = true,
    public readonly details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      service: this.service,
      recoverable: this.recoverable,
      details: this.details
    };
  }
}