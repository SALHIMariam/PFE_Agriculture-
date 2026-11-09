import { Navigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

/**
 * Wrapper pour les routes publiques (/, /landing, /login, /signup...).
 *
 * Si l'utilisateur est déjà connecté → le rediriger vers son dashboard
 * selon son rôle, SANS le déconnecter (la déconnexion reste une action
 * explicite : bouton "Déconnecter" dans NavBar.tsx uniquement — jamais un
 * effet de bord d'un simple passage sur une route publique).
 * Si non connecté → afficher la route publique normalement.
 */
export default function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Attendre la fin du GET /api/me avant de décider (évite un flash de la
  // page publique pendant qu'on ne sait pas encore si l'utilisateur est connecté).
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  // Connecté → rediriger vers le bon dashboard selon le rôle.
  if (user) {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    if (roles.includes("admin") || roles.includes("expert")) {
      return <Navigate to="/dashboard" replace />;
    }
    if (roles.includes("farmer")) {
      return <Navigate to="/farmer/dashboard" replace />;
    }
    // Rôle inconnu → laisser passer vers la page publique plutôt que de
    // bloquer l'utilisateur sans destination.
    return <>{children}</>;
  }

  // Non connecté → afficher la route publique.
  return <>{children}</>;
}
