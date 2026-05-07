"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ size = "md", message, fullScreen = false }: LoadingSpinnerProps) {
  const sizes = {
    sm: 24,
    md: 40,
    lg: 60
  };

  const spinnerSize = sizes[size];

  const spinner = (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 16
    }}>
      <div style={{
        width: spinnerSize,
        height: spinnerSize,
        border: `${Math.max(3, spinnerSize / 10)}px solid rgba(108, 99, 255, 0.2)`,
        borderTopColor: "var(--clr-primary)",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
      }} />
      {message && (
        <p style={{
          color: "var(--clr-text-2)",
          fontSize: size === "sm" ? "0.875rem" : "1rem",
          fontWeight: 600
        }}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
        zIndex: 9999
      }}>
        {spinner}
      </div>
    );
  }

  return spinner;
}
