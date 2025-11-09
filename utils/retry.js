'use strict';

const sleep = require('./sleep');

module.exports = async function retry(fn, attempts = 3, delayMs = 100, onRetry = () => {}) {
  if (attempts < 1) {
    throw new Error('retry requires at least one attempt');
  }

  let attempt = 0;
  while (attempt < attempts) {
    try {
      attempt += 1;
      return await fn(attempt);
    } catch (error) {
      if (attempt >= attempts) {
        throw error;
      }
      await onRetry(error, attempt);
      await sleep(delayMs * (Math.pow(2, attempt)));
    }
  }
};