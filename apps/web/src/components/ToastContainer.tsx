"use client";
import { useGameStore } from "@/store/gameStore";

export function ToastContainer() {
  const { toasts, removeToast } = useGameStore();

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => removeToast(toast.id)}
          role="alert"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
