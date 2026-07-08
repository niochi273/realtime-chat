"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { socket } from "@/lib/socket";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  content: string;
  createdAt: string;
  room: string;
};

export default function Home() {
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
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");

    socket.emit("chat_message", text, ({ ok }: { ok: boolean }) => {
      if (!ok) {
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
        <ul>
          {messages.map((msg) => (
            <li className="p-2" key={msg.id}>
              {msg.content}
            </li>
          ))}
        </ul>
      </main>
      <footer className="mt-auto p-4">
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
