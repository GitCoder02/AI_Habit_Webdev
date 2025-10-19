import { useEffect } from "react";

export default function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    const t = setTimeout(() => onClose(), 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg =
    type === "success"
      ? "bg-emerald-500"
      : type === "error"
      ? "bg-red-500"
      : "bg-energetic-orange";

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className={`text-white px-4 py-2 rounded shadow-lg ${bg} animate-pop`}
        role="status"
      >
        {message}
      </div>
    </div>
  );
}