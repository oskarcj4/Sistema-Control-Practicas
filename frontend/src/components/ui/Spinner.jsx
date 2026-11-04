// T20 - Spinner de carga.
// Uso: {cargando && <Spinner texto="Cargando ofertas..." />}
export default function Spinner({ texto = "Cargando..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      {/* Un círculo con un borde de color que gira gracias a "animate-spin" */}
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
      <p className="text-sm text-slate-500">{texto}</p>
    </div>
  );
}
