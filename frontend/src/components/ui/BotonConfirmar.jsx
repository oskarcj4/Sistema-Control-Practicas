import { useState } from "react";

// Botón de acción peligrosa con confirmación en dos pasos (sin window.confirm).
// Primer clic: muestra "¿Seguro? Sí / No". Segundo clic en "Sí": ejecuta onConfirmar.
//
// Props:
//   texto       -> texto del botón
//   pregunta    -> texto de la confirmación (por defecto "¿Seguro?")
//   onConfirmar -> función (puede ser async)
//   deshabilitado
//   clase       -> clases del botón inicial
export default function BotonConfirmar({
  texto,
  pregunta = "¿Seguro?",
  onConfirmar,
  deshabilitado = false,
  clase = "cursor-pointer rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100",
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function confirmar() {
    setOcupado(true);
    try {
      await onConfirmar();
    } finally {
      setOcupado(false);
      setConfirmando(false);
    }
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        disabled={deshabilitado}
        onClick={() => setConfirmando(true)}
        className={`${clase} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {texto}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="font-medium text-slate-600">{pregunta}</span>
      <button
        type="button"
        disabled={ocupado}
        onClick={confirmar}
        className="cursor-pointer rounded-md bg-red-600 px-2 py-1 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {ocupado ? "..." : "Sí"}
      </button>
      <button
        type="button"
        disabled={ocupado}
        onClick={() => setConfirmando(false)}
        className="cursor-pointer rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-600 hover:bg-slate-50"
      >
        No
      </button>
    </span>
  );
}
