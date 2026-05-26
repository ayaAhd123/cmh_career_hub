# CMH_CAREER_HUB Monorepo

> **Documentation complète** : [docs/](./docs/) — diagrammes UML, documentation officielle, référence API et ressources techniques.

This repository is now organized as a monorepo with:

- `frontend/` — existing React + TypeScript app
- `backend/` — Laravel 11 REST API using MySQL

## Setup

### 1. Install frontend dependencies
```bash
bun install
```

### 2. Install backend dependencies
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

### 3. Run the frontend
```bash
bun run dev:frontend
```

The frontend runs on `http://127.0.0.1:5173`.

### 4. Run the backend
```bash
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

The backend API runs on `http://127.0.0.1:8000`.

## API

Base API prefix:
- `http://127.0.0.1:8000/api/v1/...`

Health endpoint:
- `http://127.0.0.1:8000/api/v1/health`

## Notes

- `frontend/` retains all existing React config files and dependencies.
- `backend/` is a new Laravel 11 application using PHP 8.2 and MySQL.
- CORS is configured to allow `http://localhost:5173`.
