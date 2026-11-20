"use client";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { getSocket } from "@/lib/socket";
import styles from "./ActiveExperience.module.css";

export function ChatWindow({ gameId }: { gameId: string }) {
  const { language, userId } = useGameStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const ar = language === "ar";
  useEffect(() => {
    const socket = getSocket();
    const handler = (message: any) => setMessages(previous => [...previous, message].slice(-50));
    socket.on("game:message", handler);
    return () => { socket.off("game:message", handler); };
  }, []);
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);
  function sendMessage() {
    if (!input.trim()) return;
    getSocket()?.emit("game:message", { gameId, message: input });
    setInput("");
  }
  return <section className={styles.chat} aria-label={ar ? "دردشة الغرفة" : "Room chat"}>
    <h2 className={styles.chatHeading}>{ar ? "دردشة الغرفة" : "Room chat"}</h2>
    <div className={styles.chatLog} ref={scrollRef} role="log" aria-live="polite" aria-relevant="additions" aria-label={ar ? "الرسائل" : "Messages"}>
      {messages.length === 0 && <p className={styles.chatEmpty}>{ar ? "لا توجد رسائل بعد." : "No messages yet."}</p>}
      {messages.map((message, index) => <div key={index} className={styles.message} data-own={message.userId === userId} data-system={message.userId === "system_bot"}>
        {message.userId !== "system_bot" && <small><bdi>{message.username}</bdi></small>}
        <p dir="auto">{message.message}</p>
      </div>)}
    </div>
    <form className={styles.chatForm} onSubmit={event => { event.preventDefault(); sendMessage(); }}>
      <input className={styles.chatInput} aria-label={ar ? "رسالة للغرفة" : "Message the room"} value={input}
        onChange={event => setInput(event.target.value)} placeholder={ar ? "اكتب رسالة…" : "Write a message…"} maxLength={500} dir="auto" />
      <button type="submit" className={styles.chatSend} disabled={!input.trim()}>{ar ? "إرسال" : "Send"}</button>
    </form>
  </section>;
}
