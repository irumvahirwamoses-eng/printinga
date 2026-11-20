# SchoolPrint

Cloud-hosted school printing management system (MERN / TypeScript) for teachers and a printing officer. Browser-only access — no client installs.

The officer gets a genuine one-click print flow: from the queue, request details, or the print screen, **Print now** loads the document into the browser's print dialog with the request's paper size and orientation already applied, then records the job and advances the request automatically. Teachers upload PDF/DOCX files, track status, and chat with the officer in real time.

## Stack
- **Client:** React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Socket.IO client, Lucide icons
- **Server:** Node.js, Express, TypeScript, Mongoose, Socket.IO, JWT (HTTP-only cookies with refresh rotation), bcrypt, Multer, Cloudinary, Mammoth + sanitize-html (DOCX→HTML), exceljs/csv-parse, Nodemailer
- **Database:** MongoDB Atlas (M0 free tier works)
- **Storage:** Cloudinary raw uploads (Render's filesystem is ephemeral)
- **Hosting:** One free Render web service serves the API, Socket.IO and the built React client from the same origin

## Project structure
```
printinga/
  client/         # Vite React app (blue/white design system)
  server/         # Express API + Socket.IO + static client hosting
  render.yaml     # Render Blueprint (single free web service)
  .env.example    # Full environment reference
  plans/          # Architecture plan
```

## Design and user experience
- Blue/white visual system with reusable cards, buttons, badges, stats, empty states, toasts and a consistent top navigation/sidebar.
- Professional Lucide icons on every action, status and navigation item.
- Officers see **Print now** directly in the request queue, recent requests, request details, and a dedicated print screen — no multi-step workflow.
- Teachers get a guided upload form, clear status badges, and click-through messaging.
- Both roles have a **Chat** button on every request (queue, dashboard, messages, print screen) that opens a real-time conversation with the other participant.
- Users can edit their own full name, email, phone and department from **Profile**; privileged fields such as role and national ID remain read-only.

## How printing works
1. A teacher uploads a PDF or DOCX and submits print settings (copies, colour, paper, sides, orientation, page range, priority).
2. An officer clicks **Print now** anywhere the request appears.
3. Before the dialog opens, a **print-ready file** is prepared with the request settings already applied:
   - **PDF** pages are rendered with `pdf.js` and rebuilt with `pdf-lib`: only the selected page range, one copy per requested copy, grayscale for black & white jobs, and the requested paper size/orientation. The prepared PDF is printed from a same-origin blob iframe.
   - **DOCX** is converted on the server with Mammoth, sanitized, then rendered with the requested copies, grayscale (when needed) and `@page` paper size/orientation.
4. The browser opens the prepared file in the native print dialog. Because copies, pages and colour are already in the file, the officer only keeps **Copies = 1** and **Pages = All**, picks the printer, and presses Print.
5. When the print dialog closes, the app posts a `PrintJob`, moves the request to `PRINTED`, and notifies the teacher. A **Report a problem** action records a failed job instead.

> **Browser limitation:** no web app can print completely silently or set the native dialog's copy count, colour mode or duplex — the officer must confirm once (choose the printer and, if requested, double-sided). Those settings are embedded in the prepared document wherever the browser allows, so they do not have to be entered or recalculated. If preparation fails (encrypted/very large PDF), the original document is printed with an on-screen warning instead.

## Local setup
1. Install dependencies (Node.js 20+):
   ```bash
   npm install
   ```
2. Copy `.env.example` to `server/.env` and fill at least `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`. Leave `client/.env` variables unset so the Vite proxy is used.
3. Start both apps:
   ```bash
   npm run dev
   ```
   - Client: http://localhost:5173 (proxies `/api` and `/socket.io` to the server)
   - Server: http://localhost:5000 (health: `/health`)

### Default officer seed
If no officer exists, the server seeds one:
- National ID: `0000000000000001` (override with `SEED_OFFICER_NATIONAL_ID`)
- Password: `Admin@12345` (override with `SEED_OFFICER_PASSWORD`)

In production, seeding happens only when both seed variables are set, so a known default password can never be deployed. The officer must change the password on first login.

## Deploy to Render + MongoDB Atlas (free)

### 1. MongoDB Atlas (M0)
1. Create a free Atlas account and an **M0 Shared** cluster.
2. **Database Access** → add a database user with a strong password and read/write access to `schoolprint`.
3. **Network Access** → allow `0.0.0.0/0` (Render uses dynamic outbound IPs). For a tighter setup, use Atlas Peering/PrivateLink on a paid plan.
4. **Connect** → choose "Connect your application", copy the `mongodb+srv://…` URI, and replace `<password>` with the database user's password. Add `?retryWrites=true&w=majority` if not present.

### 2. Cloudinary (free)
1. Create a Cloudinary account and copy the **Cloud Name**, **API Key** and **API Secret** from the dashboard.
2. Documents are stored as raw uploads; `GET /api/documents/:id/file` streams them from your own Render origin so browser printing works. Without Cloudinary, uploads fall back to base64 data URLs in MongoDB — fine locally, but not suitable for production.

### 3. Render (one web service)
**Option A — Blueprint (recommended):** push this repo to GitHub/GitLab, then in Render choose **New → Blueprint** and select `render.yaml`. Fill the prompted values (`MONGODB_URI`, `CLOUDINARY_*`, `SEED_OFFICER_*`, and optionally SMTP). Render builds and starts the service automatically.

**Option B — Dashboard:** create a **Web Service** from the repo with:
| Setting | Value |
| --- | --- |
| Runtime | Node |
| Plan | Free |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health check path | `/health` |

Set these environment variables in Render:
| Variable | Value / notes |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas URI from step 1 |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Long random strings (Blueprint generates these) |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | `15m`, `7d` |
| `CLIENT_URL` | Optional — auto-derived from Render's hostname. Set only for a custom domain or separate frontend |
| `COOKIE_SAME_SITE` | `lax` (default; correct for one shared origin) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Values from step 2 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional; needed for emailed password-reset links |
| `SEED_OFFICER_NATIONAL_ID`, `SEED_OFFICER_PASSWORD` | 16-digit ID and strong temporary password for the first officer |

`PORT` is injected by Render — do not set it. `VITE_API_URL` / `VITE_SOCKET_URL` must stay unset: the built client calls `/api` and `/socket.io` on the same origin.

After the first deploy, visit `https://<your-service>.onrender.com/health` — it should return `{"status":"ok","service":"schoolprint"}`. Sign in with the seeded officer credentials and change the password when prompted.

Notes:
- Free Render services sleep after inactivity; the first request after a pause may take ~30–60 seconds.
- Render's disk is ephemeral — all uploaded documents must go to Cloudinary.
- Cookies are `HttpOnly`, `Secure` in production, and `SameSite=Lax` by default. Use `COOKIE_SAME_SITE=none` only if you host the frontend on a different site (requires HTTPS).

## Testing
```bash
npm test          # Vitest suite (server utilities, validation, import parsing)
npm run build     # Type-check and build both workspaces
npm audit         # Dependency audit (currently 0 vulnerabilities)
```

## Security notes
- Role-based authorization is enforced server-side on every sensitive endpoint and on Socket.IO room joins, messages, typing and read receipts. Chat messages are persisted once through REST and broadcast (no duplicates).
- Helmet, CORS (`CLIENT_URL`), rate limiting (login, password reset, refresh, general API), express-mongo-sanitize, Zod v4 validation, PATCH whitelisting, and regex escaping on search inputs.
- Uploads are limited by size/type and checked against PDF/DOCX magic bytes; filenames are sanitized. DOCX print HTML is sanitized with sanitize-html. Exported CSV/XLSX cells are escaped against formula injection.
- Password reset tokens are never returned by the API; they are emailed over SMTP or logged to the server console in development.
- Document access is authorized for the owning teacher or an officer; teacher responses mask national IDs.
- Never commit `.env` or secrets.

## Known limitations / future work
- Browsers cannot print silently or report physical printer status; the officer confirms in the native print dialog.
- Complex DOCX layouts may shift slightly because Mammoth converts them to HTML. The original file is always downloadable.
- Free-tier services sleep and have limited resources; upgrade the Render plan for always-on availability.
- Broader integration/authorization tests and CI can be added before large-scale use.
