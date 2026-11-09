import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { changePassword } from "../../../../services/profileService";
import { apiErrorMessage } from "./apiError";
import { Modal, useToast } from "./ui";
import styles from "./profile.module.css";

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { notify } = useToast();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentRef = useRef<HTMLInputElement>(null);

  // Le navigateur pré-remplit le champ "mot de passe actuel" via l'autofill
  // APRÈS le premier render. On force le champ vide juste après le montage.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentRef.current) currentRef.current.value = "";
      setCurrent("");
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const submit = async () => {
    setError(null);

    if (!current.trim()) {
      setError("Veuillez saisir votre mot de passe actuel.");
      return;
    }
    if (next.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (next !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (next === current) {
      setError("Le nouveau mot de passe doit être différent de l'actuel.");
      return;
    }

    setSaving(true);
    try {
      await changePassword({
        current_password: current,
        password: next,
        password_confirmation: confirm,
      });
      notify("Mot de passe modifié avec succès ✓");
      onClose();
    } catch (e: unknown) {
      setError(apiErrorMessage(e, "Mot de passe actuel incorrect."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={t("profile.security.changePassword")} onClose={onClose}>
      {/* Honeypot — absorbe l'autocomplétion du navigateur, laisse les vrais champs vides. */}
      <input
        type="password"
        style={{ display: "none" }}
        autoComplete="current-password"
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t("profile.security.currentPassword")}</span>
        <input
          ref={currentRef}
          className={styles.input}
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="new-password"
          name="agridetect_current_pwd"
          placeholder="••••••••"
        />
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t("profile.security.newPassword")}</span>
        <input
          className={styles.input}
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          name="agridetect_new_pwd"
          placeholder="Minimum 8 caractères"
        />
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t("profile.security.confirmPassword")}</span>
        <input
          className={styles.input}
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          name="agridetect_confirm_pwd"
          placeholder="Répéter le nouveau mot de passe"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </div>

      {error && (
        <p className={styles.fieldHint} style={{ color: "#c2410c", marginTop: 4 }}>
          ⚠ {error}
        </p>
      )}

      <div className={styles.formActions}>
        <button type="button" className={styles.btn} onClick={onClose} disabled={saving}>
          {t("common.cancel")}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={submit}
          disabled={saving || !current || !next || !confirm}
        >
          {saving ? t("common.loading") : t("common.save")}
        </button>
      </div>
    </Modal>
  );
}
