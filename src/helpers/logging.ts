import winston from "winston";

// configure logging methods:

const logFileOptions = {
    filename: "./output.log",
    options: {
        flags: "w"
    }
} satisfies winston.transports.FileTransportOptions;

// const logConsoleOptions = {
// } satisfies winston.transports.ConsoleTransportOptions;

winston.configure({
    level: "debug",
    transports: process.env.NODE_ENV === 'development' ? [
        /* if DEVELOPMENT MODE: use console log & output file */
        new winston.transports.Console(/* logConsoleOptions */),
        new winston.transports.File(logFileOptions)
    ] : [
        /* if PRODUCTION MODE: only use output file */
        new winston.transports.File(logFileOptions)
    ]
});

// export log functions:

/**
 * Logs a message (and data, if required).
 * 
 * @param message - the message to log
 * @param data - any data to append to the log alongside the message
 */
export function debug<T extends any[]>(message: string, ...data: T) {
    winston.debug(message, ...data);
}
