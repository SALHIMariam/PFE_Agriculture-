import { useState } from "react";
import { Link } from "react-router";
import api from "../../api/client";
import styles from "./PasswordResetPages.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (loading || !email.trim()) return;
    setError("");
    setLoading(true);
    try {
      await api.get("/sanctum/csrf-cookie");
      await api.post("/api/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Une erreur est survenue.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className={styles.screen}>
        <div className={styles.successBox}>
          <div className={styles.successIcon}>✉️</div>
          <h2>Email envoyé !</h2>
          <p>
            Un lien de réinitialisation a été envoyé à <strong>{email.trim()}</strong>.
            Vérifiez votre boîte de réception (et vos spams).
          </p>
          <Link to="/agrinova-login">← Retour à la connexion</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.container}>
        <img className={styles.logo} src="/logo-elastic-solutions.png" alt="Elastic Solutions" />
        <p className={styles.secureAccess}>Mot de passe oublié</p>

        <h2 className={styles.title}>Réinitialiser votre mot de passe</h2>
        <p className={styles.subtitle}>
          Entrez votre adresse email et nous vous enverrons un lien pour créer un
          nouveau mot de passe.
        </p>

        <label className={styles.fieldLabel} htmlFor="fp-email">
          Adresse email
        </label>
        <input
          id="fp-email"
          className={styles.input}
          type="email"
          placeholder="votre@email.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.submitBtn}
          onClick={submit}
          disabled={loading || !email.trim()}
        >
          {loading ? "Envoi en cours…" : "Envoyer le lien →"}
        </button>

        <Link to="/agrinova-login" className={styles.backLink}>
          ← Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
