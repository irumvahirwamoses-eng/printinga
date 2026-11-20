# SchoolPrint — Architecture & Implementation Plan

**Project root:** `C:\Users\Dell\OneDrive\Desktop\printinga`
**Type:** Full-stack monorepo (React + Vite frontend, Node/Express backend, MongoDB Atlas)
**Access:** Single production web address; browser-only; no client installs

---

## 1. Architecture Overview

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui | Router: React Router; data: TanStack Query; forms: React Hook Form + Zod |
| Backend | Node.js + Express + TypeScript | REST API + Socket.IO on same server process |
| Database | MongoDB Atlas + Mongoose ODM | Connection pooling, unique indexes, timestamps |
| File Storage | Cloudinary (or S3-compatible) | Metadata + secure references in MongoDB; no binaries in DB |
| Real-time | Socket.IO (hosted on backend) | Authenticated connections, per-request rooms |
| Auth | JWT (access + refresh rotation), HTTP-only cookies, bcrypt | Rate limiting, lockout, national-ID masking |
| Security | Helmet, CORS, express-rate-limit, mongo-sanitize, xss | Centralized error middleware |

**Key constraint honoured:** Printing is browser-based (`window.print()`). The server never touches a physical printer. Printing officer manually confirms physical printing; a `PrintJob` record is created with outcome. Architecture keeps a clean `printer` abstraction for future local-print-service integration.

---

## 2. Project Structure

```
printinga/
├── package.json              # root workspace scripts
├── tsconfig.json             # root TS config
├── .env.example
├── .gitignore
├── README.md
├── clients/
│   └── schoolprint/
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── postcss.config.js
│       ├── tsconfig.json
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── routes/
│       │   │   ├── PrivateRoute.tsx
│       │   │   ├── TeacherRoute.tsx
│       │   │   └── OfficerRoute.tsx
│       │   ├── pages/
│       │   │   ├── Login.tsx
│       │   │   ├── ForgotPassword.tsx
│       │   │   ├── ResetPassword.tsx
│       │   │   ├── TeacherDashboard.tsx
│       │   │   ├── OfficerDashboard.tsx
│       │   │   ├── SubmitRequest.tsx
│       │   │   ├── RequestDetails.tsx
│       │   │   ├── PrintView.tsx
│       │   │   ├── TeacherManagement.tsx
│       │   │   ├── BulkImport.tsx
│       │   │   ├── Chat.tsx
│       │   │   ├── Notifications.tsx
│       │   │   ├── Profile.tsx
│       │   │   ├── PrintHistory.tsx
│       │   │   └── Reports.tsx
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   ├── Sidebar.tsx
│       │   │   │   ├── TopNav.tsx
│       │   │   │   └── Layout.tsx
│       │   │   ├── ui/            # shadcn/ui primitives
│       │   │   ├── forms/         # reusable form fields
│       │   │   ├── charts/
│       │   │   ├── DocumentPreview.tsx
│       │   │   ├── StatusBadge.tsx
│       │   │   ├── NotificationBell.tsx
│       │   │   └── ToastProvider.tsx
│       │   ├── hooks/
│       │   │   ├── useAuth.ts
│       │   │   ├── useSocket.ts
│       │   │   └── useApi.ts
│       │   ├── lib/
│       │   │   ├── api.ts         # axios/fetch client + interceptors
│       │   │   ├── socket.ts
│       │   │   ├── utils.ts
│       │   │   └── validation.ts  # zod schemas
│       │   ├── types/
│       │   │   └── index.ts       # shared TS interfaces
│       │   └── styles/
│       │           └── globals.css
│       └── components.json      # shadcn config
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts             # app entry (http + socket.io)
│   │   ├── app.ts               # express setup + middleware
│   │   ├── config/
│   │   │   ├── index.ts         # env validation
│   │   │   ├── db.ts            # mongoose connection
│   │   │   ├── cloudinary.ts
│   │   │   └── socket.ts        # socket.io server + auth middleware
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── teacherController.ts
│   │   │   ├── requestController.ts
│   │   │   ├── documentController.ts
│   │   │   ├── printJobController.ts
│   │   │   ├── messageController.ts
│   │   │   ├── notificationController.ts
│   │   │   ├── reportController.ts
│   │   │   └── activityLogController.ts
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   ├── teacherRoutes.ts
│   │   │   ├── requestRoutes.ts
│   │   │   ├── documentRoutes.ts
│   │   │   ├── printJobRoutes.ts
│   │   │   ├── messageRoutes.ts
│   │   │   ├── notificationRoutes.ts
│   │   │   ├── reportRoutes.ts
│   │   │   └── activityLogRoutes.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT verify + role guard
│   │   │   ├── validate.ts      # zod request validation
│   │   │   ├── upload.ts        # multer + cloudinary
│   │   │   ├── rateLimit.ts     # login & general limits
│   │   │   ├── errorHandler.ts  # centralized error middleware
│   │   │   └── mongoSanitize.ts
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── PrintRequest.ts
│   │   │   ├── Document.ts
│   │   │   ├── Message.ts
│   │   │   ├── Notification.ts
│   │   │   ├── PrintJob.ts
│   │   │   ├── Printer.ts
│   │   │   └── ActivityLog.ts
│   │   ├── services/
│   │   │   ├── authService.ts
│   │   │   ├── teacherService.ts
│   │   │   ├── requestService.ts
│   │   │   ├── documentService.ts
│   │   │   ├── printService.ts
│   │   │   ├── messageService.ts
│   │   │   ├── notificationService.ts
│   │   │   ├── reportService.ts
│   │   │   └── emailService.ts
│   │   ├── sockets/
│   │   │   ├── chatHandler.ts
│   │   │   └── notificationHandler.ts
│   │   ├── utils/
│       │   ├── maskNationalId.ts
│       │   ├── generateTempPassword.ts
│       │   ├── apiResponse.ts
│       │   └── asyncHandler.ts
│   │   └── types/
│   │       └── index.ts
│   ├── tests/
│   │   ├── auth.test.ts
│   │   ├── teacher.test.ts
│   │   ├── request.test.ts
│   │   ├── document.test.ts
│   │   ├── printJob.test.ts
│   │   └── socket.test.ts
│   └── __mocks__/
└── plans/
    └── schoolprint-architecture.md
```

---

## 3. Database Schema (Mongoose)

### User
- `nationalId`: String, required, unique (index), 16 digits, masked in UI
- `password`: String, required, hashed
- `fullName`: String, required
- `email`: String, optional, lowercase
- `phone`: String, optional
- `department`: String, optional
- `role`: enum ['TEACHER', 'OFFICER'], index
- `isActive`: Boolean, default true
- `isFirstLogin`: Boolean, default true (temp password change required)
- `failedLoginAttempts`: Number, default 0
- `lockUntil`: Date, optional
- `passwordResetToken`: String, optional
- `passwordResetExpires`: Date, optional
- `refreshTokens`: [String] (rotation store)
- `lastLoginAt`: Date, optional
- timestamps

### PrintRequest
- `requestNumber`: String, unique (e.g. PR-YYYY-#####)
- `teacherId`: ObjectId -> User, index
- `documentId`: ObjectId -> Document
- `title`: String
- `numberOfPages`: Number
- `numberOfCopies`: Number
- `printingType`: enum ['BLACK_AND_WHITE', 'COLOUR']
- `paperSize`: enum ['A4', 'A3', 'OTHER']
- `sides`: enum ['SINGLE', 'DOUBLE']
- `pageSelection`: enum ['ALL', 'CUSTOM']
- `pageRange`: String, optional
- `orientation`: enum ['PORTRAIT', 'LANDSCAPE']
- `priority`: enum ['NORMAL', 'URGENT'], index
- `description`: String
- `requestedCompletionDate`: Date, optional
- `status`: enum [PENDING, ACCEPTED, PROCESSING, PRINTING, PRINTED, READY_FOR_COLLECTION, COLLECTED, REJECTED, CANCELLED, FAILED], index, default PENDING
- `rejectionReason`: String, optional
- `statusHistory`: [{ previous, new, userId, userRole, changedAt, comment }]
- `collectionConfirmedBy`: ObjectId -> User, optional
- `collectionConfirmedAt`: Date, optional
- timestamps
- indexes: teacherId+createdAt, status+createdAt

### Document
- `requestId`: ObjectId -> PrintRequest
- `teacherId`: ObjectId -> User
- `originalName`: String
- `mimeType`: String ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
- `size`: Number (bytes)
- `storageUrl`: String (Cloudinary/S3 secure URL or signed URL reference)
- `storagePublicId`: String (for deletion)
- `fileType`: enum ['PDF', 'DOCX']
- timestamps

### Message
- `requestId`: ObjectId -> PrintRequest, index
- `senderId`: ObjectId -> User
- `senderRole`: enum ['TEACHER', 'OFFICER']
- `content`: String
- `readBy`: [{ userId, readAt }]
- timestamps
- index: requestId+createdAt

### Notification
- `userId`: ObjectId -> User, index
- `type`: enum (request events, chat, collection, etc.)
- `title`: String
- `message`: String
- `isRead`: Boolean, default false, index
- `relatedRequestId`: ObjectId -> PrintRequest, optional
- `relatedPrintJobId`: ObjectId -> PrintJob, optional
- `readAt`: Date, optional
- linkUrl: String, optional (deep link to request)
- timestamps
- index: userId+isRead

### PrintJob
- `requestId`: ObjectId -> PrintRequest, index
- `officerId`: ObjectId -> User
- `printerName`: String, optional
- `requestedSettings`: Object (copies, paperSize, sides, orientation, colour, pageRange)
- `numberOfCopiesPrinted`: Number
- `outcome`: enum ['SUCCESS', 'FAILED', 'REPRINT']
- `failureReason`: String, optional
- `printedAt`: Date, index
- timestamps
- index: requestId+createdAt

### Printer
- `name`: String, unique
- `model`: String
- `location`: String
- `isActive`: Boolean, default true
- `supportedSizes`: [String]
- `supportsColour`: Boolean
- `supportsDuplex`: Boolean
- timestamps

### ActivityLog
- `userId`: ObjectId -> User
- `userRole`: String
- `action`: String
- `entityType`: String
- `entityId`: ObjectId
- `details`: Object (mixed)
- `ipAddress`: String, optional
- `timestamp`: Date, index
- timestamps

---

## 4. API Endpoints (REST)

Auth:
- `POST /api/auth/login` — rate limited, lockout tracking
- `POST /api/auth/logout` — clear cookies, revoke refresh token
- `POST /api/auth/refresh` — rotate refresh token
- `GET /api/auth/me` — current user
- `POST /api/auth/change-password`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Teachers (officer only unless noted):
- `POST /api/teachers` — register individual
- `POST /api/teachers/bulk-import` — excel/csv
- `GET /api/teachers` — list + search + filter + paginate
- `GET /api/teachers/:id`
- `PATCH /api/teachers/:id`
- `PATCH /api/teachers/:id/status` — activate/deactivate

Requests:
- `POST /api/requests` — teacher submits
- `GET /api/requests` — list (teacher: own; officer: all) + filters + paginate
- `GET /api/requests/:id`
- `PATCH /api/requests/:id/status` — officer only, transition validation
- `POST /api/requests/:id/cancel` — teacher, pending only
- `GET /api/requests/:id/history` — status history

Documents:
- `POST /api/documents/upload` — multer + cloudinary
- `GET /api/documents/:id`
- `GET /api/documents/:id/download` — authorized, signed/short-lived

Print jobs:
- `POST /api/print-jobs` — officer records print
- `GET /api/print-jobs` — list + paginate
- `GET /api/print-jobs/:id`
- `POST /api/print-jobs/:id/confirm` — mark success
- `POST /api/print-jobs/:id/failure` — record failure

Messages:
- `GET /api/requests/:id/messages`
- `POST /api/requests/:id/messages`

Notifications:
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

Reports:
- `GET /api/reports/overview`
- `GET /api/reports/printing`
- `GET /api/reports/teachers`
- Export: CSV/Excel query params

Health:
- `GET /health`

---

## 5. Socket.IO Events (authenticated)

Connection: JWT via auth token; join room `request:<requestId>` if authorized (teacher owner or officer).

Client -> Server:
- `join_request` / `leave_request`
- `send_message` -> persist + broadcast to room + notification
- `typing_start` / `typing_stop`
- `mark_read`

Server -> Client:
- `new_message` (room)
- `status_change` (room + user notification)
- `notification` (user-specific)
- `typing` indicators
- `online_status`

---

## 6. Security Design

- Passwords: bcrypt (salt 12)
- JWT: access token 15 min, refresh token 7 days, HTTP-only cookies (secure, sameSite=strict)
- Refresh-token rotation: single-use, reuse detection invalidates family
- National ID: string, masked `****1234` in UI, unique index
- Rate limiting: login 5/min per IP, general API 100/min
- Account lockout: 5 failed attempts -> 15 min lock
- Helmet headers, CORS restricted to frontend origin, mongo-sanitize, xss clean
- Multer: file size cap (10MB), extension + MIME + magic-byte validation
- Document access: authorized endpoints only; no public URLs; signed/expiring references
- Socket.IO: auth handshake, room authorization
- Secrets: `.env`, never committed; `.env.example` provided
- Audit logs on all sensitive mutations

---

## 7. Status Transition Rules (controlled)

```
PENDING  -> ACCEPTED / REJECTED / CANCELLED(teacher)
ACCEPTED -> PROCESSING / REJECTED
PROCESSING -> PRINTING / FAILED
PRINTING -> PRINTED / FAILED
PRINTED -> READY_FOR_COLLECTION / FAILED
READY_FOR_COLLECTION -> COLLECTED / FAILED
COLLECTED -> (terminal)
REJECTED -> (terminal)
CANCELLED -> (terminal)
FAILED -> PROCESSING (reprint) / REJECTED
```
- Only officer: ACCEPTED/PROCESSING/PRINTING/PRINTED/READY_FOR_COLLECTION/COLLECTED
- Teacher: CANCELLED (pending only), COLLECTED (confirm collection)
- Every transition writes statusHistory + ActivityLog + Notification

---

## 8. Implementation Plan (Phases)

### Phase 0 — Setup
- Root package.json workspaces, tsconfigs, .env.example, gitignore
- Server: express, typescript, mongoose, dotenv, helmet, cors, rate-limit, bcrypt, jsonwebtoken, cookie-parser, multer, cloudinary, socket.io, xlsx, csv-parse, nodemailer, zod, @types
- Client: vite, react, react-router-dom, @tanstack/react-query, react-hook-form, zod, @hookform/resolvers, lucide-react, clsx, tailwind-merge, shadcn/ui components, axios, socket.io-client
- Health check, centralized error handler, logger (pino/winston)

### Phase 1 — Auth & Security
- User model, auth middleware, role guard, login/logout/refresh/me, cookies, rate limit, lockout, forgot/reset, change password, national ID masking
- Tests: auth, authorization, lockout

### Phase 2 — Teacher Management
- Officer registers teacher (individual + temp password, first-login change)
- Bulk import (xlsx/csv), preview, validation, duplicate detection, confirm, report download, report with temp passwords (protected)
- Teacher list, activate/deactivate, reset password
- Tests: bulk import, duplicates, role authorization

### Phase 3 — Documents & Requests
- Multer + cloudinary upload, validation (size/ext/mime/content)
- Document model, upload/download authorized
- PrintRequest model, submission form (all 12 fields), status history
- Teacher: own requests; Officer: all requests + filters + pagination + sort
- Tests: cross-tenant access, file validation, unauthorized download

### Phase 4 — Printing Workflow
- Print view page, browser print via window.print(), PDF.js preview for PDF
- PrintJob model, confirm/failure endpoints, manual confirmation step
- Officer printer config management
- Tests: print job creation, confirmation, failure, reprint

### Phase 5 — Real-Time Chat
- Socket.IO auth, per-request rooms, message persistence, read receipts, typing, online/offline, unread counts
- Tests: message delivery, persistence, room authorization

### Phase 6 — Notifications
- Notification model, events on status change/chat/collection, bell + dropdown + history + mark read + deep link
- Tests: notification on status change, mark read

### Phase 7 — Reports & Analytics
- Overview/printing/teachers reports, date-range filters, CSV/Excel export, charts (recharts or native)
- Tests: report aggregation

### Phase 8 — UI/UX Polish
- Teacher + Officer layouts, sidebar, top nav, dashboard cards, tables, badges, skeletons, empty states, toasts, confirm dialogs, responsive mobile
- Profile & settings, print history

### Phase 9 — Deployment & Docs
- Vercel build (client), Render/Railway (server), MongoDB Atlas, Cloudinary
- env vars for dev/prod, CORS, HTTPS, health check, backups, deployment docs

---

## 9. Validation Plan (Critical Scenarios)

1. Teacher cannot access another teacher's documents/requests (403)
2. Teacher cannot access officer endpoints (403)
3. Duplicate national IDs rejected (unique index + app check)
4. Invalid spreadsheet records handled, preview highlights, report downloadable
5. Unauthorized users cannot download documents (401/403)
6. New requests appear immediately on officer dashboard (Socket.IO + TanStack Query invalidate)
7. Messages delivered and persisted (MongoDB)
8. Status changes generate notifications
9. Print confirmation creates valid PrintJob record
10. Collected documents marked COLLECTED

---

## 10. Open Questions / Decisions Needed

1. **File storage provider:** Cloudinary (recommended, generous free tier, easy image/doc handling) vs S3-compatible. Default plan assumes Cloudinary.
2. **Email provider:** Nodemailer with SMTP (school SMTP) vs SendGrid/Resend. Default plan assumes configurable Nodemailer SMTP; optional.
3. **Hosting:** Frontend on Vercel, Backend on Render/Railway. Confirm preference or leave as documented options.
4. **PDF preview library:** react-pdf (PDF.js) vs browser native `<embed>`. Default: react-pdf for page selection preview.
5. **Charts library:** recharts for reports.

I recommend proceeding with the defaults above unless you want to adjust any. Shall I finalize this plan and begin implementation with Phase 0?