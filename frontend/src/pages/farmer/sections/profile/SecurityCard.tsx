import { useTranslation } from "react-i18next";
import type { User } from "../../../../services/authService";
import { dateTime } from "./format";
import styles from "./profile.module.css";

export default function SecurityCard({
  user,
  onChangePassword,
}: {
  user: User;
  onChangePassword: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardTitle}>🔒 {t("profile.security.title")}</div>
      </div>

      <div className={styles.prefList}>
        <div className={styles.prefRow}>
          <div>
            <div className={styles.prefLabel}>{t("profile.security.password")}</div>
            <div className={styles.mutedValue} style={{ letterSpacing: 3 }}>
              ••••••••••
            </div>
          </div>
          <button type="button" className={styles.btn} onClick={onChangePassword}>
            {t("common.edit")}
          </button>
        </div>

        <div className={styles.prefRow}>
          <div>
            <div className={styles.prefLabel}>{t("profile.security.email")}</div>
            <div className={styles.mutedValue}>{user.email}</div>
          </div>
        </div>

        <div className={styles.prefRow}>
          <span className={styles.prefLabel}>{t("profile.security.lastLogin")}</span>
          <span className={styles.infoValue}>
            {user.last_login_at ? dateTime(user.last_login_at) : t("profile.security.never")}
          </span>
        </div>

        <div className={styles.prefRow}>
          <span className={styles.prefLabel}>{t("profile.security.activeSessions")}</span>
          <span className={styles.infoValue}>{t("profile.security.currentSessionOnly")}</span>
        </div>
      </div>
    </div>
  );
}
