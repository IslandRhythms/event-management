process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const listenMock = require('../mock-server');
const { fastifyRoutes } = require('../services');

const USER_ID = 1;
const ADD_EVENT_URL = '/addEvent';
const EVENTS_BY_USER_URL = `/getEventsByUserId/${USER_ID}`;

const addEvents = async (count) => {
  console.log(`Adding ${count} events for user ${USER_ID} via Fastify inject...`);
  for (let i = 0; i < count; i += 1) {
    const payload = {
      userId: USER_ID,
      name: `Load Test Event ${i}`,
      details: 'Performance testing event',
    };

    const response = await fastifyRoutes.inject({
      method: 'POST',
      url: ADD_EVENT_URL,
      payload,
    });

    const body = JSON.parse(response.body);
    if (!body.success) {
      console.warn(`Failed to add event index ${i}`, body);
    }
  }
  console.log('Finished adding events.');
};

const timeRequest = async () => {
  console.log(`Fetching events for user ${USER_ID} via Fastify inject...`);
  const start = Date.now();
  const response = await fastifyRoutes.inject({
    method: 'GET',
    url: EVENTS_BY_USER_URL,
  });
  const events = JSON.parse(response.body);
  const duration = Date.now() - start;

  console.log(`Fetch completed in ${duration}ms. Received ${events.length} events.`);
};

const run = async () => {
  try {
    await listenMock();
    await fastifyRoutes.ready();
    await timeRequest();
    await addEvents(20);
    await timeRequest();
  }
  catch (err) {
    console.error('Error while testing route slowness', err);
    process.exitCode = 1;
  }
  finally {
    await fastifyRoutes.close();
  }
};

run();

