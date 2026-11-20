"use client";
import type { ReactNode } from "react";
import styles from "./ActiveExperience.module.css";

export function RoomConnectionFrame({ children, language, joining, reconnecting, connectionError, onRetry }: {
  children: ReactNode;
  language: "en" | "ar";
  joining: boolean;
  reconnecting: boolean;
  connectionError: boolean;
  onRetry: () => void;
}) {
  const ar = language === "ar";
  const paused = joining || reconnecting;
  return <>
    {(reconnecting || connectionError) && <aside className={styles.connectionBanner} dir={ar ? "rtl" : "ltr"} aria-label={ar ? "حالة الاتصال" : "Connection status"}>
      <div role="status" aria-live="polite">
        <strong>{connectionError ? (ar ? "تعذر الاتصال بالغرفة حتى الآن" : "Still unable to reach the room") : (ar ? "جارٍ إعادة الاتصال…" : "Reconnecting…")}</strong>
        <p>{ar ? "الإجراءات متوقفة أثناء إعادة الاتصال. يستمر توقيت المعركة." : "Controls are paused while we reconnect. The match clock keeps running."}</p>
      </div>
      <div className={styles.connectionActions}>
        {connectionError && <button type="button" className="btn btn-primary" onClick={onRetry}>{ar ? "أعد محاولة الاتصال" : "Retry connection"}</button>}
        <a href="/">{ar ? "الرئيسية" : "Home"}</a>
      </div>
    </aside>}
    <fieldset className={styles.roomControls} disabled={paused} aria-busy={paused}
      onClickCapture={event => { if (paused) { event.preventDefault(); event.stopPropagation(); } }}
      onSubmitCapture={event => { if (paused) { event.preventDefault(); event.stopPropagation(); } }}>
      {children}
    </fieldset>
  </>;
}
