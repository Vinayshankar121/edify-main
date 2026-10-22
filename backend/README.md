# Edify Backend

Node.js and MySQL REST API for the Edify school administration frontend. The frontend uses this API for authentication and application data; set `VITE_API_URL` in the frontend environment to the API base URL.

## Requirements

- Node.js 20 or newer
- MySQL 8 or MariaDB 10.6 or newer

## Local setup

1. Create an empty MySQL database named `edify` (or choose another name in `DATABASE_URL`).
2. Create a local `.env` file (do not commit it) and set a private `JWT_SECRET` with at least 32 characters, plus either `DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.
3. Install dependencies with `npm install`.
4. Apply the schema with `npm run migrate`.
5. Create an admin account by setting `ADMIN_NAME`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` in the environment, then run `npm run create-admin`. The password must be at least 12 characters and is stored as a bcrypt hash.
6. Start the development server with `npm run dev`.

The API listens on `http://localhost:4000` by default. `GET /api/health` checks database connectivity. `npm start` runs without file watching, and `npm run check` performs JavaScript syntax checks.

## End-to-end checks

With the schema migrated and the API running, set `TEST_ADMIN_USERNAME` and `TEST_ADMIN_PASSWORD` to an existing test admin account, then run `npm run test:e2e`. The script creates unique test records, verifies admission, fee assignment, payments, receipts, balances, and reporting, and removes its records afterward. Use a local or dedicated test database.

## API conventions

- JSON requests and responses use the frontend's camelCase fields and display values where practical.
- Protected endpoints require `Authorization: Bearer <token>`. Sign in with `POST /api/auth/login`; `GET /api/auth/me` returns the current principal.
- Admin-only writes return `403` for cashier accounts. Cashiers can read school data and record payments.
- Collection endpoints return arrays directly. Create operations return the created object with `201`; deletes return `204`.
- Academic-year and class names remain the frontend-facing relation values; the database resolves years to foreign keys. Payment and admission writes are transactional. Receipt sequence allocation is serialized by year.

## Endpoints

| Resource | Routes | Access |
| --- | --- | --- |
| Authentication | `POST /api/auth/login`, `GET /api/auth/me` | Public login / authenticated |
| Academic years | `GET, POST /api/academic-years`, `PATCH /api/academic-years/:id`, `GET /api/active-year` | Reads authenticated / writes admin |
| Classes | `GET, POST /api/classes`, `PATCH, DELETE /api/classes/:id` | Reads authenticated / writes admin |
| Fee structures | `GET, POST /api/fee-structures`, `PATCH, DELETE /api/fee-structures/:id` | Reads authenticated / writes admin |
| Fee terms | `GET, POST /api/fee-terms`, `PUT /api/fee-terms?structureId=:id`, `PATCH, DELETE /api/fee-terms/:id` | Reads authenticated / writes admin |
| Students | `GET /api/students`, `GET /api/students/:id`, `POST /api/students`, `PATCH, DELETE /api/students/:id` | Reads authenticated / writes admin |
| Student promotion | `POST /api/promotions` | Admin |
| Payments/receipts | `GET, POST /api/payments`, `GET /api/payments/:id` | Authenticated |
| Cashiers | `GET, POST /api/cashiers`, `PATCH, DELETE /api/cashiers/:id` | Admin |
| Settings | `GET, PATCH /api/settings` | Reads authenticated / writes admin |
| Reports | `GET /api/dashboard`, `GET /api/reports/fee-summary`, `GET /api/reports/collections` | Authenticated |

List resources support `academicYear` where applicable. Student search accepts `q` and `className`; fee structures accept `academicYear`; fee terms accept `structureId`; payments accept `academicYear`, `studentId`, `from`, `to`, `cashier`, `mode`, `className`, and `section`.

## Data notes

- Payment rows are append-only through the API; there is no edit or delete payment endpoint.
- Student fee summaries follow the selected academic year; student detail fee balances follow the frontend's student-wide payment convention.
- Student class placement and cashier name on a receipt are snapshots/values as in the frontend model. Fee structures and terms use normalized child tables.
- Students can have multiple fee structures assigned in the same class and academic year. Create a normal structure and a separate transport structure, then select both for students who use transport; assign only the normal structure to others. Balances, receipts, and reports include all assigned structures. Existing enrollments are migrated from their current single structure.
- Fee collection accepts optional `feeHeads` entries (`structureId` and fee-head `position`) with a payment. When supplied, the payment is allocated only to those selected outstanding fee heads; old payment requests without `feeHeads` keep the existing general-balance behavior.
- `POST /api/students` accepts the student payload and optional `initialPayment` in one transaction, preventing orphaned admission payments.
- `POST /api/promotions` accepts `sourceAcademicYear`, `targetAcademicYear`, and a `students` array containing each source `enrollmentId`, target `className`, `section`, `structureIds` (or legacy `structureId`), and `discount`. It creates target-year enrollment rows transactionally; prior enrollments and payments are not moved or overwritten.
- Students are stored as shared identity records with separate `student_enrollments` per academic year. Payments are linked to the specific enrollment, so fee history and reports remain year-specific.
- Production deployment should use a managed secret for `JWT_SECRET`, configure exact trusted frontend origins, and add backups and operational monitoring. PostgreSQL TLS certificate verification is enabled in production; set `DATABASE_SSL_CA` when the provider requires a custom CA certificate.
