import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { NotificationPreferences } from "../../../../services/authService";
import { NOTIFICATIONS_REFRESH_EVENT } from "../../../../services/notificationService";
import { NOTIFICATION_CHANNEL_KEYS } from "./options";
import { Toggle, useToast } from "./ui";
import styles from "./profile.module.css";

type PrefKey = keyof NotificationPreferences;

export default function NotificationsCard({
  prefs,
  onPersist,
}: {
  prefs: NotificationPreferences;
  onPersist: (patch: Partial<NotificationPreferences>) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [local, setLocal] = useState<NotificationPreferences>(prefs);
  const [busy, setBusy] = useState<PrefKey | null>(null);

  const set = async (key: PrefKey, value: boolean) => {
    const previous = local[key];
    setLocal((p) => ({ ...p, [key]: value }));
    setBusy(key);
    try {
      await onPersist({ [key]: value });
      notify(t("profile.toast.notifSaved"));
      // The topbar bell filters by these prefs — tell it to reload now.
      window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
    } catch {
      setLocal((p) => ({ ...p, [key]: previous }));
      notify(t("profile.toast.error"), "err");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardTitle}>🔔 {t("profile.notifications.title")}</div>
      </div>
      <p className={styles.cardIntro}>{t("profile.notifications.channelsHint")}</p>

      <div className={styles.prefList}>
        {NOTIFICATION_CHANNEL_KEYS.map((key) => (
          <div key={key} className={styles.prefRow}>
            <span className={styles.prefLabel}>{t(`profile.notifications.channels.${key}`)}</span>
            <Toggle
              checked={local[key]}
              disabled={busy === key}
              onChange={(v) => set(key, v)}
              ariaLabel={t(`profile.notifications.channels.${key}`)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
