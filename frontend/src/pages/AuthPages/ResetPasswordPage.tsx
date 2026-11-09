import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import api from "../../api/client";
import styles from "./PasswordResetPages.module.css";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const missingParams = !token || !email;

  const submit = async () => {
    if (loading) return;
    setError("");

    if (missingParams) {
      setError("Lien invalide : jeton ou email manquant.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmation) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await api.get("/sanctum/csrf-cookie");
      await api.post("/api/reset-password", {
        token,
        email,
        password,
        password_confirmation: confirmation,
      });
      navigate("/agrinova-login?reset=success", { replace: true });
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Lien invalide ou expiré.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.screen}>
      <div className={styles.container}>
        <img className={styles.logo} src="/logo-elastic-solutions.png" alt="Elastic Solutions" />
        <p className={styles.secureAccess}>Nouveau mot de passe</p>

        <h2 className={styles.title}>Créer un nouveau mot de passe</h2>
        {email && (
          <p className={styles.subtitle}>
            Pour le compte <strong>{email}</strong>.
          </p>
        )}

        <label className={styles.fieldLabel} htmlFor="rp-password">
          Nouveau mot de passe
        </label>
        <input
          id="rp-password"
          className={styles.input}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label className={styles.fieldLabel} htmlFor="rp-confirm">
          Confirmer le mot de passe
        </label>
        <input
          id="rp-confirm"
          className={styles.input}
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submitBtn} onClick={submit} disabled={loading}>
          {loading ? "Modification en cours…" : "Modifier le mot de passe →"}
        </button>

        <Link to="/agrinova-login" className={styles.backLink}>
          ← Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
