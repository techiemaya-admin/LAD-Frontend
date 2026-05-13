class Logger {
    constructor(options = {}) {
        this.prefix = options.prefix || '[LAD]';
        this.isDevelopment = options.isDevelopment ?? process.env.NODE_ENV === 'development';
    }
    formatMessage(level, message, data) {
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
    debug(message, data) {
        if (!this.isDevelopment)
            return;
        if (data) {
            console.debug(this.formatMessage('debug', message), data);
        }
        else {
            console.debug(this.formatMessage('debug', message));
        }
    }
    /**
     * Info level - general information
     */
    info(message, data) {
        if (data) {
            console.info(this.formatMessage('info', message), data);
        }
        else {
            console.info(this.formatMessage('info', message));
        }
    }
    /**
     * Warn level - warnings and potential issues
     */
    warn(message, data) {
        if (data) {
            console.warn(this.formatMessage('warn', message), data);
        }
        else {
            console.warn(this.formatMessage('warn', message));
        }
    }
    /**
     * Error level - errors and exceptions
     * IMPORTANT: Never log sensitive data like tokens, passwords, card numbers
     */
    error(message, error) {
        // Always use structured logging, never call console.error directly
        let errorData = undefined;
        if (error) {
            if (error instanceof Error) {
                errorData = {
                    message: error.message,
                    stack: this.isDevelopment ? error.stack : undefined,
                    name: error.name
                };
            }
            else if (typeof error === 'object') {
                errorData = error;
            }
            else {
                errorData = { value: error };
            }
        }
        // Output error using console.log to avoid triggering global error handlers
        if (errorData !== undefined) {
            // You can replace this with a custom transport if needed
            console.log(this.formatMessage('error', message), errorData);
        }
        else {
            console.log(this.formatMessage('error', message));
        }
    }
    /**
     * Create a child logger with a different prefix
     */
    child(childPrefix) {
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
//# sourceMappingURL=logger.js.map