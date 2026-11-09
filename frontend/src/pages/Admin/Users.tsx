import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import {
  getAllUsers,
  deleteUser,
  setUserStatus,
  createExpertUser,
  AdminUser,
  type UserFilters,
} from "../../services/adminUserService";
import { GOVERNORATES } from "../Heatmap/data/governorates";
import { ROLE_LABELS, labelOf } from "../../utils/labels";

type CreationResult = {
  variant: "success" | "warning";
  message: string;
};

const GOVERNORATE_NAMES = GOVERNORATES.map((g) => g.name);
const ROLE_OPTIONS = ["farmer", "expert", "admin"] as const;

/** Surligne en vert AgriNova la portion de `text` correspondant à `query`. */
function highlight(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark
        style={{
          background: "rgba(64,145,108,0.2)",
          color: "#1b4332",
          borderRadius: 3,
          padding: "0 1px",
        }}
      >
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

const filterFieldClass =
  "rounded-xl border-[1.5px] border-[rgba(27,67,50,0.14)] bg-white px-3.5 py-2.5 text-[13.5px] text-gray-700 outline-none transition focus:border-[#40916c] focus:shadow-[0_0_0_3px_rgba(64,145,108,0.14)] dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-200";

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Activation / désactivation (toggle de la colonne Actif) ──
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function notify(message: string, kind: "success" | "error") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, kind });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // ── Recherche avancée ──
  // Le terme de recherche vient de la barre du header, propagé via ?search=.
  // Les filtres select restent locaux à la page et se combinent avec.
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFromUrl = (searchParams.get("search") ?? "").trim();
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [govFilter, setGovFilter] = useState("");

  const hasActiveFilters =
    searchFromUrl !== "" ||
    roleFilter !== "" ||
    statusFilter !== "" ||
    govFilter !== "";

  function resetFilters() {
    setRoleFilter("");
    setStatusFilter("");
    setGovFilter("");
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("search");
        return next;
      },
      { replace: true }
    );
  }

  // ── Formulaire "Créer un compte Expert" ──
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  // Le téléphone reste volontairement un champ frontend non persisté : la
  // colonne `phone` a été supprimée de la table `users` (migration
  // 2026_04_25) et le backend `StoreUserRequest` ne l'accepte pas. On ne
  // l'envoie donc pas à l'API tant que cette colonne n'est pas réintroduite.
  const [telephone, setTelephone] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creationResult, setCreationResult] = useState<CreationResult | null>(null);

  const currentFilters: UserFilters = useMemo(
    () => ({
      search: searchFromUrl,
      role: roleFilter,
      is_active: statusFilter,
      governorate: govFilter,
    }),
    [searchFromUrl, roleFilter, statusFilter, govFilter]
  );

  function loadUsers(mode: "initial" | "refine" = "refine") {
    if (mode === "initial") setLoading(true);
    else setSearching(true);
    setError(null);
    return getAllUsers(currentFilters)
      .then((users) => setUsers(users))
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
      .finally(() => {
        setLoading(false);
        setSearching(false);
      });
  }

  // Re-fetch à chaque changement de filtre (retour implicite à la page 1).
  useEffect(() => {
    loadUsers("refine");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilters]);

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

  async function handleToggleStatus(user: AdminUser) {
    if (togglingIds.has(user.id)) return;
    const previous = user.is_active;
    const next = !previous;

    // Mise à jour optimiste : le switch bascule immédiatement, et revient à
    // son état précédent si le backend refuse ou si le réseau échoue.
    setTogglingIds((s) => new Set(s).add(user.id));
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: next } : u)));
    try {
      const res = await setUserStatus(user.id, next);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...res.user } : u)));
      notify(next ? "Compte activé avec succès" : "Compte désactivé avec succès", "success");
    } catch (err: any) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: previous } : u)));
      notify(
        err?.response?.data?.message ?? "Échec de la mise à jour du statut du compte.",
        "error"
      );
    } finally {
      setTogglingIds((s) => {
        const copy = new Set(s);
        copy.delete(user.id);
        return copy;
      });
    }
  }

  function resetCreateForm() {
    setNom("");
    setPrenom("");
    setEmail("");
    setTelephone("");
    setCreateError(null);
  }

  function openCreateForm() {
    resetCreateForm();
    setShowCreateForm(true);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    resetCreateForm();
  }

  async function handleCreateExpert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;

    if (!nom.trim() || !prenom.trim() || !email.trim()) {
      setCreateError("Merci de renseigner le nom, le prénom et l'e-mail.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setCreateError("Adresse e-mail invalide.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const fullName = `${prenom.trim()} ${nom.trim()}`;
      const res = await createExpertUser({ name: fullName, email: email.trim() });

      setShowCreateForm(false);
      resetCreateForm();
      await loadUsers();

      setCreationResult(
        res.email_sent
          ? {
              variant: "success",
              message: `Compte Expert créé avec succès. Les identifiants ont été envoyés par e-mail à ${res.user.email}.`,
            }
          : {
              variant: "warning",
              message: `Compte Expert créé, mais l'envoi de l'e-mail a échoué. Merci de communiquer les identifiants manuellement à ${res.user.email}.`,
            }
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? "Erreur lors de la création du compte Expert.";
      setCreateError(msg);
    } finally {
      setCreating(false);
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

  function roleBadgeClass(role: string) {
    if (role === "admin") {
      return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-400";
    }
    if (role === "expert") {
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400";
    }
    return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400";
  }

  return (
    <>
      <PageMeta title="Gestion des utilisateurs | Elastic Solutions Admin" description="" />
      <PageBreadcrumb pageTitle="Utilisateurs" />

      {creationResult && (
        <div
          className={`mb-4 flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm ${
            creationResult.variant === "success"
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
          }`}
        >
          <span>{creationResult.message}</span>
          <button
            onClick={() => setCreationResult(null)}
            className="shrink-0 text-xs font-medium underline"
          >
            Fermer
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Liste des utilisateurs
          </h2>
          <div className="flex items-center gap-3">
            {!loading && !error && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {users.length} utilisateur{users.length !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={openCreateForm}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              + Créer un compte Expert
            </button>
          </div>
        </div>

        {/* ── Filtres avancés (le terme de recherche vient de la barre du header) ── */}
        <div className="mb-5 rounded-xl border border-[rgba(27,67,50,0.12)] bg-[#f7faf7] p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
          {searchFromUrl && (
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Recherche header active :{" "}
              <span className="font-semibold text-[#1b4332] dark:text-[#b7e4c7]">
                « {searchFromUrl} »
              </span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              Rôle
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={`${filterFieldClass} min-w-[150px]`}
              >
                <option value="">Tous</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              Statut
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`${filterFieldClass} min-w-[150px]`}
              >
                <option value="">Tous</option>
                <option value="1">Actif</option>
                <option value="0">Inactif</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              Gouvernorat
              <select
                value={govFilter}
                onChange={(e) => setGovFilter(e.target.value)}
                className={`${filterFieldClass} min-w-[150px]`}
              >
                <option value="">Tous</option>
                {GOVERNORATE_NAMES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 rounded-[20px] bg-[rgba(64,145,108,0.12)] px-3 py-1 text-xs font-bold text-[#1b4332] dark:bg-[#40916c]/20 dark:text-[#b7e4c7]">
              {users.length} utilisateur{users.length !== 1 ? "s" : ""} trouvé
              {users.length !== 1 ? "s" : ""}
              {searching && (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4Z" />
                </svg>
              )}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-[#40916c] underline underline-offset-2 transition hover:text-[#2d6a4f]"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
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
            {searchFromUrl
              ? `Aucun utilisateur trouvé pour « ${searchFromUrl} ».`
              : hasActiveFilters
              ? "Aucun utilisateur ne correspond aux filtres sélectionnés."
              : "Aucun utilisateur trouvé."}
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
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {user.id}
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                        {highlight(user.name, searchFromUrl)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {highlight(user.email, searchFromUrl)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${roleBadgeClass(
                            currentRole
                          )}`}
                        >
                          {labelOf(ROLE_LABELS, currentRole)}
                        </span>
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
                        {currentRole === "admin" ? (
                          // Les comptes admin sont figés : statut en lecture seule.
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              user.is_active
                                ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                            }`}
                          >
                            {user.is_active ? "Actif" : "Inactif"}
                          </span>
                        ) : (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={user.is_active}
                            aria-label={user.is_active ? "Désactiver le compte" : "Activer le compte"}
                            title={user.is_active ? "Désactiver le compte" : "Activer le compte"}
                            disabled={togglingIds.has(user.id)}
                            onClick={() => handleToggleStatus(user)}
                            className="inline-flex items-center gap-2 disabled:cursor-wait disabled:opacity-60"
                          >
                            <span
                              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                                user.is_active ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                  user.is_active ? "translate-x-[18px]" : "translate-x-0.5"
                                }`}
                              />
                            </span>
                            <span
                              className={`text-xs font-medium ${
                                user.is_active
                                  ? "text-green-700 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {user.is_active ? "Actif" : "Inactif"}
                            </span>
                          </button>
                        )}
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

      {showCreateForm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
              Créer un compte Expert
            </h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Les identifiants (mot de passe temporaire) seront générés et envoyés par e-mail.
            </p>

            {createError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateExpert} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Téléphone (optionnel)
                </label>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rôle
                </label>
                <input
                  type="text"
                  value="Expert"
                  disabled
                  className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  disabled={creating}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
                >
                  {creating ? "Création…" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[99999] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.kind === "success" ? "bg-success-500" : "bg-error-500"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
