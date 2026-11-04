// Caja roja para mostrar un error de la API.
// Uso: {error && <MensajeError texto={error} />}
export default function MensajeError({ texto }) {
  return (
    <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      {texto}
    </p>
  );
}
