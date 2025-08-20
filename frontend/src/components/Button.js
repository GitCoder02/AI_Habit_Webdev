// frontend/src/components/Button.js
export default function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-md font-semibold transition disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}