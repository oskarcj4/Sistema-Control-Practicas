export default function claseInput(error) {
  return `w-full rounded-lg border px-3 py-2 outline-none transition focus:ring-2 ${
    error ? "border-red-400 focus:ring-red-200" : "border-slate-300 focus:ring-indigo-200"
  }`;
}
