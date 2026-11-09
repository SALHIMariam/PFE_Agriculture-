import { Navigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

type AdminRouteProps = {
  children: React.ReactNode;
  /** Rôles autorisés à accéder à la route. Par défaut : admin uniquement. */
  roles?: string[];
};

export default function AdminRoute({ children, roles = ["admin"] }: AdminRouteProps) {
  const { user, loading } = useAuth();

  if (loading) return null;

  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const isAllowed = roles.some((role) => userRoles.includes(role));
  if (!isAllowed) {
    // Ne jamais renvoyer un utilisateur connecté vers une route publique
    // (PublicOnlyRoute le déconnecterait aussitôt) : on le renvoie vers son
    // propre espace selon son rôle réel.
    if (userRoles.includes("admin") || userRoles.includes("expert")) {
      return <Navigate to="/dashboard" replace />;
    }
    if (userRoles.includes("farmer")) return <Navigate to="/farmer/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
