export default function Card({ title, children, accent }) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 transform transition hover:-translate-y-1 hover:shadow-lg ${accent ? accent : ''}`}>
      {title && <h2 className="text-lg font-semibold mb-2">{title}</h2>}
      {children}
    </div>
  );
}