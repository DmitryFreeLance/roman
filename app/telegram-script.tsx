"use client";

import { useEffect } from "react";

export function TelegramScript() {
  useEffect(() => {
    if (window.Telegram?.WebApp) return;
    if (document.querySelector('script[data-redline-telegram="true"]')) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js?63";
    script.async = true;
    script.dataset.redlineTelegram = "true";
    document.head.appendChild(script);
  }, []);

  return null;
}
