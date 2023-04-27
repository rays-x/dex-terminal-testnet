import {LoggerService} from '@nestjs/common';

export enum LogLevel {
  Error = 0,
  Warn = 1,
  Info = 2,
  Verbose = 3,
  Debug = 4,
}

export interface ApiLogger {
  error(message: string, context?: string, trace?: string): void;

  warn(message: string, context?: string): void;

  info(message: string, context?: string): void;

  verbose(message: string, context?: string): void;

  debug(message: string, context?: string): void;
}

const noopLogger: ApiLogger = {
  error() {
    /* */
  },
  warn() {
    /* */
  },
  info() {
    /* */
  },
  verbose() {
    /* */
  },
  debug() {
    /* */
  }
};

export class Logger implements LoggerService {
  private static _logger: ApiLogger;

  static get logger(): ApiLogger {
    return this._logger || noopLogger;
  }

  private static _instance: typeof Logger = Logger;

  private get instance(): typeof Logger {
    const {_instance} = Logger;
    return _instance;
  }

  static useLogger(logger: ApiLogger) {
    Logger._logger = logger;
  }

  static error(message: string, context?: string, trace?: string): void {
    Logger.logger.error(message, context, trace);
  }

  static warn(message: string, context?: string): void {
    Logger.logger.warn(message, context);
  }

  static info(message: string, context?: string): void {
    Logger.logger.info(message, context);
  }

  static verbose(message: string, context?: string): void {
    Logger.logger.verbose(message, context);
  }

  static debug(message: string, context?: string): void {
    Logger.logger.debug(message, context);
  }

  error(message: any, trace?: string, context?: string): any {
    this.instance.error(message, context, trace);
  }

  warn(message: any, context?: string): any {
    this.instance.warn(message, context);
  }

  log(message: any, context?: string): any {
    this.instance.info(message, context);
  }

  verbose(message: any, context?: string): any {
    this.instance.verbose(message, context);
  }

  debug(message: any, context?: string): any {
    this.instance.debug(message, context);
  }
}
