# Realtime Chat

A realtime messenger with authentication and direct 1-on-1 chats, built on a **standalone WebSocket server** separate from the Next.js app.

**Live demo:** _add your deployment link here_

_(add a screenshot or GIF of the chat here — `docs/screenshot.png`)_

---

## Stack

- **Frontend:** Next.js 16 (App Router, Server Components), React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Realtime:** Socket.IO (client + standalone server)
- **Backend:** Node.js, Express, Socket.IO server
- **Database:** PostgreSQL (Neon) + Drizzle ORM
- **Auth:** Better Auth (email/password, sessions)
- **Tooling:** npm workspaces monorepo, tsx

## Features

- Realtime messaging over WebSockets
- Email/password auth with sessions (Better Auth)
- Route protection: server-side session checks + a lightweight cookie check at the network boundary
- **Socket-level authentication** — the WebSocket server verifies the session itself before a connection is accepted; unauthenticated sockets are rejected
- Direct 1-on-1 chats with access control — a user can only enter a chat they belong to
- Optimistic UI — sent messages render instantly and roll back on failure
- Message history persisted in PostgreSQL, sender names resolved via join

## Architecture

```
   Browser
      │
      │  HTTP + cookie (session)          WebSocket (cookie sent with handshake)
      ▼                                          │
┌──────────────────┐                             ▼
│  Next.js (:3000) │                   ┌────────────────────────┐
│  UI, auth, SSR   │                   │  Socket server (:3001) │
│  route guards    │                   │  Express + Socket.IO   │
└────────┬─────────┘                   │  verifies session,     │
         │                             │  relays messages       │
         │                             └───────────┬────────────┘
         │                                         │
         └──────────────┬──────────────────────────┘
                        ▼
              ┌────────────────────┐
              │  PostgreSQL (Neon) │
              │  Drizzle ORM       │
              │  shared schema     │
              └────────────────────┘
```

**Why two separate processes?** Next.js on Vercel runs as serverless functions, which spin up per-request and cannot hold a persistent connection open. WebSockets require a long-lived, always-on process — so the realtime layer runs as its own Node + Socket.IO server, deployed separately from the Next.js client.

**How the socket server knows who you are.** After login, Better Auth sets a session cookie. When the client opens the WebSocket connection, that cookie travels with the handshake (`withCredentials` on the client, `credentials` in the server CORS config). A Socket.IO middleware on the server parses the cookie, looks the session up in the database, and — if it is valid and unexpired — attaches the user's id to the socket. Every message is then stored with a `senderId` taken from the verified session, never from data sent by the client.

**Shared schema.** The database schema (users, sessions, chats, participants, messages) lives in a shared workspace package imported by both the Next.js app and the socket server, so both halves speak to the same tables with the same types.

## Data model

- `user`, `session`, `account`, `verification` — auth tables (Better Auth)
- `chats` — a conversation (`pairKey` uniquely identifies a 1-on-1 pair)
- `chat_participants` — who belongs to each chat (composite primary key `(chatId, userId)`)
- `messages` — `content`, `chatId`, `senderId`, `createdAt`

Finding or creating a direct chat uses a **deterministic `pairKey`** built from the two sorted user ids, so A→B and B→A always resolve to the same chat. Chat creation (the chat row plus both participant rows) runs inside a **transaction** so a chat can never exist without its participants.

## Running locally

**Prerequisites:** Node.js, a PostgreSQL database (e.g. a free Neon project).

1. Clone and install from the repo root (npm workspaces installs all packages):

   ```bash
   git clone https://github.com/niochi273/realtime-chat.git
   cd realtime-chat
   npm install
   ```

2. Create env files.

   `web/.env.local`:

   ```
   DATABASE_URL=your_postgres_connection_string
   BETTER_AUTH_URL=http://localhost:3000
   BETTER_AUTH_SECRET=your_random_secret
   ```

   `server/.env`:

   ```
   DATABASE_URL=your_postgres_connection_string
   PORT=3001
   ```

3. Push the schema to the database:

   ```bash
   npm run db:push -w @repo/server
   ```

4. Start both processes (in two terminals):

   ```bash
   # terminal 1 — socket server
   npm run dev -w @repo/server

   # terminal 2 — Next.js app
   npm run dev -w @repo/web
   ```

5. Open http://localhost:3000, register two accounts (use a second browser or an incognito window for the second), and start a direct chat.

## Project structure

```
realtime-chat/
├── web/       # Next.js app (@repo/web)
├── server/    # Socket.IO + Express server (@repo/server)
├── shared/    # shared Drizzle schema (@repo/shared)
└── package.json  # npm workspaces root
```
