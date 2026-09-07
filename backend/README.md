# Quarry API

Express + Sequelize API for Block Marking, Block Load, Customers, and Transactions.

## Database

Uses local Docker Postgres. A database named `quarry` was created on the existing `pgatt` container:

- Host: `localhost`
- Port: `5433`
- User / password: `postgres` / `postgres`
- Database: `quarry`

Connection string (see `.env`):

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/quarry
```

Optional dedicated container (port **5434**):

```bash
docker compose up -d
# then set DATABASE_URL port to 5434
```

## Setup

```bash
cd backend
npm install
npm run db:seed
npm run dev
```

Tables are created with `sequelize.sync()` on seed and on API startup.

API: http://localhost:4000  
Health: http://localhost:4000/health

## Endpoints

| Resource | Paths |
|---|---|
| Dashboard | `GET /api/dashboard?quarryId=&month=` |
| Quarries | `GET/POST /api/quarries` |
| Customers | `GET/POST/PUT/DELETE /api/customers` |
| Markings | `GET/POST/PUT/DELETE /api/markings` |
| Loads | `GET/POST/PUT/DELETE /api/loads` |
| Transactions | `GET/POST/PUT/DELETE /api/transactions` |

Filter examples:

- `GET /api/dashboard?quarryId=q_chitha`
- `GET /api/dashboard?quarryId=q_chitha&month=2026-08`
- `GET /api/customers?quarryId=q_chitha&type=Customer`
- `GET /api/markings?quarryId=q_chitha` (batches)
- `GET /api/markings?as=blocks&quarryId=q_chitha`
- `GET /api/loads?quarryId=q_chitha`
- `GET /api/transactions?quarryId=q_chitha&partyId=...`
