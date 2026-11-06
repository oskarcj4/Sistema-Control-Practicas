import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { COLOR_ROL, TEXTO_ROL, formatearFecha, obtenerRoles } from "../helpers/estilos";

export default function BuscadorUsuarios() {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

  const contenedorRef = useRef(null);

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickAfuera(e) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setMenuAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickAfuera); // Si el usuario hace click fuera (mousedown lo detecta) y cierra la busqueda
    return () => document.removeEventListener("mousedown", handleClickAfuera);
  }, []);

  // Búsqueda con debounce cuando cambia `query`
  useEffect(() => {
    const termino = query.trim();
    // Si el termino a buscar mide menos 2 limpia los resultados y cancela la busqueda
    if (termino.length < 2) {
      setResultados([]);
      setBuscando(false);
      return;
    }

    const controller = new AbortController();
    setBuscando(true);

    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(`usuarios.php?q=${encodeURIComponent(termino)}`, {
          signal: controller.signal,
        });
        setResultados(res.data || []);
        setMenuAbierto(true);
      } catch (err) {
        if (err.name === "AbortError") return;
        setResultados([]);
      } finally {
        if (!controller.signal.aborted) {
          setBuscando(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div ref={contenedorRef} className="relative w-full max-w-xs sm:max-w-sm">
      {/* Barra de búsqueda con icono de Lupa */}
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-3 text-slate-400">
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setMenuAbierto(true);
          }}
          onFocus={() => {
            if (resultados.length > 0 || query.trim().length >= 2) {
              setMenuAbierto(true);
            }
          }}
          placeholder="Buscar usuarios..."
          className="w-full rounded-full border border-slate-200 bg-slate-100 py-1.5 pl-9 pr-8 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 sm:text-sm"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResultados([]);
              setMenuAbierto(false);
            }}
            className="absolute right-2.5 text-xs text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Menú desplegable con resultados */}
      {menuAbierto && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {buscando ? (
            <p className="px-4 py-3 text-center text-xs text-slate-500">
              Buscando usuarios...
            </p>
          ) : resultados.length === 0 ? (
            <p className="px-4 py-3 text-center text-xs text-slate-400">
              No se encontraron usuarios para "{query}"
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {resultados.map((u) => {
                const roles = obtenerRoles(u);
                const rolPrincipal = roles[0] || 1;
                const iniciales = `${(u.nombre || "U").charAt(0)}${(u.apellido || "").charAt(0)}`.toUpperCase();

                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setUsuarioSeleccionado(u);
                        setMenuAbierto(false);
                      }}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-slate-50"
                    >
                      {/* Avatar */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                        {iniciales}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-xs font-bold text-slate-800 sm:text-sm">
                            {u.nombre} {u.apellido}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.2 text-[10px] font-semibold ${
                              COLOR_ROL[rolPrincipal] || "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {TEXTO_ROL[rolPrincipal] || "Usuario"}
                          </span>
                        </div>
                        <p className="truncate text-xs text-slate-500">@{u.username} · {u.email}</p>
                        {(u.institucion || u.carrera) && (
                          <p className="truncate text-[11px] text-slate-400">
                            {u.institucion} {u.carrera ? `· ${u.carrera}` : ""}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Modal con el perfil del usuario consultado */}
      {usuarioSeleccionado && (
        <div
          onClick={() => setUsuarioSeleccionado(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setUsuarioSeleccionado(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              ✕
            </button>

            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white shadow-md">
                {`${(usuarioSeleccionado.nombre || "U").charAt(0)}${(usuarioSeleccionado.apellido || "").charAt(0)}`.toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {usuarioSeleccionado.nombre} {usuarioSeleccionado.apellido}
                </h3>
                <p className="text-xs text-slate-500">@{usuarioSeleccionado.username}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {obtenerRoles(usuarioSeleccionado).map((r) => (
                    <span
                      key={r}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        COLOR_ROL[r] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {TEXTO_ROL[r] || "Usuario"}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2.5 text-xs text-slate-600 sm:text-sm">
              <div>
                <span className="font-semibold text-slate-700">📧 Correo:</span>{" "}
                <span className="text-slate-600">{usuarioSeleccionado.email}</span>
              </div>
              {usuarioSeleccionado.telefono && (
                <div>
                  <span className="font-semibold text-slate-700">📱 Teléfono:</span>{" "}
                  <span className="text-slate-600">{usuarioSeleccionado.telefono}</span>
                </div>
              )}
              {usuarioSeleccionado.institucion && (
                <div>
                  <span className="font-semibold text-slate-700">🏢 Institución:</span>{" "}
                  <span className="text-slate-600">{usuarioSeleccionado.institucion}</span>
                </div>
              )}
              {usuarioSeleccionado.carrera && (
                <div>
                  <span className="font-semibold text-slate-700">🎓 Carrera:</span>{" "}
                  <span className="text-slate-600">{usuarioSeleccionado.carrera}</span>
                </div>
              )}
              {usuarioSeleccionado.carnet && (
                <div>
                  <span className="font-semibold text-slate-700">🆔 Carnet:</span>{" "}
                  <span className="text-slate-600">{usuarioSeleccionado.carnet}</span>
                </div>
              )}
              {usuarioSeleccionado.biografia && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                  <span className="block font-semibold text-slate-700">Biografía:</span>
                  <p className="mt-1 whitespace-pre-line text-xs text-slate-600">
                    {usuarioSeleccionado.biografia}
                  </p>
                </div>
              )}
              <div className="pt-2 text-right text-[11px] text-slate-400">
                Miembro desde: {formatearFecha(usuarioSeleccionado.fecha_registro)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
