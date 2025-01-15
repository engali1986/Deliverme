import { createLogger, format, transports } from 'winston';

// Define log format with timestamp
const logFormat = format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Create a Winston logger
const logger = createLogger({
  level: 'info', // Minimum logging level (error, warn, info, http, verbose, debug, silly)
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    logFormat
  ),
  transports: [
    new transports.Console(),                // Log to console
    new transports.File({ filename: 'app.log' }) // Log to a file
  ],
  exitOnError: false // Do not exit on handled exceptions
});

export default logger;
