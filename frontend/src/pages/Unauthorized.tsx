import { Link } from "react-router";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="max-w-md w-full bg-white border border-slate-200 shadow-sm rounded-3xl p-10 text-center">
        <div className="text-7xl mb-6">🚫</div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Accès refusé</h1>
        <p className="text-slate-600 mb-6">
          Vous n’avez pas les droits nécessaires pour accéder à cette page.
        </p>
        <Link to="/login" className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-white text-sm font-semibold shadow-sm hover:bg-emerald-600">
          Retour à la page de connexion
        </Link>
      </div>
    </div>
  );
}
