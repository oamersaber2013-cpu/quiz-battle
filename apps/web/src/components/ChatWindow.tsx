"use client";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { getSocket } from "@/lib/socket";

export function ChatWindow({ gameId }: { gameId: string }) {
  const { language, userId, username } = useGameStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRTL = language === "ar";

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handler = (msg: any) => {
      setMessages((prev) => [...prev, msg].slice(-50));
    };

    socket.on("game:message", handler);
    return () => {
      socket.off("game:message", handler);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  function sendMessage() {
    if (!input.trim()) return;
    const socket = getSocket();
    socket?.emit("game:message", { gameId, message: input });
    setInput("");
  }

  return (
    <div className="glass-card" style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: 300, 
      overflow: "hidden",
      border: "1px solid var(--clr-border)",
      background: "rgba(0,0,0,0.2)"
    }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--clr-border)", fontSize: "0.8rem", fontWeight: 800, color: "var(--clr-primary)" }}>
        {isRTL ? "الدردشة الملكية" : "ROYAL CHAT"}
      </div>
      
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((m, i) => {
          const isSystem = m.userId === "system_bot";
          const isMe = m.userId === userId;
          
          return (
            <div key={i} className={isSystem ? "animate-bounce-in" : ""} style={{ 
              alignSelf: isSystem ? "center" : (isMe ? "flex-end" : "flex-start"),
              maxWidth: isSystem ? "90%" : "80%",
              width: isSystem ? "100%" : "auto"
            }}>
              {!isSystem && (
                <div style={{ fontSize: "0.65rem", opacity: 0.6, marginBottom: 2, textAlign: isMe ? "right" : "left" }}>
                  {m.username}
                </div>
              )}
              <div style={{ 
                background: isSystem ? "var(--grad-fire)" : (isMe ? "var(--grad-primary)" : "rgba(255,255,255,0.1)"),
                padding: "8px 14px",
                borderRadius: isSystem ? 8 : 12,
                fontSize: isSystem ? "0.85rem" : "0.9rem",
                fontWeight: isSystem ? 700 : 400,
                color: "white",
                textAlign: "center",
                boxShadow: isSystem ? "0 4px 12px rgba(255,165,2,0.3)" : "none",
                border: isSystem ? "1px solid var(--clr-gold)" : "none"
              }}>
                {isSystem && <span style={{ marginRight: 8 }}>👑</span>}
                {m.message}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: 10, display: "flex", gap: 8, borderTop: "1px solid var(--clr-border)" }}>
        <input 
          className="input" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={isRTL ? "أرسل رسالة..." : "Send a message..."}
          style={{ height: 36, fontSize: "0.85rem", padding: "0 12px" }}
        />
        <button className="btn btn-primary" onClick={sendMessage} style={{ height: 36, padding: "0 12px" }}>
          {isRTL ? "إرسال" : "Send"}
        </button>
      </div>
    </div>
  );
}
