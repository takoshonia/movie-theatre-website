# Kino XII

Cinema booking frontend for the Redberry Bootcamp XII assignment. The UI is in English and talks to the official Kino XII API.

**API docs:** [https://api.kinoxii.redberryinternship.ge/docs](https://api.kinoxii.redberryinternship.ge/docs)

## What it does

- Registration and login modals
- Home page with featured hero, now playing, coming soon, and recently viewed
- Sessions page with filters, search, sort, and pagination (filters mirrored in the URL)
- Movie detail page with sessions by date; notify-me for coming soon titles
- Two-step booking modal: seat selection → checkout → confirmation
- Profile page with personal info and My tickets (upcoming / past, refunds)

## Tech stack

- React 19
- Vite
- React Router 7
- CSS (no UI framework)

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## API

Base URL used by the app:

```text
https://api.kinoxii.redberryinternship.ge/api
```

Configured in `src/api/client.js`. Authenticated requests send `Authorization: Bearer <token>`.

Catalogue filters, ticket types, max seats per order, and hold duration are loaded from `GET /filter-options`.

**Seeded account from the API docs:**

| Field    | Value               |
| -------- | ------------------- |
| Email    | `jane@kinoxii.test` |
| Password | `password`          |

## Main routes

| Path             | Page            |
| ---------------- | --------------- |
| `/`              | Home            |
| `/sessions`      | Sessions list   |
| `/movies/:slug`  | Movie details   |
| `/profile`       | Profile / tickets |
