import { Navigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/agrinova-login" replace />;
  }

  return <>{children}</>;
}
