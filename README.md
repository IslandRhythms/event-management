# event-management

* [Configuration](#configuration)
* [Running](#running)
* [Response Data](#response-data)



## Configuration

The project loads config from the `config.js` file.
The `config.js` file uses [dotenv](https://www.npmjs.com/package/dotenv) to load config from the various `.env.*` files in the repo's top level.
For example, `env NODE_ENV=local` means `config.js` adds `env.local` to the environment.

Each environment should have a corresponding env file. The .env.test file includes all the necessary keys you would need when working locally on the project.

## Running

Be sure to run `npm install` to download the required dependencies and interact with the project.
The API runs on `http://localhost:3000`. To make requests, you can use `curl` from the shell or an API testing tool like [Postman](https://www.postman.com/).
Here is an example request you could make to ensure you have everything up and running correctly:

```bash
 curl --location --request POST 'http://localhost:3000/addEvent' \
--header 'Content-Type: application/json' \
--data-raw '{
    "name": "hello",
    "userId": "3"
}'
```

If you do not specify what environment you're using, `config.js` defaults to local.

## Response Data

Each route returns JSON. Fastify includes a `statusCode` property with a `Number` value indicating the http response code in addition to what each route is expected to return. Property types are documented below:

```json
GET /health
{
  "status": "string"
}

GET /getUsers
[
  {
    "id": "number",
    "userName": "string",
    "email": "string",
    "events": "string[]"
  }
]

GET /getEvents
[
  {
    "id": "number",
    "name": "string",
    "userId": "number",
    "details": "string"
  }
]

GET /getEventsByUserId/:id
[
  {
    "id": "number",
    "name": "string",
    "userId": "number",
    "details": "string"
  }
]

POST /addEvent
{
  "success": "boolean",
  "error": "string | undefined",
  "message": "string | undefined"
}
```
