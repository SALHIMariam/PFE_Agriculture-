import { Navigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  const roles = Array.isArray(user?.roles) ? user.roles : [];
  if (!roles.includes("admin")) {
    return <Navigate to="/landing" replace />;
  }

  return <>{children}</>;
}
