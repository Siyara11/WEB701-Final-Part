# Nelson Community Harvest – WEB701 Milestone 3

A full-stack **MERN** (MongoDB, Express, React, Node.js) website for a fictitious Nelson charity.
Charity **members** register donated products and services; **beneficiaries** receive 10 tokens,
acquire a token for an item and show a claim code at pickup, where the member **accepts the token**.

Emerging technologies: **Progressive Web App** (service worker + manifest: installable, works offline)
and **WebSockets** via Socket.IO (real-time stock and token notifications).

## Links
- Report: `docs/WEB701_Milestone3_Report.docx`
- Project board: _add your GitHub Project link here_

## Repository structure
```
backend/   Express REST API + Socket.IO, Mongoose models, Jest/Supertest tests
  app.js            Express app (routes, middleware)
  server.js         HTTP + Socket.IO server, MongoDB connection
  models/           User, Product, Transaction schemas
  routes/           auth.js, products.js, transactions.js
  middleware/       auth.js (JWT verification + role check)
  tests/            14 automated API tests
frontend/  React single page app (PWA)
  public/service-worker.js   offline caching
  public/manifest.json       install metadata
  src/App.js                 state, sockets, offline + install handling
  src/components/            AuthForm, ProductForm, ProductList, TransactionList, AccountSettings
```

## Run locally
Requirements: Node.js 18+, MongoDB running on `mongodb://127.0.0.1:27017`.

```bash
# 1. Backend
cd backend
cp .env.example .env        # edit JWT_SECRET
npm install
npm run dev                 # http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm start                   # http://localhost:3000
# For full PWA/offline testing use the production build:
npm run build && npx serve -s build -l 3000
```

## Tests
```bash
cd backend && npm test      # 14 API tests (uses database harvest_test)
cd frontend && npm test     # React component tests
```

## API summary
| Method | Route | Access |
|---|---|---|
| POST | /api/auth/register | public |
| POST | /api/auth/login | public – returns JWT |
| GET/PUT/DELETE | /api/auth/me | logged in |
| GET | /api/products?search= | public |
| GET | /api/products/mine | member |
| POST/PUT/DELETE | /api/products/:id | member (owner) |
| POST | /api/transactions/acquire/:productId | beneficiary |
| GET | /api/transactions/mine | logged in |
| POST | /api/transactions/accept/:id | member (owner) – body `{ code }` |
| POST | /api/transactions/cancel/:id | beneficiary |

Socket.IO events: `stock_update`, `new_claim`, `token_accepted`.
