import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { COLOR_ROL, TEXTO_ROL, obtenerRoles } from "../helpers/estilos";
import { irA } from "../helpers/rutas";

export default function BuscadorUsuarios() {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

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
                        // Abre el perfil público (#/usuario/<id>)
                        setMenuAbierto(false);
                        setQuery("");
                        irA(`#/usuario/${u.id}`);
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

    </div>
  );
}
