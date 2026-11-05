"use client";

import { useState } from "react";

export function isValidRoomPassword(password: string): boolean {
  return password.length > 0 && new TextEncoder().encode(password).length <= 72;
}

export function RoomPasswordPrompt({ language, error, pending, onSubmit, onCancel }: {
  language: "en" | "ar";
  error: string | null;
  pending: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const isAr = language === "ar";
  const valid = isValidRoomPassword(password);
  return (
    <main className="page" dir={isAr ? "rtl" : "ltr"} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", padding: 20 }}>
      <form className="glass-card p-6" style={{ width: "100%", maxWidth: 420 }} onSubmit={(event) => {
        event.preventDefault();
        if (!valid || pending) return;
        const enteredPassword = password;
        setPassword("");
        onSubmit(enteredPassword);
      }}>
        <h1 className="text-xl font-bold mb-3">🔒 {isAr ? "غرفة خاصة" : "Private room"}</h1>
        <p className="text-muted mb-4">{isAr ? "أدخل كلمة مرور الغرفة للانضمام أو المشاهدة." : "Enter the room password to join or watch."}</p>
        <label htmlFor="room-password">{isAr ? "كلمة مرور الغرفة" : "Room password"}</label>
        <input id="room-password" type="password" autoComplete="off" value={password} disabled={pending} onChange={(event) => setPassword(event.target.value)} className="input w-full mt-2 mb-3" autoFocus />
        {password.length > 0 && !valid && <p role="alert" className="text-sm mb-3">{isAr ? "كلمة المرور طويلة جداً. استخدم كلمة مرور أقصر." : "Password is too long. Please use a shorter password."}</p>}
        {error && <p role="alert" className="text-sm mb-3">{error}</p>}
        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={!valid || pending}>{pending ? (isAr ? "جاري الاتصال..." : "Connecting...") : (isAr ? "دخول الغرفة" : "Enter room")}</button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>{isAr ? "إلغاء" : "Cancel"}</button>
        </div>
      </form>
    </main>
  );
}
