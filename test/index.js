'use strict';
const assert = require('assert');
const { describe, it, before, after } = require('mocha');
const listenMock = require('../mock-server');
const { fastifyRoutes } = require('../services/index');

describe('Service routes', function() {
  before(async function() {
    await listenMock();
    await fastifyRoutes.ready();
  });

  after(async function() {
    await fastifyRoutes.close();
  });

  it('GET /health returns ok', async function() {
    const response = await fastifyRoutes.inject({
      method: 'GET',
      url: '/health'
    });

    assert.strictEqual(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    assert.strictEqual(payload.status, 'ok');
  });

  it('GET /getUsers returns list of users', async function() {
    const response = await fastifyRoutes.inject({
      method: 'GET',
      url: '/getUsers'
    });

    assert.strictEqual(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    assert.ok(Array.isArray(payload), 'response should be an array');
    assert.ok(payload.length > 0, 'users array should not be empty');
  });

  it('GET /getEvents returns list of events', async function() {
    const response = await fastifyRoutes.inject({
      method: 'GET',
      url: '/getEvents'
    });

    assert.strictEqual(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    assert.ok(Array.isArray(payload), 'response should be an array');
    assert.ok(payload.length > 0, 'events array should not be empty');
  });

  it('GET /getEventsByUserId/:id returns events for user', async function() {
    const response = await fastifyRoutes.inject({
      method: 'GET',
      url: '/getEventsByUserId/1'
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
        'Content-Type': 'application/json'
      },
      payload: {
        userId: 1,
        name: 'Test Event',
        details: 'Created during tests'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    assert.strictEqual(payload.success, true);
  });
});