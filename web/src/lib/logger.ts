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
   * In production, silently ignored per LAD compliance
   */
  debug(message: string, data?: any): void {
    if (!this.isDevelopment) return;
    
    // Only log in development - silently ignored in production
    if (typeof window !== 'undefined' && this.isDevelopment) {
      try {
        // Only use console if explicitly in development mode
        if (data) {
          console.debug(this.formatMessage('debug', message), data);
        } else {
          console.debug(this.formatMessage('debug', message));
        }
      } catch {
        // Silent catch - prevent logging from breaking app
      }
    }
  }

  /**
   * Info level - general information
   * Silently ignored in production per LAD compliance
   */
  info(message: string, data?: any): void {
    if (this.isDevelopment && typeof window !== 'undefined') {
      try {
        if (data) {
          console.info(this.formatMessage('info', message), data);
        } else {
          console.info(this.formatMessage('info', message));
        }
      } catch {
        // Silent catch - prevent logging from breaking app
      }
    }
    // In production, silently ignored
  }

  /**
   * Warn level - warnings and potential issues
   * Silently ignored in production per LAD compliance
   */
  warn(message: string, data?: any): void {
    if (this.isDevelopment && typeof window !== 'undefined') {
      try {
        if (data) {
          console.warn(this.formatMessage('warn', message), data);
        } else {
          console.warn(this.formatMessage('warn', message));
        }
      } catch {
        // Silent catch - prevent logging from breaking app
      }
    }
    // In production, silently ignored
  }

  /**
   * Error level - errors and exceptions
   * IMPORTANT: Never log sensitive data like tokens, passwords, card numbers
   * In production, sent to external logging service (if configured)
   * For now, silently ignored per LAD compliance
   */
  error(message: string, error?: Error | any): void {
    // Extract safe error data
    const errorData = error instanceof Error 
      ? { 
          message: error.message, 
          stack: this.isDevelopment ? error.stack : undefined,
          name: error.name
        }
      : (typeof error === 'object' ? { ...error } : String(error));
    
    if (this.isDevelopment && typeof window !== 'undefined') {
      try {
        if (errorData) {
          console.error(this.formatMessage('error', message), errorData);
        } else {
          console.error(this.formatMessage('error', message));
        }
      } catch {
        // Silent catch - prevent logging from breaking app
      }
    }
    // In production, could send to external service like Sentry, LogRocket, etc.
    // For now: silently ignored per LAD compliance requirement
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
