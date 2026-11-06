// Ventana modal genérica: fondo oscuro + caja blanca con botón X.
// Clic en el fondo o en la X llama a onCerrar.
//
// Props:
//   titulo   -> texto de la cabecera (opcional)
//   onCerrar -> función que cierra el modal
//   ancho    -> clase de ancho máximo (por defecto "max-w-2xl")
//   children -> contenido
export default function Modal({ titulo, onCerrar, ancho = "max-w-2xl", children }) {
  return (
    <div
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative max-h-[90vh] w-full ${ancho} overflow-y-auto rounded-2xl bg-white p-6 shadow-xl`}
      >
        <button
          type="button"
          onClick={onCerrar}
          className="absolute right-4 top-4 cursor-pointer rounded-full px-2 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar"
        >
          ×
        </button>
        {titulo && <h3 className="mb-4 pr-8 text-lg font-bold text-slate-800">{titulo}</h3>}
        {children}
      </div>
    </div>
  );
}
