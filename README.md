# HR Manager & Salary Analytics System

Full-stack exam project: Express.js backend (in-memory data) + React Native (Expo) frontend.

```
Std0202459IPFinal2026/
├── backend/   Express API, port 3000
└── frontend/  Expo app (Login + Dashboard)
```

## Run the backend

```bash
cd backend
npm install
npm start
```

Server listens on `0.0.0.0:3000`. Login: `admin` / `password123`.

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

For a physical phone, the phone and PC must be on the same Wi-Fi. Find the PC IP with `ipconfig` (Windows) or `ipconfig getifaddr en0` (macOS), and allow port 3000 through the firewall.

## API summary

All `/api/employees*` routes need `Authorization: Bearer mock-jwt-token`.

| Method | Route                          | Notes                                              |
|--------|--------------------------------|----------------------------------------------------|
| POST   | `/api/login`                   | 200 token, 401 on bad credentials, 400 if missing  |
| GET    | `/api/employees`               | list                                               |
| POST   | `/api/employees`               | `{name, position, salary}` → 201, 400 on invalid   |
| PUT    | `/api/employees/:id/status`    | toggle Active / On Leave, 404 if unknown           |
| DELETE | `/api/employees/:id`           | 404 if unknown                                     |
| GET    | `/api/employees/salary-clusters` | custom 1D K-Means (k=3) in `backend/kmeans.js`   |
