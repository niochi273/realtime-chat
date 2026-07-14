"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { socket } from "@/lib/socket";
import { Message } from "@/lib/types";
import { User } from "better-auth";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";

interface ChatInterface {
  username: string;
  userId: string;
}

export default function Chat({ username, userId }: ChatInterface) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState<string>("");
  const [currentChat, setCurrentChat] = useState<string>("");
  const [friends, setFriends] = useState<User[]>([]);
  const [friendName, setFriendName] = useState<string>();

  useEffect(() => {
    socket.connect();

    if (socket.connected) {
      onConnect();
    }

    function onConnect() {
      socket.emit("get_users", ({ users }: { users: User[] }) => {
        console.log("get_users response:", users);
        setFriends(users);
      });
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
      chatId: currentChat,
      content: text,
      createdAt: new Date().toISOString(),
      senderName: username,
      senderId: userId,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");

    socket.emit("chat_message", text, ({ errorMsg }: { errorMsg: string }) => {
      if (errorMsg) {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
        setMessages((prev) =>
          prev.filter((m) => m.id !== optimisticMessage.id),
        );
        alert(`Message wasn't sent: ${errorMsg}`);
      }
    });
  }

  function createOrGetChat(userId: string, username: string) {
    socket.emit(
      "create_or_get_chat",
      userId,
      ({
        history,
        errorMsg,
        chatId,
      }: {
        history: Message[] | undefined;
        errorMsg: string | undefined;
        chatId: string | undefined;
      }) => {
        if (history && chatId) {
          setFriendName(username);
          setMessages(history);
          setCurrentChat(chatId);
        } else {
          alert(errorMsg);
        }
      },
    );
  }

  return (
    <div className="flex h-screen">
      <aside className="py-2 px-1 overflow-y-auto border-r">
        <ul>
          {friends?.map((user) => (
            <li
              onClick={() => createOrGetChat(user.id, user.name)}
              key={user.id}
            >
              <Button variant="outline">{user.name}</Button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {currentChat && (
          <header className="border-b py-1 px-2">
            <div>
              <span>{friendName}</span>
              <span>{}</span>
            </div>
          </header>
        )}
        <ul className="flex-1 overflow-y-auto p-4">
          {messages.map((msg) => {
            const isMine = msg.senderId === userId;
            return (
              <li
                className={`flex flex-row ${isMine ? "justify-end" : "justify-start"}`}
                key={msg.id}
              >
                <div
                  className={`my-2 flex flex-col rounded-xl p-2 shadow ${isMine ? "items-end bg-primary text-primary-foreground" : "items-start bg-muted"}`}
                >
                  <span className="text-xs">
                    {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span>{msg.content}</span>
                </div>
              </li>
            );
          })}
        </ul>

        {currentChat && (
          <footer className="bg-muted p-4">
            <form onSubmit={handleSubmit}>
              <FieldGroup className="flex flex-row gap-2">
                <Field className="flex-1">
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
        )}
      </section>
    </div>
  );
}
