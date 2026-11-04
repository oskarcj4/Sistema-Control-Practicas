// T20 - Estado vacío (Empty State).
// Se muestra cuando una lista no tiene elementos, para no dejar la pantalla en blanco.
// Uso:
//   {lista.length === 0 && (
//     <EstadoVacio icono="📭" titulo="Aún no te has postulado" mensaje="Explora el feed..." />
//   )}
export default function EstadoVacio({ icono = "📭", titulo, mensaje }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="text-5xl">{icono}</span>
      <h3 className="mt-4 text-lg font-semibold text-slate-700">{titulo}</h3>
      {mensaje && <p className="mt-1 max-w-sm text-sm text-slate-500">{mensaje}</p>}
    </div>
  );
}
