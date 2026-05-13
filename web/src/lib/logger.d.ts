interface LoggerOptions {
    prefix?: string;
    isDevelopment?: boolean;
}
declare class Logger {
    private prefix;
    private isDevelopment;
    constructor(options?: LoggerOptions);
    private formatMessage;
    /**
     * Debug level - only logged in development
     */
    debug(message: string, data?: any): void;
    /**
     * Info level - general information
     */
    info(message: string, data?: any): void;
    /**
     * Warn level - warnings and potential issues
     */
    warn(message: string, data?: any): void;
    /**
     * Error level - errors and exceptions
     * IMPORTANT: Never log sensitive data like tokens, passwords, card numbers
     */
    error(message: string, error?: Error | any): void;
    /**
     * Create a child logger with a different prefix
     */
    child(childPrefix: string): Logger;
}
export declare const logger: Logger;
export { Logger };
//# sourceMappingURL=logger.d.ts.map