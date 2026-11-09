import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import {
  createMeeting,
  getExperts,
  type ExpertOption,
} from "../../services/meetingService";

const selectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

type Notify = (message: string, kind: "success" | "error") => void;

/** Valeur par défaut pour l'input datetime-local : dans une heure, arrondi à 5 min. */
function defaultScheduledAt(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ScheduleMeetingModal({
  onClose,
  onCreated,
  notify,
  googleConnected,
}: {
  onClose: () => void;
  onCreated: () => void;
  notify: Notify;
  googleConnected: boolean;
}) {
  const [experts, setExperts] = useState<ExpertOption[]>([]);
  const [loadingExperts, setLoadingExperts] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [selectedExpertIds, setSelectedExpertIds] = useState<Set<number>>(new Set());
  const [sendNow, setSendNow] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getExperts()
      .then((res) => {
        if (!cancelled) setExperts(res);
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger la liste des experts.");
      })
      .finally(() => {
        if (!cancelled) setLoadingExperts(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleExpert(id: number) {
    setSelectedExpertIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    setError(null);

    if (!title.trim()) {
      setError("Le titre est obligatoire.");
      return;
    }
    if (!scheduledAt) {
      setError("La date et l'heure sont obligatoires.");
      return;
    }
    if (selectedExpertIds.size === 0) {
      setError("Sélectionnez au moins un expert à inviter.");
      return;
    }

    setBusy(true);
    try {
      await createMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        meet_link: meetLink.trim() || undefined,
        scheduled_at: scheduledAt.replace("T", " "),
        duration_minutes: durationMinutes,
        expert_ids: Array.from(selectedExpertIds),
        send_now: sendNow,
      });
      notify("Meeting planifié avec succès.", "success");
      onCreated();
      onClose();
    } catch {
      setError("Impossible de planifier le meeting. Vérifiez les champs et réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="m-4 max-w-[600px]">
      <div className="w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
        <h4 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          📹 Planifier un Meet
        </h4>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Invitez des experts à une visioconférence Google Meet.
        </p>

        <div className="custom-scrollbar max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="meeting-title">Titre</Label>
              <Input
                id="meeting-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Réunion experts - revue hebdo"
              />
            </div>

            <div>
              <Label htmlFor="meeting-description">Description (optionnel)</Label>
              <textarea
                id="meeting-description"
                rows={3}
                className={`${selectClass} h-auto`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="meeting-link">Lien visioconférence</Label>

              {googleConnected ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400">
                  ✅ Un vrai lien Google Meet sera généré automatiquement
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                  ⚠️ Google non connecté — un lien Jitsi Meet sera utilisé
                </div>
              )}

              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                  Utiliser un lien personnalisé (optionnel)
                </summary>
                <div className="mt-2">
                  <Input
                    id="meeting-link"
                    value={meetLink}
                    onChange={(e) => setMeetLink(e.target.value)}
                    placeholder="https://meet.google.com/xxx ou https://zoom.us/j/..."
                  />
                </div>
              </details>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="meeting-scheduled-at">Date et heure</Label>
                <Input
                  type="datetime-local"
                  id="meeting-scheduled-at"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="meeting-duration">Durée</Label>
                <select
                  id="meeting-duration"
                  className={selectClass}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Experts à inviter</Label>
              {loadingExperts ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
              ) : experts.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Aucun expert disponible.</p>
              ) : (
                <div className="custom-scrollbar max-h-[160px] overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                  {experts.map((expert) => (
                    <label
                      key={expert.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedExpertIds.has(expert.id)}
                        onChange={() => toggleExpert(expert.id)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <span>
                        {expert.name} <span className="text-gray-400">· {expert.email}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={sendNow}
                onChange={(e) => setSendNow(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              Envoyer les invitations maintenant
            </label>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button size="sm" disabled={busy} onClick={submit}>
            {busy ? "Planification…" : "Planifier"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
