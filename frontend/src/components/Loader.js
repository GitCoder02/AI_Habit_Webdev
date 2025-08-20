// frontend/src/components/Loader.js
export default function Loader({ small = false }) {
  return (
    <div className={`flex items-center justify-center ${small ? "py-1" : "py-8"}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-mint-green" />
    </div>
  );
}