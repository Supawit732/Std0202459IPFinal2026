# HR Manager & Salary Analytics System

Full-stack exam project: Express.js backend (MySQL) + React Native (Expo) frontend.

```
Std0202459IPFinal2026/
├── backend/   Express API + MySQL (port from .env; 3000 locally, 3044 on the class server)
└── frontend/  Expo app (Login + Dashboard)
```

## Run the backend locally

Employee data lives in MySQL. All columns are prefixed `LeeSup_` (table `LeeSup_employees`); the API still returns plain `id / name / position / status / salary` fields.

```bash
cd backend
npm install
cp .env.example .env     # then fill in DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (and PORT)
npm run db:init          # creates LeeSup_employees and seeds 12 employees (safe to re-run)
npm start
```

The server listens on `0.0.0.0:$PORT` (default 3000). Login: `admin` / `password123`.
If the database is unreachable the server still starts; employee routes then return a JSON `500`.

Other scripts: `npm test` (K-Means unit tests), `npm run db:reset` (drops `LeeSup_employees` and re-seeds, **destroys data**).

## Deploy to the class server

1. Upload the `backend/` folder by SFTP to `/app` on the class server (skip `node_modules` and `.env`).
2. On the server, create `/app/.env` with the class database credentials and the class port:
   ```
   PORT=3044
   DB_HOST=<class-db-host>
   DB_PORT=3306
   DB_USER=<your-db-user>
   DB_PASSWORD=<your-db-password>
   DB_NAME=<your-db-name>
   ```
   (`.env` is git-ignored; never commit credentials.)
3. Install, create the table and seed data, then start with pm2:
   ```bash
   cd /app
   npm install
   npm run db:init
   pm2 start server.js --name hr-api
   pm2 save
   ```
4. Check it: `curl http://<class-server-host>:3044/api/employees -H "Authorization: Bearer mock-jwt-token"`.

Useful pm2 commands: `pm2 logs hr-api`, `pm2 restart hr-api`, `pm2 status`.

## Run the frontend

```bash
cd frontend
npm install
npx expo start
```

Press `w` for web, `a` for Android emulator, `i` for iOS simulator, or scan the QR code with Expo Go.

### Set API_BASE_URL (`frontend/config.js`)

| Where the app runs  | Value                          |
|---------------------|--------------------------------|
| Android emulator    | `http://10.0.2.2:3000`         |
| iOS simulator / web | `http://localhost:3000`        |
| Physical phone      | `http://<PC-LAN-IP>:3000`      |
| Class server        | `http://<class-server-host>:3044` |

To use the deployed API, set `API_BASE_URL` in `frontend/config.js` to `http://<class-server-host>:3044` and restart Expo.

For a physical phone with a local backend, the phone and PC must be on the same Wi-Fi. Find the PC IP with `ipconfig` (Windows) or `ipconfig getifaddr en0` (macOS), and allow port 3000 through the firewall.

## API summary

All `/api/employees*` routes need `Authorization: Bearer mock-jwt-token`.

| Method | Route                          | Notes                                              |
|--------|--------------------------------|----------------------------------------------------|
| POST   | `/api/login`                   | 200 token, 401 on bad credentials, 400 if missing  |
| GET    | `/api/employees`               | list                                               |
| POST   | `/api/employees`               | `{name, position, salary}` → 201, 400 on invalid   |
| PUT    | `/api/employees/:id`           | edit `{name, position, salary}`; same validation as POST, 404 if unknown |
| PUT    | `/api/employees/:id/status`    | toggle Active / On Leave, 404 if unknown           |
| DELETE | `/api/employees/:id`           | 404 if unknown                                     |
| GET    | `/api/employees/salary-clusters` | custom 1D K-Means (k=3) in `backend/kmeans.js`; returns `iterations` and per-tier `members` (names) |

## App features

- Login, then a Dashboard with a summary (total, Active / On Leave, monthly payroll).
- Add, edit (Edit → Save/Cancel), toggle status and delete (with confirmation) employees.
- Search by name/position, filter by status (All / Active / On Leave), sort by salary ascending/descending.
- "Analyze Salary Structure": tier cards (tap a card to list its members) and a bar comparing tier averages.
