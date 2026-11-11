# BaixKZ Admin

Separate React + Vite administration site. All privileged data changes go through BaixKZ Backend; Firebase is used only for Google sign-in and obtaining an ID token.

## Local start

1. Copy `.env.example` to `.env` and fill the Firebase web app values from Firebase Console.
2. Set `VITE_API_BASE_URL=http://localhost:4000/api/v1` for local development.
3. Run `npm install` and `npm run dev`.
4. Open the URL printed by Vite (normally http://localhost:5173; if Platform uses that port, run `npm run dev -- --port 5174`).

Only the Firebase UID configured as `SUPER_ADMIN_UID` in Backend receives permanent Super Admin privileges. A successful Google login alone does not grant admin access.
