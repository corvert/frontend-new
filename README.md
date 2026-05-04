# Investment Tracker Frontend

## Overview

This React + Vite frontend powers the Investment Tracker application. It provides the user interface for authentication, portfolio management, cash flow tracking. The UI is localized in English and Estonian.

## Features

- Authentication flows: login, signup, password reset, OAuth redirect handling
- Portfolio tracking: assets, trades, and cash operations
- Admin views for audit logs and user management
- Internationalization (en, et)

## Tech Stack

- React 19 + Vite
- React Router
- MUI + Tailwind CSS
- Axios for API calls
- i18next for localization
- Vitest + Testing Library for tests

## Configuration

The frontend reads the API origin from `VITE_API_URL` and defaults to `http://localhost:8080`.

Example `.env`:

```bash
VITE_API_URL=http://localhost:8080
```

During development, Vite proxies `/api` and `/oauth2` to the backend.

## Development

```bash
npm install
npm run dev
```

## Tests

```bash
npm run test
```
