# Xaccess API (NestJS)

## Run

```bash
npm install
cp .env.example .env   # optional
npm run start:dev
```

Base URL: `http://localhost:3000/api/v1`

## Response format

All JSON responses follow:

```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

Errors use `success: false`, a descriptive `message`, `data: null`, and an appropriate HTTP status (400, 401, 403, 404, 500).

## Modules (microservice-aligned domains)

| Domain | Path prefix | Notes |
|--------|--------------|--------|
| Auth | `/auth` | Register, login, JWT, `/me`, **`POST /auth/change-password`**, **`POST /auth/join-community`** (resident links account to an estate by `slug` or `communityId`) |
| Users | `/users` | **`PATCH /users/me`** (profile), **`GET /users/community/directory`**, **`GET /users/community/context`**, `GET /users/profile`, community admin resident management |
| Communities | `/communities` | Super admin CRUD; community dashboard |
| Public | `/public/communities` | **No JWT** — active communities (`id`, `name`, `slug`) for mobile/web registration |
| Public | `/public/emergency-contacts` | **No JWT** — ICE list (`?communityId=` optional) |
| Messages | `/messages` | Resident: **`GET /messages/inbox`**, **`GET /messages/sent`**, **`GET /messages/:id`**, **`POST /messages`** (requires community) |
| Billing | `/billing` | Resident: **`GET /billing/summary`**, **`GET /billing/invoices`**, **`GET /billing/invoices/:id`** |
| Utilities | `/utilities` | Resident: **`GET /utilities/usage`** (monthly power/water series) |
| Incidents | `/incidents` | Resident: **`POST /incidents`**, **`GET /incidents/me`** |
| Access | `/access/tokens`, `/access/logs` | Token lifecycle, logs |
| Hardware | `/hardware/devices`, `/hardware/validate` | Device registration; **real-time validation** (no JWT; uses `deviceApiKey`) |
| Admin | `/admin` | Platform analytics; **community admin** CRUD at `/admin/community-admins` (super admin) |

## Database

- Default: SQLite file `data/xaccess.sqlite` (created automatically; directory `data/` is created on startup).
- `synchronize: true` for development — **disable in production** and use migrations.

## Seeded users (first boot only)

| Role | Email | Password |
|------|--------|----------|
| Super Admin | superadmin@xaccess.local | SuperAdmin123! |
| Community Admin | estate.admin@xaccess.local | EstateAdmin123! |
| Resident | resident@xaccess.local | Resident123! |

Community: **Harmony Estate** (slug `harmony-estate`). On first seed, the resident also gets sample **billing**, **utility usage**, and **emergency contacts** rows.

## Postman

Import `../postman/Xaccess-API.postman_collection.json` from the repo root.

## Troubleshooting: `Cannot GET` / `Cannot POST` /api/v1/…

That text is Express’s **404** (no route registered). Common causes:

1. **API not restarted** after `git pull` — stop the process, then:
   ```bash
   npm run build && npm run start:dev
   ```
2. **Wrong process on port 3000** — another app may be bound there. Check: `lsof -i :3000` (macOS/Linux). You should see Nest log lines like `Mapped {/api/admin/community-admins, GET}` on startup.
3. **Quick check** (no auth): `GET /api/v1/admin/analytics/summary` should return **401** if the route exists; **404** means the running server is not this codebase’s latest build.
4. **Force a fresh compile** before watch mode: `npm run start:dev:build` (runs `npm run build` then `nest start --watch`). On startup you should see **`CommunityAdminsController {/api/admin/community-admins}`** and **`Mapped {/api/admin/community-admins, POST}`**.

## Production notes

- Set strong `JWT_SECRET` and `JWT_EXPIRES_IN`.
- Use PostgreSQL/MySQL with TypeORM migrations instead of SQLite + `synchronize`.
- Split into separate deployable services if needed (same route design, separate processes).
