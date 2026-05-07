export function preventZoom() {
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("gesturechange", (e) => e.preventDefault());
  document.addEventListener("gestureend", (e) => e.preventDefault());
}

export function enableTouchFeedback(element: HTMLElement) {
  element.addEventListener("touchstart", () => {
    element.style.opacity = "0.7";
  });
  
  element.addEventListener("touchend", () => {
    element.style.opacity = "1";
  });
  
  element.addEventListener("touchcancel", () => {
    element.style.opacity = "1";
  });
}

export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function addTouchClass() {
  if (isMobile()) {
    document.body.classList.add("touch-device");
  }
}

export function preventPullToRefresh() {
  let startY = 0;
  
  document.addEventListener("touchstart", (e) => {
    startY = e.touches[0].pageY;
  }, { passive: false });
  
  document.addEventListener("touchmove", (e) => {
    const y = e.touches[0].pageY;
    if (y > startY && window.scrollY === 0) {
      e.preventDefault();
    }
  }, { passive: false });
}
