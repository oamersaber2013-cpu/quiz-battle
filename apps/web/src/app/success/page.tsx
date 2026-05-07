import { Suspense } from "react";
import { SuccessContent } from "./success-content";

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <main
          className="page"
          style={{
            padding: "40px 20px",
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="text-muted">Loading payment confirmation...</div>
        </main>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
