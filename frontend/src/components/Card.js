import React from "react";

export default function Card({ title, children, className = "" }) {
  // default polish classes: subtle shadow, padding, rounded corners, built-in fade-in & hover scale
  const base =
    "bg-white rounded shadow-sm p-4 transition-shadow transform hover:scale-105 duration-150 animate-fade-in-up";

  return (
    <div className={`${base} ${className}`}>
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}