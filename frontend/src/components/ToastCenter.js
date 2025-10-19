import React, { useState, useCallback, useEffect } from "react";
import Toast from "./Toast";

/*
  ToastCenter: keeps a list of toasts and exposes showAppToast + overrides window.alert
  Usage:
    window.showAppToast("Message", "success")
    // or any legacy alert() calls will be routed to toasts automatically after mount
*/

export default function ToastCenter() {
  const [toasts, setToasts] = useState([]);

  const showAppToast = useCallback((message, type = "info", ttl = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, ttl);
    return id;
  }, []);

  useEffect(() => {
    // expose helpers globally for legacy code
    window.showAppToast = showAppToast;
    const originalAlert = window.alert;
    window.alert = (msg) => showAppToast(String(msg), "info");
    return () => {
      window.showAppToast = undefined;
      window.alert = originalAlert;
    };
  }, [showAppToast]);

  const remove = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] flex items-end justify-center p-6">
      <div className="space-y-3 w-full max-w-lg pointer-events-auto">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            onClose={() => remove(t.id)}
          />
        ))}
      </div>
    </div>
  );
}