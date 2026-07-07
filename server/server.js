import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import { db } from "./src/db.js";
import { messages } from "./src/schema.js";
import { asc, eq } from "drizzle-orm";

const app = express();
const server = createServer(app);
const io = new Server(server);
const __dirname = dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

io.on("connection", (socket) => {
  let currentRoom;

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

      io.to(currentRoom).emit("chat_message", message[0]);
      callback({ ok: true });
    } catch (err) {
      console.error(err);
      callback({ ok: false });
    }
  });
});

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
