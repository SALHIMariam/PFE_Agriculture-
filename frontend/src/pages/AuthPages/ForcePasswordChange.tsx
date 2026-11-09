import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import * as authService from "../../services/authService";

export default function ForcePasswordChange() {
  const { clearMustChangePassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum = /[0-9]/.test(password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError("");

    if (!hasMinLength || !hasUpper || !hasNum) {
      setError("Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    try {
      const updatedUser = await authService.forcePasswordChange(password, passwordConfirmation);
      clearMustChangePassword();
      const roles = Array.isArray(updatedUser?.roles) ? updatedUser.roles : [];
      if (roles.includes("admin") || roles.includes("expert")) {
        navigate("/dashboard", { replace: true });
      } else if (roles.includes("farmer")) {
        navigate("/farmer/dashboard", { replace: true });
      } else {
        navigate("/landing", { replace: true });
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Une erreur est survenue. Merci de réessayer.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        <h1 className="mb-1 text-xl font-semibold text-gray-800 dark:text-white/90">
          Changement de mot de passe requis
        </h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Pour des raisons de sécurité, vous devez définir un nouveau mot de passe avant de continuer.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              autoComplete="new-password"
              required
            />
            {password.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                <li className={hasMinLength ? "text-green-600 dark:text-green-400" : "text-gray-400"}>
                  {hasMinLength ? "✓" : "○"} Au moins 8 caractères
                </li>
                <li className={hasUpper ? "text-green-600 dark:text-green-400" : "text-gray-400"}>
                  {hasUpper ? "✓" : "○"} Au moins une majuscule
                </li>
                <li className={hasNum ? "text-green-600 dark:text-green-400" : "text-gray-400"}>
                  {hasNum ? "✓" : "○"} Au moins un chiffre
                </li>
              </ul>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {submitting ? "Mise à jour…" : "Valider le nouveau mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}
