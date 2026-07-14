import dotenv from "dotenv";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { db } from "./src/db.js";
import { chatParticipants, chats, messages, session, user } from "@repo/shared";
import { asc, eq, and, ne } from "drizzle-orm";
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
  let currentChatId: string;

  // Get users

  socket.on("get_users", async (callback) => {
    const users = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(ne(user.id, socket.data.userId));

    callback({ users });
  });

  // Create or get chat

  socket.on("create_or_get_chat", async (otherUserId, callback) => {
    if (otherUserId === socket.data.userId)
      return callback({ errorMsg: "Can't make chat with yourself" });

    const otherUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, otherUserId));

    if (otherUser.length === 0)
      return callback({ errorMsg: "User doesn't exist" });

    const pairKey = [socket.data.userId, otherUserId].sort().join(":");

    const existingChat = await db
      .select()
      .from(chats)
      .where(eq(chats.pairKey, pairKey));

    const chatId =
      existingChat.length > 0
        ? existingChat[0].id
        : await db.transaction(async (tx) => {
            const [chat] = await tx
              .insert(chats)
              .values({ pairKey })
              .returning();
            await tx.insert(chatParticipants).values([
              { chatId: chat.id, userId: socket.data.userId },
              { chatId: chat.id, userId: otherUserId },
            ]);
            return chat.id;
          });

    if (currentChatId) {
      socket.leave(currentChatId);
    }

    socket.join(chatId);
    currentChatId = chatId;
    const chatMessages = await db
      .select({
        id: messages.id,
        content: messages.content,
        createdAt: messages.createdAt,
        senderId: messages.senderId,
        senderName: user.name,
      })
      .from(messages)
      .leftJoin(user, eq(messages.senderId, user.id))
      .where(eq(messages.chatId, chatId))
      .orderBy(asc(messages.createdAt));

    callback({ history: chatMessages, chatId });
  });

  // Send message

  socket.on("chat_message", async (msg, callback) => {
    try {
      const participants = await db
        .select()
        .from(chatParticipants)
        .where(
          and(
            eq(chatParticipants.chatId, currentChatId),
            eq(chatParticipants.userId, socket.data.userId),
          ),
        );

      if (participants.length === 0) {
        return callback({ errorMsg: "No participants" });
      }

      const message = await db
        .insert(messages)
        .values({
          chatId: currentChatId,
          content: msg,
          senderId: socket.data.userId,
        })
        .returning();

      socket.to(currentChatId).emit("chat_message", {
        ...message[0],
        senderName: socket.data.userName,
      });
    } catch (err) {
      console.error(err);
      callback({ errorMsg: err });
    }
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
