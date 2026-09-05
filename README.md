# Uptime Monitor & API Key Management Dashboard

A lightweight, zero-dependency monitoring dashboard built with Next.js + Prisma + SQLite. It runs comfortably in resource-constrained environments such as Termux, Android, or low-spec VPS hosts.

## Features

- Periodic uptime checks with native Node.js `setInterval`
- SQLite persistence via Prisma
- API key issuance with SHA-256 hashing
- In-memory sliding-window rate limiting
- Basic webhook dispatcher for status transitions
- Dark mode dashboard UI

## Quick start

1. Install dependencies:
   npm install
2. Push the Prisma schema to SQLite:
   npx prisma db push
3. Start the app:
   npm run dev
4. Open http://localhost:3000

## Environment variables

The app runs with the default local SQLite database (`prisma/dev.db`). Optional environment values:

- `WEBHOOK_URL` for Discord/Slack/Telegram alert forwarding

## Project files

- `prisma/schema.prisma`
- `lib/rateLimiter.ts`
- `lib/monitorEngine.ts`
- `middleware.ts`
- `app/page.tsx`

## Notes

This project intentionally avoids Redis, BullMQ, Docker, and external database services. It is designed for simple local hosting and low-overhead monitoring.
