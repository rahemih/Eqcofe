import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class StructuredLogger implements LoggerService {
  log(message: unknown, ...optional: unknown[]): void { this.write('info', message, optional); }
  error(message: unknown, ...optional: unknown[]): void { this.write('error', message, optional); }
  warn(message: unknown, ...optional: unknown[]): void { this.write('warn', message, optional); }
  debug(message: unknown, ...optional: unknown[]): void { this.write('debug', message, optional); }
  verbose(message: unknown, ...optional: unknown[]): void { this.write('trace', message, optional); }

  private write(level: string, message: unknown, optional: unknown[]): void {
    const context = optional.find((x) => typeof x === 'string');
    const record = { timestamp:new Date().toISOString(), level, message:safe(message), context:context ?? undefined };
    const line = JSON.stringify(record);
    if (level === 'error') console.error(line); else console.log(line);
  }
}
function safe(value: unknown): string { return value instanceof Error ? value.name : typeof value === 'string' ? value : 'event'; }
