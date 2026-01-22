/**
 * Logger Utility
 * 
 * Centralized logging for AI ICP Assistant feature.
 * Respects NODE_ENV and log levels.
 */
const LOG_LEVEL = process.env.NEXT_PUBLIC_LOG_LEVEL || 
                  (process.env.NODE_ENV === 'production' ? 'warn' : 'debug');
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
const shouldLog = (level: keyof typeof LOG_LEVELS): boolean => {
  const currentLevel = LOG_LEVELS[LOG_LEVEL as keyof typeof LOG_LEVELS] || LOG_LEVELS.debug;
  const messageLevel = LOG_LEVELS[level] || LOG_LEVELS.debug;
  return messageLevel >= currentLevel;
};
const formatMessage = (prefix: string, ...args: any[]): any[] => {
  const timestamp = new Date().toISOString();
  return [`[${timestamp}] [${prefix}]`, ...args];
};
export const logger = {
  debug: (...args: any[]) => {
    if (shouldLog('debug') && process.env.NODE_ENV !== 'test') {
      );
    }
  },
  info: (...args: any[]) => {
    if (shouldLog('info') && process.env.NODE_ENV !== 'test') {
      );
    }
  },
  warn: (...args: any[]) => {
    if (shouldLog('warn') && process.env.NODE_ENV !== 'test') {
      console.warn(...formatMessage('WARN', ...args));
    }
  },
  error: (...args: any[]) => {
    if (shouldLog('error') && process.env.NODE_ENV !== 'test') {
      console.error(...formatMessage('ERROR', ...args));
    }
  },
};