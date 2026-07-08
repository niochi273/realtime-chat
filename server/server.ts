import dotenv from "dotenv";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { db } from "./src/db.js";
import { messages } from "@repo/shared";
import { asc, eq } from "drizzle-orm";

dotenv.config();

const port = process.env.PORT;
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
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
      .select()
      .from(messages)
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
        })
        .returning();

      socket.to(currentRoom).emit("chat_message", message[0]);
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
