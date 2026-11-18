"use client";

import { MotionConfig } from "framer-motion";
import type { MouseEvent, ReactNode } from "react";

export function AccessibleShell({ children }: { children: ReactNode }) {
  function skipNavigation(event: MouseEvent<HTMLAnchorElement>) {
    const target = document.querySelector<HTMLElement>("main h1, main h2") ?? document.querySelector("main");
    if (!target) return;
    event.preventDefault();
    target.tabIndex = -1;
    target.focus();
  }

  return (
    <MotionConfig reducedMotion="user">
      <a href="#page-start" className="skip-to-content" onClick={skipNavigation}>
        <span className="skip-en" lang="en">Skip to content</span>
        <span className="skip-ar" lang="ar">انتقل إلى المحتوى</span>
      </a>
      <div id="page-start" tabIndex={-1}>{children}</div>
    </MotionConfig>
  );
}
