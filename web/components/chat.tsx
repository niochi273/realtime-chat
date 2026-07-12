"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { socket } from "@/lib/socket";
import { Message } from "@/lib/types";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatInterface {
  username: string;
  userId: string;
}

export default function Chat({ username, userId }: ChatInterface) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState<string>("");
  const [currentRoom, setCurrentRoom] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    socket.connect();

    if (socket.connected) {
      onConnect();
    }

    function onConnect() {
      console.log("Connected");
    }

    function onDisconnect() {
      console.log("Disconected");
    }

    function onReceive(message: Message) {
      if (message) {
        setMessages((messages) => [...messages, message]);
        window.scrollTo(0, document.body.scrollHeight);
      }
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    socket.on("chat_message", onReceive);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chat_message", onReceive);
      socket.disconnect();
    };
  }, []);

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text) return;

    const optimisticMessage: Message = {
      id: crypto.randomUUID(),
      room: currentRoom,
      content: text,
      createdAt: new Date().toISOString(),
      senderName: username,
      senderId: userId,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");

    socket.emit("chat_message", text, ({ ok }: { ok: boolean }) => {
      if (!ok) {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
        setMessages((prev) =>
          prev.filter((m) => m.id !== optimisticMessage.id),
        );
        alert("Message wasn't sent");
      }
    });
  }

  function joinRoom() {
    socket.emit(
      "join_room",
      inputRef.current?.value,
      ({ room, history }: { room: string; history: Message[] }) => {
        if (room) {
          setCurrentRoom(room);
          setMessages(history);
        }
      },
    );
  }

  return (
    <>
      <header className="p-4">
        <h1> {currentRoom ?? "No room yet"}</h1>
        <FieldGroup className="flex flex-row gap-2 ">
          <Field>
            <Input ref={inputRef} placeholder="Type..." />
          </Field>
          <Button onClick={joinRoom} className="rounded-3xl">
            Join room
          </Button>
        </FieldGroup>
      </header>
      <main>
        <ul className="p-4">
          {messages.map((msg) => {
            const isMine = msg.senderId === userId;

            return (
              <li
                className={`flex flex-row ${isMine ? "justify-end " : "justify-start"}`}
                key={msg.id}
              >
                <div
                  className={`my-2 shadow rounded-xl p-2 flex flex-col ${isMine ? "items-end bg-primary text-primary-foreground" : "items-start bg-muted"}`}
                >
                  <span className="text-xs">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                  <span>{msg.content}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
      <footer className="mt-auto sticky bottom-0 right-0 bg-muted p-4">
        <form onSubmit={handleSubmit}>
          <FieldGroup className="flex flex-row gap-2 ">
            <Field>
              <Input
                name="message"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type..."
              />
            </Field>
            <Button type="submit" className="rounded-3xl">
              <Send />
            </Button>
          </FieldGroup>
        </form>
      </footer>
    </>
  );
}
