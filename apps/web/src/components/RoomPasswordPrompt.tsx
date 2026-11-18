"use client";

import { useEffect, useRef, useState } from "react";
import { AccountShell } from "./account/AccountShell";
import styles from "./account/Account.module.css";

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
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const ar = language === "ar";
  const valid = isValidRoomPassword(password);
  const tooLong = password.length > 0 && !valid;
  const message = tooLong
    ? (ar ? "كلمة المرور طويلة جدًا. استخدم كلمة مرور أقصر." : "Password is too long. Use a shorter password.")
    : (!editing && !pending ? error : null);

  useEffect(() => {
    if (error && !pending) input.current?.focus();
  }, [error, pending]);

  return (
    <AccountShell title={ar ? "غرفة خاصة" : "Private room"}
      description={ar ? "أدخل كلمة المرور التي أعطاك إياها صاحب الغرفة." : "Enter the password the host shared with you."}>
      <form className={`${styles.panel} ${styles.roomAccess}`} aria-busy={pending} onSubmit={event => {
        event.preventDefault();
        if (!valid || pending) return;
        setEditing(false);
        setVisible(false);
        onSubmit(password);
      }}>
        <div className={styles.field}>
          <label htmlFor="room-password">{ar ? "كلمة مرور الغرفة" : "Room password"}</label>
          <input id="room-password" ref={input} type={visible ? "text" : "password"} dir="auto"
            className={styles.input} autoComplete="off" autoCapitalize="none" spellCheck={false}
            readOnly={pending} value={password} aria-invalid={Boolean(message)}
            aria-describedby={message ? "room-password-error" : undefined}
            onChange={event => { setPassword(event.target.value); setEditing(true); }} />
          <button type="button" className={styles.roomVisibility} disabled={pending} aria-controls="room-password"
            onClick={() => setVisible(!visible)}>
            {visible ? (ar ? "إخفاء كلمة المرور" : "Hide password") : (ar ? "إظهار كلمة المرور" : "Show password")}
          </button>
        </div>
        {message && <p id="room-password-error" role="alert" className={styles.error}>{message}</p>}
        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={!valid || pending}>
            {pending ? (ar ? "جارٍ الاتصال…" : "Connecting…") : (ar ? "دخول الغرفة" : "Enter room")}
          </button>
          <button type="button" className={styles.secondary} onClick={onCancel}>{ar ? "إلغاء" : "Cancel"}</button>
        </div>
      </form>
    </AccountShell>
  );
}
