# LumaCart

LumaCart is a responsive e-commerce application using semantic HTML, CSS, vanilla JavaScript, Express, MongoDB, Mongoose, bcrypt, and JWT.

## Requirements

- Node.js 18 or later
- A running MongoDB instance

## Run locally

1. Run `npm install` from the project root.
2. Copy `.env.example` to `.env`; set a private `JWT_SECRET` of at least 32 characters.
3. Start MongoDB.
4. In one terminal, run `npm run seed` to replace the product collection with 36 sample products.
5. In separate terminals, run `npm run dev` and `npm run serve:frontend`.
6. Open `http://localhost:5500`.

The API defaults to `http://localhost:5000/api`. The static frontend listens on port `5500` by default; set `FRONTEND_PORT` to change it, and set `FRONTEND_ORIGIN` to the matching origin for API CORS. Configure `window.LUMACART_API_URL` in the browser before `app.js` if the API is hosted elsewhere.

Cart demonstration estimates are configurable before loading `app.js` with `window.LUMACART_CART_CONFIG = { freeShippingThreshold: 100, shippingFee: 8.95, taxRate: 0.08 }`. These client-side amounts are display estimates only; a future checkout must recalculate price, stock, shipping, and tax on the server.

## Checkout and orders

- `POST /api/orders` creates an authenticated demo order. The server accepts product IDs and quantities, reloads prices/names/images, validates stock, calculates totals, then atomically reduces stock and creates the order in a MongoDB transaction.
- `GET /api/orders` lists only the authenticated user's orders.
- `GET /api/orders/:id` returns an order only to its owner; non-owned and missing IDs both return `404`.
- Checkout supports `cod_demo` and `test_demo`; neither processes or collects real payment.
- Server estimates can be changed with `ORDER_FREE_SHIPPING_THRESHOLD`, `ORDER_SHIPPING_FEE`, and `ORDER_TAX_RATE`. MongoDB transactions require a replica set; MongoDB Atlas supports this.

## Available scripts

- `npm run dev` starts the Express API with Nodemon.
- `npm start` starts the API without Nodemon.
- `npm run serve:frontend` serves the static frontend.
- `npm run seed` clears and repopulates the product collection.
- `npm run check` checks JavaScript syntax across the app.

## Phase 1–3 scope

Product browsing, search, filters, sorting, product details, browser-persisted bag and wishlist, registration, login, logout, and protected profile editing are implemented. Checkout, password recovery, orders, addresses, written reviews, and newsletter subscriptions are not part of these phases. Product create/update/delete endpoints require a user with the `admin` role; public registration intentionally creates customer accounts only.