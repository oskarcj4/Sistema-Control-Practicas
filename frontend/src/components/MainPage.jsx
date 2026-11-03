export default function MainPage({ usuario, onLogout }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            ¡Bienvenido, {usuario?.name || usuario?.username}!
          </h1>
          <p className="text-sm text-slate-500">
            Usuario: <span className="font-medium text-slate-700">@{usuario?.username}</span>
          </p>
        </div>
        <button
          onClick={onLogout}
          className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition cursor-pointer"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
          <h2 className="font-semibold text-slate-700">Panel de Control de Prácticas</h2>
          <p className="text-sm text-slate-600 mt-1">
            Has iniciado sesión correctamente. Desde aquí podrás ver las oportunidades de práctica y tus postulaciones.
          </p>
        </div>
      </div>
    </div>
  );
}
