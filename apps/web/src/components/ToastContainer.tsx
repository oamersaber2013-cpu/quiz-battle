"use client";
import { useGameStore } from "@/store/gameStore";

export function ToastContainer() {
  const { toasts, removeToast, language } = useGameStore();

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          role={toast.type === "error" ? "alert" : "status"}
        >
          <span>{toast.message}</span>
          <button type="button" onClick={() => removeToast(toast.id)} aria-label={language === "ar" ? "إغلاق" : "Dismiss"}>×</button>
        </div>
      ))}
    </div>
  );
}
