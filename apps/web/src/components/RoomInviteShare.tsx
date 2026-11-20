"use client";

import { useEffect, useRef, useState } from "react";
import { createRoomInviteUrl, isRoomCode } from "@/lib/roomInvites";
import sharedStyles from "./ActiveExperience.module.css";
import styles from "./RoomInviteShare.module.css";

type ShareStatus = "codeCopied" | "linkCopied" | "copyFailed" | "shareFailed" | null;

export function RoomInviteShare({ joinCode, language }: { joinCode: string | null; language: "en" | "ar" }) {
  const ar = language === "ar";
  const [origin, setOrigin] = useState("");
  const [canShare, setCanShare] = useState(false);
  const [status, setStatus] = useState<ShareStatus>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inviteUrl = origin && joinCode ? createRoomInviteUrl(origin, joinCode, language) : "";
  const validCode = !!joinCode && isRoomCode(joinCode);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location?.origin) setOrigin(window.location.origin);
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    return () => { if (statusTimer.current) clearTimeout(statusTimer.current); };
  }, []);

  async function copy(value: string, success: "codeCopied" | "linkCopied") {
    if (!value) return;
    if (statusTimer.current) clearTimeout(statusTimer.current);
    try {
      await navigator.clipboard.writeText(value);
      setStatus(success);
      statusTimer.current = setTimeout(() => setStatus(null), 2500);
    } catch {
      const field = success === "codeCopied" ? codeInput.current : linkInput.current;
      field?.focus();
      field?.select();
      setStatus("copyFailed");
    }
  }

  async function share() {
    if (!inviteUrl) return;
    setStatus(null);
    try {
      await navigator.share({
        title: ar ? "سيف المعرفة" : "Sword of Knowledge",
        text: ar ? `انضم إلى معركتي. رمز الغرفة: ${joinCode}` : `Join my battle. Room code: ${joinCode}`,
        url: inviteUrl,
      });
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setStatus("shareFailed");
    }
  }

  const message = status === "codeCopied" ? (ar ? "تم نسخ رمز الغرفة." : "Room code copied.")
    : status === "linkCopied" ? (ar ? "تم نسخ رابط الدعوة." : "Invite link copied.")
    : status === "copyFailed" ? (ar ? "تعذر النسخ تلقائيًا. انسخ النص المحدد." : "Automatic copy failed. Copy the selected text.")
    : status === "shareFailed" ? (ar ? "تعذرت المشاركة. يمكنك نسخ رابط الدعوة أو تحديده ونسخه." : "Could not share. Copy the invite link or select it to copy.")
    : "";

  return <section className={sharedStyles.surface} aria-label={ar ? "دعوة اللاعبين" : "Invite players"}>
    <h2 className={sharedStyles.eyebrow}>{ar ? "رمز الغرفة" : "ROOM CODE"}</h2>
    <div className={styles.codeRow}>
      <input ref={codeInput} className={styles.code} aria-label={ar ? "رمز الغرفة" : "Room code"} dir="ltr" readOnly value={joinCode || "------"}
        onFocus={event => event.currentTarget.select()} />
      <button type="button" className="btn btn-secondary" disabled={!validCode} onClick={() => copy(joinCode!, "codeCopied")}>
        {ar ? "نسخ الرمز" : "Copy code"}
      </button>
    </div>
    <div className={styles.invite}>
      <label className={styles.linkLabel}>
        {ar ? "رابط الدعوة" : "Invite link"}
        <input ref={linkInput} className={styles.link} aria-label={ar ? "رابط الدعوة" : "Invite link"} dir="ltr" readOnly value={inviteUrl}
          onFocus={event => event.currentTarget.select()} />
      </label>
      <div className={styles.actions}>
        <button type="button" className="btn btn-secondary" disabled={!inviteUrl} onClick={() => copy(inviteUrl, "linkCopied")}>
          {ar ? "نسخ رابط الدعوة" : "Copy invite link"}
        </button>
        {canShare && <button type="button" className="btn btn-primary" disabled={!inviteUrl} onClick={share}>
          {ar ? "مشاركة الدعوة" : "Share invitation"}
        </button>}
      </div>
      {status && <p className={styles.feedback} role={status === "copyFailed" || status === "shareFailed" ? "alert" : "status"}>{message}</p>}
    </div>
  </section>;
}
