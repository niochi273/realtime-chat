import dotenv from "dotenv";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { db } from "./src/db.js";
import { messages, session, user } from "@repo/shared";
import { asc, eq } from "drizzle-orm";
import { parse } from "cookie";

dotenv.config();

const port = process.env.PORT;
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.use(async (socket, next) => {
  const cookie = socket.handshake.headers.cookie;
  if (!cookie) return next(new Error("Unauthorized"));

  const parsedCookie =
    parse(cookie)["better-auth.session_token"]?.split(".")[0];

  if (!parsedCookie) return next(new Error("Unauthorized"));

  try {
    const dbSession = await db
      .select({
        userId: session.userId,
        userName: user.name,
        expiresAt: session.expiresAt,
      })
      .from(session)
      .leftJoin(user, eq(session.userId, user.id))
      .where(eq(session.token, parsedCookie));

    if (dbSession.length === 0) return next(new Error("Unauthorized"));

    if (dbSession[0].expiresAt < new Date()) {
      return next(new Error("Unauthorized"));
    }

    socket.data.userName = dbSession[0].userName;
    socket.data.userId = dbSession[0].userId;
    next();
  } catch (e: any) {
    next(new Error(e.message));
  }
});

io.on("connection", (socket) => {
  let currentRoom: string;

  socket.on("join_room", async (room, callback) => {
    if (currentRoom) {
      socket.leave(currentRoom);
    }

    socket.join(room);
    currentRoom = room;
    const roomMessages = await db
      .select({
        id: messages.id,
        content: messages.content,
        createdAt: messages.createdAt,
        senderId: messages.senderId,
        senderName: user.name,
      })
      .from(messages)
      .leftJoin(user, eq(messages.senderId, user.id))
      .where(eq(messages.room, room))
      .orderBy(asc(messages.createdAt));

    callback({ room, history: roomMessages });
  });

  socket.on("chat_message", async (msg, callback) => {
    try {
      const message = await db
        .insert(messages)
        .values({
          room: currentRoom,
          content: msg,
          senderId: socket.data.userId,
        })
        .returning();

      socket.to(currentRoom).emit("chat_message", {
        ...message[0],
        senderName: socket.data.userName,
      });
      callback({ ok: true });
    } catch (err) {
      console.error(err);
      callback({ ok: false });
    }
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
