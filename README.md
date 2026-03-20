# shop-pos-backend

Production-ready Node.js + Express + MongoDB backend for the Shop POS system.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Make sure MongoDB is running locally, OR set `MONGODB_URI` in `.env` to your MongoDB Atlas connection string.

3. Copy `.env.example` to `.env` and update the values:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/shop-pos
   JWT_SECRET=your_secret_key_here
   FRONTEND_URL=http://localhost:5173
   ```

4. Run the server:
   ```bash
   npm run dev    # Development (auto-restart)
   npm start      # Production
   ```

## Initial Super Admin Setup

On first run, call the setup endpoint to create the first Super Admin:

```bash
curl -X POST http://localhost:5000/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"name":"Super Admin","username":"superadmin","password":"Admin@1234"}'
```

This endpoint only works **once** (when the database has zero users).

## API Endpoints

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | /api/auth/login | Public | Login |
| POST | /api/auth/setup | Public (once) | Create first Super Admin |
| GET | /api/users | Admin+ | Get all users |
| POST | /api/users | Admin+ | Create user |
| PUT | /api/users/:id | Admin+ | Update user |
| GET | /api/products | All | Get active products |
| GET | /api/products/all | Admin+ | Get all products |
| POST | /api/products | Admin+ | Create product |
| PUT | /api/products/:id | Admin+ | Update product |
| POST | /api/inventory/restock | All | Restock a product |
| GET | /api/inventory/history/:id | All | Get stock history |
| POST | /api/transactions | All | Create transaction |
| GET | /api/transactions | All | Get transactions |
| GET | /api/dashboard | Admin+ | Dashboard stats |
