import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { ExecutionActor, ExecutionContext } from '../../shared/application/execution-context';

@Injectable()
export class RequestContextStore {
  private readonly storage = new AsyncLocalStorage<ExecutionContext>();
  run<T>(context: ExecutionContext, callback: () => T): T { return this.storage.run(context, callback); }
  get(): ExecutionContext | undefined { return this.storage.getStore(); }
  require(): ExecutionContext {
    const context = this.get();
    if (!context) throw new Error('Request execution context is not available');
    return context;
  }
  setActor(actor: ExecutionActor): void {
    const current = this.require();
    this.storage.enterWith({ ...current, actor });
  }
}
