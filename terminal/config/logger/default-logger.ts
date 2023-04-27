import chalk from 'chalk';
import {ApiLogger, Logger, LogLevel} from './api-logger';

const DEFAULT_CONTEXT = 'ray.sx API';

export class DefaultLogger implements ApiLogger {
  private static originalLogLevel: LogLevel;
  level: LogLevel = LogLevel.Info;
  private readonly timestamp: boolean;
  private defaultContext = DEFAULT_CONTEXT;
  private readonly localeStringOptions: Intl.DateTimeFormatOptions = {
    year: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    day: 'numeric',
    month: 'numeric'
  };

  constructor(options?: { level?: LogLevel; timestamp?: boolean }) {
    this.level = options && 'level' in options ? Number(options.level) : LogLevel.Info;
    this.timestamp = options && options.timestamp !== undefined ? options.timestamp : true;
  }

  static hideNestBootstrapLogs(): void {
    const {logger} = Logger;
    if(logger instanceof DefaultLogger) {
      if(logger.level === LogLevel.Info) {
        this.originalLogLevel = LogLevel.Info;
        logger.level = LogLevel.Warn;
      }
    }
  }

  static restoreOriginalLogLevel(): void {
    const {logger} = Logger;
    if(logger instanceof DefaultLogger && DefaultLogger.originalLogLevel !== undefined) {
      logger.level = DefaultLogger.originalLogLevel;
    }
  }

  setDefaultContext(defaultContext: string) {
    this.defaultContext = defaultContext;
  }

  error(message: string, context?: string, trace?: string | undefined): void {
    if(this.level >= LogLevel.Error) {
      this.logMessage(chalk.red(`error`), chalk.red(message + (trace ? ` trace: \n${trace}` : '')), context);
    }
  }

  warn(message: string, context?: string): void {
    if(this.level >= LogLevel.Warn) {
      this.logMessage(chalk.yellow(`warn`), chalk.yellow(message), context);
    }
  }

  info(message: string, context?: string): void {
    if(this.level >= LogLevel.Info) {
      this.logMessage(chalk.blue(`info`), message, context);
    }
  }

  verbose(message: string, context?: string): void {
    if(this.level >= LogLevel.Verbose) {
      this.logMessage(chalk.magenta(`verbose`), message, context);
    }
  }

  debug(message: string, context?: string): void {
    if(this.level >= LogLevel.Debug) {
      this.logMessage(chalk.magenta(`debug`), message, context);
    }
  }

  private logMessage(prefix: string, message: string, context?: string) {
    process.stdout.write([prefix, this.logTimestamp(), this.logContext(context), message, '\n'].join(' '));
  }

  private logContext(context?: string) {
    return chalk.cyan(`[${context || this.defaultContext}]`);
  }

  private logTimestamp() {
    if(this.timestamp) {
      const timestamp = new Date(Date.now()).toLocaleString(undefined, this.localeStringOptions);
      return chalk.gray(timestamp + ' -');
    } else {
      return '';
    }
  }
}
