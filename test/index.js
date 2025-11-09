'use strict';
const assert = require('assert');
const sinon = require('sinon');
const { describe, it, before, after, afterEach } = require('mocha');
const listenMock = require('../mock-server');
const { fastifyRoutes } = require('../services/index');


const retryAttempts = 3;


describe('Service routes', function() {
  before(async function() {
    await listenMock();
    await fastifyRoutes.ready();
  });

  after(async function() {
    await fastifyRoutes.close();
  });

  afterEach(function() {
    sinon.restore();
  });

  it('GET /health returns ok', async function() {
    const response = await fastifyRoutes.inject({
      method: 'GET',
      url: '/health',
    });

    assert.strictEqual(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    assert.strictEqual(payload.status, 'ok');
  });

  it('GET /getUsers returns list of users', async function() {
    const response = await fastifyRoutes.inject({
      method: 'GET',
      url: '/getUsers',
    });

    assert.strictEqual(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    assert.ok(Array.isArray(payload), 'response should be an array');
    assert.ok(payload.length > 0, 'users array should not be empty');
  });

  it('GET /getEvents returns list of events', async function() {
    const response = await fastifyRoutes.inject({
      method: 'GET',
      url: '/getEvents',
    });

    assert.strictEqual(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    assert.ok(Array.isArray(payload), 'response should be an array');
    assert.ok(payload.length > 0, 'events array should not be empty');
  });

  it('GET /getEventsByUserId/:id returns events for user', async function() {
    const response = await fastifyRoutes.inject({
      method: 'GET',
      url: '/getEventsByUserId/1',
    });

    assert.strictEqual(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    assert.ok(Array.isArray(payload), 'response should be an array');
    assert.ok(payload.length > 0, 'user events array should not be empty');
  });

  it('POST /addEvent responds with success', async function() {
    const response = await fastifyRoutes.inject({
      method: 'POST',
      url: '/addEvent',
      headers: {
        'Content-Type': 'application/json',
      },
      payload: {
        userId: 1,
        name: 'Test Event',
        details: 'Created during tests',
      },
    });

    assert.strictEqual(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    assert.strictEqual(payload.success, true);
  });

  it('POST /addEvent returns 503 after repeated timeouts', async function() {
    const fetchStub = sinon.stub(global, 'fetch').callsFake((url, options = {}) => {
      return new Promise((resolve, reject) => {
        const signal = options.signal;
        if (signal) {
          const onAbort = () => {
            const abortError = new Error('Request aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          };
          if (signal.aborted) {
            onAbort();
            return;
          }
          signal.addEventListener('abort', onAbort, { once: true });
        }
      });
    });

    const response = await fastifyRoutes.inject({
      method: 'POST',
      url: '/addEvent',
      headers: {
        'Content-Type': 'application/json',
      },
      payload: {
        userId: 42,
        name: 'Timeout Event',
        details: 'This request is expected to time out',
      },
    });

    assert.strictEqual(response.statusCode, 503);
    const payload = JSON.parse(response.body);
    assert.strictEqual(payload.error, 'Event service temporarily unavailable');
    assert.strictEqual(fetchStub.callCount, retryAttempts);
  });
});