import { useEffect, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import {
  getUsers,
  deleteUser,
  updateUserRole,
  AdminUser,
} from "../../services/adminUserService";

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [roleChanging, setRoleChanging] = useState<number | null>(null);

  useEffect(() => {
    getUsers({ per_page: 50 })
      .then((res) => setUsers(res.users))
      .catch((err: any) => {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message;
        if (status === 401) setError("Non authentifié (401). Reconnectez-vous.");
        else if (status === 403)
          setError("Accès refusé (403) — votre compte n'a pas le rôle admin.");
        else if (status === 404)
          setError("Endpoint introuvable (404) — vérifiez la route backend /api/admin/users.");
        else if (msg) setError(`Erreur ${status ?? ""} : ${msg}`);
        else
          setError(`Erreur ${status ?? "réseau"} — consultez la console pour les détails.`);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleRoleChange(user: AdminUser, newRole: string) {
    if (newRole === user.roles[0]) return;
    setRoleChanging(user.id);
    setDeleteError(null);
    try {
      await updateUserRole(user.id, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, roles: [newRole] } : u))
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? "Erreur lors du changement de rôle.";
      setDeleteError(msg);
    } finally {
      setRoleChanging(null);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Supprimer cet utilisateur ?")) return;
    setDeleteError(null);
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? "Erreur lors de la suppression.";
      setDeleteError(msg);
    }
  }

  function formatDate(iso?: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("fr-FR");
  }

  function formatCrops(crops?: string[] | null) {
    if (!crops || crops.length === 0) return "—";
    return crops.join(", ");
  }

  return (
    <>
      <PageMeta title="Gestion des utilisateurs | AgriNova Admin" description="" />
      <PageBreadcrumb pageTitle="Utilisateurs" />

      <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Liste des utilisateurs
          </h2>
          {!loading && !error && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {users.length} utilisateur{users.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {deleteError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {deleteError}
          </div>
        )}

        {loading && (
          <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Chargement...
          </div>
        )}

        {!loading && error && (
          <div className="py-10 text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Aucun utilisateur trouvé.
          </div>
        )}

        {!loading && !error && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                  {[
                    "ID",
                    "Nom",
                    "Email",
                    "Rôle",
                    "Ferme",
                    "Cultures",
                    "Profil ferme",
                    "Actif",
                    "Créé le",
                    "Mis à jour",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {users.map((user) => {
                  const currentRole = user.roles[0] ?? "farmer";
                  const isChanging = roleChanging === user.id;
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {user.id}
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                        {user.name}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {user.email}
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={currentRole}
                          disabled={isChanging}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium focus:outline-none disabled:opacity-50 ${
                            currentRole === "admin"
                              ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-400"
                              : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400"
                          }`}
                        >
                          <option value="farmer">farmer</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {user.farm ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {formatCrops(user.crops)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {user.farm_profile ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            user.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                          }`}
                        >
                          {user.is_active ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.updated_at)}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
