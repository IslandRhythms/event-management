'use strict';

require('../config');

const shouldLog = process.env.NODE_ENV !== 'test';

const log = (level, message, payload) => {
  if (!shouldLog) {
    return;
  }

  const timestamp = new Date().toISOString();
  const data = payload || '';

  switch (level) {
    case 'error':
      console.error(`[ERROR] ${timestamp} - ${message}`, data);
      break;
    case 'warn':
      console.warn(`[WARN] ${timestamp} - ${message}`, data);
      break;
    case 'info':
      console.log(`[INFO] ${timestamp} - ${message}`, data);
      break;
    default:
      console.log(`[DEBUG] ${timestamp} - ${message}`, data);
  }
};

const logger = {
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, error) => log('error', message, error),
};

module.exports = {
  logger,
};