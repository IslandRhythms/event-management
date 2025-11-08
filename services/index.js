const fastify = require('fastify')({ logger: true });
const listenMock = require('../mock-server');
const { logger } = require('../utils/logger');
require('../config');

const getEnvPrefix = () => `[${process.env.NODE_ENV}]`;

fastify.get('/getUsers', async (request, reply) => {
  logger.info(`${getEnvPrefix()} Received GET /getUsers`, {
    params: request.params,
    query: request.query
  });
  try {
    const resp = await fetch('http://event.com/getUsers');
    const data = await resp.json();
    logger.info(`${getEnvPrefix()} Sending response for GET /getUsers`, {
      statusCode: 200,
      payload: data
    });
    reply.send(data); 
  } catch (error) {
    logger.error(`${getEnvPrefix()} Failed to fetch users`, error);
    reply.code(500).send({ error: 'Failed to fetch users' });
  }
});

fastify.post('/addEvent', async (request, reply) => {
  logger.info(`${getEnvPrefix()} Received POST /addEvent`, {
    body: request.body
  });
  try {
    const resp = await fetch('http://event.com/addEvent', {
      method: 'POST',
      body: JSON.stringify({
        id: new Date().getTime(),
        ...request.body
      })
    });
    const data = await resp.json();
    logger.info(`${getEnvPrefix()} Sending response for POST /addEvent`, {
      statusCode: 200,
      payload: data
    });
    reply.send(data);
  } catch (error) {
    logger.error(`${getEnvPrefix()} Failed to add event`, error);
    reply.code(500).send({ error: 'Failed to add event' });
  }
});

fastify.get('/getEvents', async (request, reply) => {  
  logger.info(`${getEnvPrefix()} Received GET /getEvents`, {
    params: request.params,
    query: request.query
  });
  try {
    const resp = await fetch('http://event.com/getEvents');
    const data = await resp.json();
    logger.info(`${getEnvPrefix()} Sending response for GET /getEvents`, {
      statusCode: 200,
      payload: data
    });
    reply.send(data);
  } catch (error) {
    logger.error(`${getEnvPrefix()} Failed to fetch events`, error);
    reply.code(500).send({ error: 'Failed to fetch events' });
  }
});

fastify.get('/getEventsByUserId/:id', async (request, reply) => {
  logger.info(`${getEnvPrefix()} Received GET /getEventsByUserId`, {
    params: request.params
  });
  try {
    const { id } = request.params;
    const user = await fetch('http://event.com/getUserById/' + id);
    const userData = await user.json();
    const userEvents = userData.events;
    const eventArray = [];
    // it would be faster to call getEvents, filter by userId, and then return that.
    // But the mock has a 500ms delay on the call, so it seems the task needs to work around the 500ms delay
    for (let i = 0; i < userEvents.length; i++) {
      const event = fetch('http://event.com/getEventById/' + userEvents[i]);
      eventArray.push(event);
    }
    const eventResponse = await Promise.all(eventArray);
    // cuts the response time in half doing it this way
    const eventJSONData = await Promise.all(eventResponse.map((res) => res.json()))
    logger.info(`${getEnvPrefix()} Sending response for GET /getEventsByUserId`, {
      statusCode: 200,
      payload: eventJSONData
    });
    // Could cut the response time even further theoretically be implementing a cache.
    reply.send(eventJSONData);
  } catch (error) {
    logger.error(`${getEnvPrefix()} Failed to fetch events for user`, error);
    reply.code(500).send({ error: 'Failed to fetch events for user' });
  }
});

fastify.get('/health', async (request, reply) => {
  logger.info(`${getEnvPrefix()} Received GET /health`, {
    params: request.params,
    query: request.query
  });
  const payload = { status: 'ok' };
  logger.info(`${getEnvPrefix()} Sending response for GET /health`, {
    statusCode: 200,
    payload
  });
  reply.send(payload);
});

if (process.env.NODE_ENV !== 'test') {
  fastify.listen({ port: 3000 }, (err) => {
    if (err) {
      fastify.log.error(err);
      fastify.close();
      process.exit(-1);
    }
  
    listenMock().catch((mockErr) => {
      logger.error(`${getEnvPrefix()} Failed to start mock server`, mockErr);
      fastify.log.error(mockErr);
    });
  });
}


module.exports = { fastifyRoutes: fastify };


