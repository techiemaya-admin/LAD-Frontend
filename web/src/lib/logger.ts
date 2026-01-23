/**
 * Centralized Logger Utility
 * 
 * LAD Architecture Compliance:
 * - Replaces console.log/error/warn throughout codebase
 * - NO secrets, tokens, passwords, or sensitive data in logs
 * - Structured logging with levels
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
interface LoggerOptions {
  prefix?: string;
  isDevelopment?: boolean;
}
class Logger {
  private prefix: string;
  private isDevelopment: boolean;
  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '[LAD]';
    this.isDevelopment = options.isDevelopment ?? process.env.NODE_ENV === 'development';
  }
  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase();
    if (data) {
      return `${timestamp} ${this.prefix} [${levelStr}] ${message}`;
    }
    return `${timestamp} ${this.prefix} [${levelStr}] ${message}`;
  }
  /**
   * Debug level - only logged in development
   */
  debug(message: string, data?: any): void {
    if (!this.isDevelopment) return;
    if (data) {
      console.debug(this.formatMessage('debug', message), data);
    } else {
      console.debug(this.formatMessage('debug', message));
    }
  }
  /**
   * Info level - general information
   */
  info(message: string, data?: any): void {
    if (data) {
      console.info(this.formatMessage('info', message), data);
    } else {
      console.info(this.formatMessage('info', message));
    }
  }
  /**
   * Warn level - warnings and potential issues
   */
  warn(message: string, data?: any): void {
    if (data) {
      console.warn(this.formatMessage('warn', message), data);
    } else {
      console.warn(this.formatMessage('warn', message));
    }
  }
  /**
   * Error level - errors and exceptions
   * IMPORTANT: Never log sensitive data like tokens, passwords, card numbers
   */
  error(message: string, error?: Error | any): void {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: this.isDevelopment ? error.stack : undefined }
      : error;
    if (errorData) {
      console.error(this.formatMessage('error', message), errorData);
    } else {
      console.error(this.formatMessage('error', message));
    }
  }
  /**
   * Create a child logger with a different prefix
   */
  child(childPrefix: string): Logger {
    return new Logger({
      prefix: `${this.prefix} [${childPrefix}]`,
      isDevelopment: this.isDevelopment,
    });
  }
}
// Export singleton instance
export const logger = new Logger({
  isDevelopment: typeof window !== 'undefined' ? process.env.NODE_ENV === 'development' : true,
});
// Export class for testing or custom instances
export { Logger };