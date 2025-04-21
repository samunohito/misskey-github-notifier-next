import type { ServerContext } from "@notifier/server/types";

export interface ILogger {
  log: (message: string, ...rest: string[]) => void;
  error: (message: string, ...rest: string[]) => void;
  warn: (message: string, ...rest: string[]) => void;
  info: (message: string, ...rest: string[]) => void;
  debug: (message: string, ...rest: string[]) => void;
}

export type LogLevel = "log" | "error" | "warn" | "info" | "debug";

export class ConsoleLogger implements ILogger {
  constructor(
    private readonly ctx: ServerContext,
    private readonly prefix?: string,
  ) {}

  private _log(func: (...args: unknown[]) => void, level: LogLevel, message: string, ...rest: string[]): void {
    const { method, path } = this.ctx.req;
    const timestamp = new Date().toISOString();
    func(`[${timestamp}]`, `[${level.toUpperCase()}]`, `[${method}]`, `[${path}]`, this.prefix ? `[${this.prefix}]` : undefined, message, ...rest);
  }

  log(message: string, ...rest: string[]): void {
    this._log(console.log, "log", message, ...rest);
  }

  error(message: string, ...rest: string[]): void {
    this._log(console.error, "error", message, ...rest);
  }

  warn(message: string, ...rest: string[]): void {
    this._log(console.warn, "warn", message, ...rest);
  }

  info(message: string, ...rest: string[]): void {
    this._log(console.info, "info", message, ...rest);
  }

  debug(message: string, ...rest: string[]): void {
    this._log(console.debug, "debug", message, ...rest);
  }
}
