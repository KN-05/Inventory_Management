# Inventory Management System

A full-stack Inventory Management System built with the MERN stack (MongoDB, Express, React, Node.js), with JWT authentication and role-based access control (Admin / Staff-Manager).

## Features

- **Authentication & RBAC** — JWT-based login, bcrypt password hashing, protected routes on both frontend and backend, two roles (Admin, Staff/Manager)
- **Product Management** — full CRUD, search by name/SKU, filter by category/supplier/status, stock increase/decrease, automatic stock status (In Stock / Low Stock / Out of Stock)
- **Category & Supplier Management** — full CRUD, protected against deletion while still in use by products
- **Dashboard** — live stats (totals, stock value), charts (stock status breakdown, products by category), recent activity feed
- **Stock Alerts** — created and resolved automatically as product stock crosses the low-stock threshold
- **Admin Panel** — user management (activate/deactivate, role assignment), stock report, supplier-wise report
- **Profile** — view/edit account details, change password
- **UI** — responsive sidebar/navbar layout, toast notifications, confirmation dialogs, loading/empty/error states throughout

## Tech Stack

**Frontend:** React (Vite), React Router, Axios, Recharts
**Backend:** Node.js, Express.js, JWT, bcrypt, express-validator
**Database:** MongoDB with Mongoose

## Project Structure

```
inventory-management/
├── server/            # Express API
│   ├── config/        # Database connection
│   ├── models/        # Mongoose schemas (7 collections)
│   ├── controllers/   # Route handler logic
│   ├── routes/        # Express routers
│   ├── middleware/    # Auth, role checks, validation, error handling
│   ├── utils/         # Helpers (JWT, async wrapper, activity logging)
│   └── server.js      # App entry point
├── client/            # React (Vite) frontend
│   └── src/
│       ├── api/            # Axios call wrappers per resource
│       ├── components/     # Reusable UI (layout, forms, tables, common)
│       ├── context/        # Auth + Toast global state
│       ├── pages/          # One file per route/screen
│       └── utils/          # Small shared helpers
└── docs/
    └── API.md         # Full API reference
```

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer
- A MongoDB database — either:
  - [MongoDB Community Server](https://www.mongodb.com/try/download/community) running locally, **or**
  - a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster (recommended if you don't want to install MongoDB locally)
- [Git](https://git-scm.com/)

## Installation

### 1. Clone / download the project
```bash
git clone <your-repo-url> inventory-management
cd inventory-management
```
(If you received this as a zip instead of a Git repo, just extract it and `cd` into the folder.)

### 2. Backend setup
```bash
cd server
npm install
cp .env.example .env
```
Now open `server/.env` and fill in your own values — see [Environment Variables](#environment-variables) below.

```bash
npm run dev
```
The API starts on `http://localhost:5000`. You should see `MongoDB connected: <host>` and `Server running on http://localhost:5000` in the console.

### 3. Frontend setup
Open a **new terminal**:
```bash
cd client
npm install
cp .env.example .env
npm run dev
```
The app opens on `http://localhost:5173`.

### 4. Log in
Go to `http://localhost:5173` and click **Register**.

There's no seed script and no demo accounts - the **first account you register becomes the Admin automatically** (see `registerUser` in `server/controllers/authController.js`). Once that first Admin exists, public registration closes itself, and that Admin creates every Manager/Staff account afterwards from the Admin Panel with their real name/email.

## Environment Variables

### `server/.env`
| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the API listens on | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/inventory_management` or an Atlas URI |
| `JWT_SECRET` | Secret used to sign JWTs — **use a long random string**, never commit a real one | `a-long-random-string-here` |
| `JWT_EXPIRES_IN` | How long tokens stay valid | `7d` |
| `CLIENT_URL` | Frontend origin, for CORS | `http://localhost:5173` |

A template lives at `server/.env.example` — copy it to `.env` and fill in real values. `.env` is git-ignored and should never be committed.

### `client/.env`
| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend API | `http://localhost:5000/api` |

Template at `client/.env.example`.

## Database Setup

**Option A — Local MongoDB:**
1. Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) for your OS.
2. Start it (`mongod`, or via your OS's service manager).
3. Use `MONGO_URI=mongodb://127.0.0.1:27017/inventory_management` in `server/.env`.

**Option B — MongoDB Atlas (no local install):**
1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas/register).
2. Under **Database Access**, create a database user with a password.
3. Under **Network Access**, allow your IP (or `0.0.0.0/0` for development only).
4. Click **Connect → Drivers**, copy the connection string, and paste it into `MONGO_URI` in `server/.env`, replacing `<password>` with your database user's password.

The app creates all collections automatically the first time documents are written to them — no manual schema setup needed, and no seed data to clean up afterwards.

## First Login

There is no seed script. Register the very first account at `http://localhost:5173/register` — it automatically becomes the **Admin** (see `registerUser` in `server/controllers/authController.js`). Public registration then closes itself; that Admin creates every Manager/Staff account from the Admin Panel afterwards, with their real name and email.

## API Documentation

Full endpoint reference: [`docs/API.md`](docs/API.md)

## Git Commands

If you're starting version control from scratch:
```bash
git init
git add .
git commit -m "Initial commit: MERN Inventory Management System"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```
Both `server/.gitignore` and `client/.gitignore` already exclude `node_modules/` and `.env` — your secrets won't be committed.

## Deployment

A typical free-tier deployment splits the two apps:

### Backend (e.g. Render, Railway, Fly.io)
1. Push this repo to GitHub.
2. Create a new **Web Service**, pointing at the `server/` folder as the root directory.
3. Build command: `npm install`. Start command: `npm start`.
4. Set environment variables (`PORT`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`) in the host's dashboard — use your **production** frontend URL for `CLIENT_URL`, and a MongoDB Atlas URI for `MONGO_URI`.
5. Deploy. Note the public URL (e.g. `https://your-api.onrender.com`).

### Frontend (e.g. Vercel, Netlify)
1. Create a new project pointing at the `client/` folder as the root directory.
2. Build command: `npm run build`. Output directory: `dist`.
3. Set the environment variable `VITE_API_URL` to your deployed backend URL + `/api` (e.g. `https://your-api.onrender.com/api`).
4. Deploy.

### After deploying
- Update `CLIENT_URL` in the backend's environment variables to match your deployed frontend URL (for CORS).
- Generate a fresh, long, random `JWT_SECRET` for production — don't reuse the local dev one.
- Register the first real Admin account through `/register` on your deployed frontend - it becomes Admin automatically, and public registration closes itself right after. Don't run any seed/demo-data script against a production database.

## Troubleshooting

| Problem | Likely cause |
|---|---|
| `MongoDB connection error` in the server console | `MONGO_URI` is wrong, or MongoDB isn't running/reachable. Double-check `.env`. |
| Frontend shows "Could not reach backend" | Backend isn't running, or `VITE_API_URL` in `client/.env` doesn't match where it's running. |
| CORS error in the browser console | `CLIENT_URL` in `server/.env` doesn't match the URL the frontend is actually running on. |
| Login fails with correct credentials | Make sure you registered that exact account, and that `JWT_SECRET` hasn't changed since the token was issued (changing it invalidates all existing tokens - just log in again). |

## Development Notes

This project was built incrementally across 12 phases (architecture → setup → models → auth → each feature module → dashboard → alerts → admin → profile → UI polish → testing → this document). If you're learning MERN from this codebase, every non-trivial file has inline comments explaining *why*, not just *what* — start with `server/server.js` and `client/src/App.jsx` to see how everything connects.
