import { useState } from "react";
import type { NotificationPreferences } from "../../services/authService";
import { updateNotificationPreferences } from "../../services/profileService";
import { getApiErrorMessage } from "./apiError";
import { NOTIFICATION_LABELS } from "./constants";
import { Card, Toggle } from "./parts";
import { useProfileToast } from "./Toast";

export default function NotificationPreferencesCard({
  preferences,
  onChange,
}: {
  preferences: NotificationPreferences;
  onChange: (next: NotificationPreferences) => void;
}) {
  const toast = useProfileToast();
  const [open, setOpen] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const toggle = async (key: string, value: boolean) => {
    const next = { ...preferences, [key]: value } as NotificationPreferences;
    onChange(next); // maj optimiste
    setPendingKey(key);
    try {
      const saved = await updateNotificationPreferences(next);
      onChange(saved);
      toast.success("Préférences sauvegardées");
    } catch (err) {
      onChange(preferences); // rollback
      toast.error(getApiErrorMessage(err, "Échec de la sauvegarde des préférences."));
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <Card
      title={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-white/90"
        >
          Préférences de notifications
          <span className="text-gray-400">{open ? "▾" : "▸"}</span>
        </button>
      }
    >
      {open && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {NOTIFICATION_LABELS.map(({ key, label }) => (
            <li key={key} className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
              <Toggle
                ariaLabel={label}
                checked={Boolean(preferences[key as keyof NotificationPreferences])}
                disabled={pendingKey !== null}
                onChange={(v) => toggle(key, v)}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
