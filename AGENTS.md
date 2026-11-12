# Repository instructions

## Repository layout

This repository contains two independent npm projects. Run commands from the relevant project directory; there is no root-level npm workspace.

- `devanswers-backend` is an Express 5 API backed by MongoDB/Mongoose.
- `devanswers-frontend` is a React 19 single-page application built with Vite.

## Build, test, and lint

Run backend commands from `devanswers-backend`:

```sh
npm start
npm run dev
npm test
npm test -- tests/integration/questions.test.js
npm test -- tests/integration/questions.test.js -t "GET /api/questions"
```

The backend test script runs Vitest. Integration tests use Supertest and an in-memory MongoDB; test files import `tests/setup.js` to manage the database lifecycle. There is no backend lint or build script.

Run frontend commands from `devanswers-frontend`:

```sh
npm run dev
npm run build
npm run lint
npm test
npm test -- tests/unit/reducers/questionSlice.test.jsx
npm test -- tests/unit/reducers/questionSlice.test.jsx -t "test name"
```

Frontend tests run in Vitest with jsdom. `tests/setup.js` starts the MSW server and resets its handlers between tests.

## Architecture

The backend request path is Express app middleware (`src/app.js`) → mounted resource routers (`src/routes/`) → controllers → services → Mongoose models (`src/models/`). Keep HTTP concerns and response formatting in controllers, and data access and domain rules in services. API responses use a `success`, `message`, and `data` envelope; errors flow through `src/middleware/errorHandler.js`, with status codes created by `src/utils/createAppError.js`. Routes apply `src/middleware/authHandler.js` to protected operations; it verifies the bearer JWT and attaches the authenticated user's ID and admin flag to `req.user`. Question and answer voting share `src/services/voteService.js`.

The backend process in `main.js` connects to MongoDB before starting the server. Runtime settings are read from environment variables; `.env.example` documents the expected backend variables.

The frontend entry point (`src/main.jsx`) mounts the app with Redux and React Router. `src/App.jsx` defines page routes and shared layouts. Feature state and asynchronous requests are coordinated by Redux Toolkit slices in `src/reducers/`; components and pages use frontend service modules for API operations. `src/api/axiosInstance.js` supplies the shared `/api` base URL, while `src/config/config.js` defines endpoint paths. Authenticated service calls send the bearer token in the `Authorization` header. The test MSW handlers in `tests/mocks/handlers.js` mock that same API.

## Repository-specific conventions

- Backend files use ES modules. Resource routes are mounted under `/api` in `src/routes/index.js`; keep protected and public endpoints explicit in each resource router.
- Controllers return JSON in the established response envelope, and service-layer failures should use `createAppError` so the error middleware can provide the intended HTTP status.
- Mongoose models use ObjectId references for relations such as question authors, tags, and votes. Populate referenced fields where API consumers need their display data.
- Frontend endpoint paths belong in `src/config/config.js`; implemented service modules use the shared Axios instance and return the response payload rather than making components issue requests directly.
- Backend tests use `*.test.js` under `tests/`; frontend tests use `*.test.jsx` under `tests/`. Integration coverage belongs in `tests/integration/`, and focused module tests belong in `tests/unit/`.
