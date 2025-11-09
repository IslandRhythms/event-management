require('../config');
const isTest = process.env.NODE_ENV === 'test';
const fastify = require('fastify')({ logger: process.env.NODE_ENV });
const listenMock = require('../mock-server');
const { logger } = require('../utils/logger');
const retry = require('../utils/retry');


const getEnvPrefix = () => `[${process.env.NODE_ENV}]`;

const downFailureThreshold = 3;
const probeIntervalMs = 5000;
const retryAttempts = 3;
const retryDelayMs = isTest ? 20 : 150;
const requestTimeoutMs = isTest ? 100 : 1500;

const downDetector = {
  failureCount: 0,
  isHealthy: true,
  nextProbeAt: 0,
};

const scheduler = {
  timerId: null,
  isRunning: false,
};

const defaultProbePayload = () => ({
  userId: 1,
  name: 'Scheduler health check event',
  details: 'Automatically generated to verify addEvent availability',
});

const resetScheduler = () => {
  if (scheduler.timerId) {
    clearTimeout(scheduler.timerId);
    scheduler.timerId = null;
  }
};

const resetHealth = () => {
  downDetector.failureCount = 0;
  downDetector.isHealthy = true;
  downDetector.nextProbeAt = 0;
  resetScheduler();
};

const runBackgroundProbe = async () => {
  scheduler.timerId = null;
  scheduler.isRunning = true;

  const payload = defaultProbePayload();

  try {
    await performAddEventRequest(payload);
    resetHealth();
    logger.info(`${getEnvPrefix()} Background addEvent probe succeeded`, {
      payload: { userId: payload.userId, name: payload.name },
    });
  }
  catch (error) {
    logger.warn(`${getEnvPrefix()} Background addEvent probe failed`, {
      status: error.status,
      code: error.code,
    });
    downDetector.isHealthy = false;
    downDetector.nextProbeAt = Date.now() + probeIntervalMs;
  }
  finally {
    scheduler.isRunning = false;
    if (!downDetector.isHealthy) {
      scheduleBackgroundProbe();
    }
  }
};

const scheduleBackgroundProbe = () => {
  if (downDetector.isHealthy) {
    return;
  }

  if (scheduler.isRunning || scheduler.timerId) {
    return;
  }

  const delay = Math.max(downDetector.nextProbeAt - Date.now(), 0);
  scheduler.timerId = setTimeout(runBackgroundProbe, delay);
  logger.info(`${getEnvPrefix()} Scheduled background addEvent probe`, {
    delayMs: delay,
  });
};

const performAddEventRequest = async (body) => {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, requestTimeoutMs);

  try {
    const resp = await fetch('http://event.com/addEvent', {
      method: 'POST',
      body: JSON.stringify({
        id: new Date().getTime(),
        ...body,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data;
    try {
      data = await resp.json();
    }
    catch (error) {
      logger.warn(`${getEnvPrefix()} Unable to parse addEvent response`, {
        status: resp.status,
        error: error.message,
      });
      data = undefined;
    }

    if (!resp.ok || !data) {
      const error = new Error('Event API request failed');
      error.status = resp.status;
      error.payload = data;
      throw error;
    }

    return data;
  }
  catch (error) {
    if (timedOut || error.name === 'AbortError') {
      const timeoutError = new Error('Event API request timed out');
      timeoutError.status = 503;
      timeoutError.code = 'ETIMEDOUT';
      throw timeoutError;
    }
    throw error;
  }
  finally {
    clearTimeout(timeoutId);
  }
};

fastify.post('/addEvent', async (request, reply) => {
  logger.info(`${getEnvPrefix()} Received POST /addEvent`, {
    body: request.body,
  });

  if (!downDetector.isHealthy && Date.now() < downDetector.nextProbeAt) {
    const retryAfter = Math.max(downDetector.nextProbeAt - Date.now(), 0);
    logger.warn(`${getEnvPrefix()} Event API marked down, skipping request`, {
      retryAfterMs: retryAfter,
    });
    return reply
      .code(503)
      .send({
        error: 'Event service temporarily unavailable',
        message: 'Please retry after the cooldown period',
        retryAfterMs: retryAfter,
      });
  }

  try {
    const data = await retry(
      () => performAddEventRequest(request.body),
      retryAttempts,
      retryDelayMs,
      (error, attempt) => {
        logger.warn(`${getEnvPrefix()} Retry addEvent attempt failed`, {
          attempt,
          status: error.status,
          payload: error.payload,
        });
      },
    );
    resetHealth();
    logger.info(`${getEnvPrefix()} Sending response for POST /addEvent`, {
      statusCode: 200,
      payload: data,
    });
    reply.send(data);
  }
  catch (error) {
    logger.error(`${getEnvPrefix()} Failed to add event`, error);
    downDetector.failureCount += 1;

    if (downDetector.failureCount >= downFailureThreshold) {
      downDetector.isHealthy = false;
      downDetector.nextProbeAt = Date.now() + probeIntervalMs;
      scheduleBackgroundProbe();
    }

    const status = error.status === 503 ? 503 : 500;
    reply
      .code(status)
      .send({
        error: status === 503 ? 'Event service temporarily unavailable' : 'Failed to add event',
        message: error.payload?.message || undefined,
        status,
      });
  }
});

fastify.get('/getUsers', async (request, reply) => {
  logger.info(`${getEnvPrefix()} Received GET /getUsers`, {
    params: request.params,
    query: request.query,
  });
  try {
    const resp = await fetch('http://event.com/getUsers');
    const data = await resp.json();
    logger.info(`${getEnvPrefix()} Sending response for GET /getUsers`, {
      statusCode: 200,
      payload: data,
    });
    reply.send(data);
  }
  catch (error) {
    logger.error(`${getEnvPrefix()} Failed to fetch users`, error);
    reply.code(500).send({ error: 'Failed to fetch users' });
  }
});

fastify.get('/getEvents', async (request, reply) => {
  logger.info(`${getEnvPrefix()} Received GET /getEvents`, {
    params: request.params,
    query: request.query,
  });
  try {
    const resp = await fetch('http://event.com/getEvents');
    const data = await resp.json();
    logger.info(`${getEnvPrefix()} Sending response for GET /getEvents`, {
      statusCode: 200,
      payload: data,
    });
    reply.send(data);
  }
  catch (error) {
    logger.error(`${getEnvPrefix()} Failed to fetch events`, error);
    reply.code(500).send({ error: 'Failed to fetch events' });
  }
});

fastify.get('/getEventsByUserId/:id', async (request, reply) => {
  logger.info(`${getEnvPrefix()} Received GET /getEventsByUserId`, {
    params: request.params,
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
    const eventJSONData = await Promise.all(eventResponse.map((res) => res.json()));
    logger.info(`${getEnvPrefix()} Sending response for GET /getEventsByUserId`, {
      statusCode: 200,
      payload: eventJSONData,
    });
    // Could cut the response time even further theoretically be implementing a cache.
    reply.send(eventJSONData);
  }
  catch (error) {
    logger.error(`${getEnvPrefix()} Failed to fetch events for user`, error);
    reply.code(500).send({ error: 'Failed to fetch events for user' });
  }
});

fastify.get('/health', async (request, reply) => {
  logger.info(`${getEnvPrefix()} Received GET /health`, {
    params: request.params,
    query: request.query,
  });
  const payload = { status: 'ok' };
  logger.info(`${getEnvPrefix()} Sending response for GET /health`, {
    statusCode: 200,
    payload,
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

