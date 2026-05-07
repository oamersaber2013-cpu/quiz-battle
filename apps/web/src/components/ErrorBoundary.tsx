"use client";
import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "20px",
          textAlign: "center",
          background: "var(--clr-bg)"
        }}>
          <div style={{ fontSize: "4rem", marginBottom: 20 }}>⚠️</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 12 }}>
            Something went wrong
          </h1>
          <p style={{ color: "var(--clr-text-2)", marginBottom: 24, maxWidth: 400 }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            style={{ padding: "12px 24px" }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
