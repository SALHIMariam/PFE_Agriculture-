import { useState } from "react";
import { addNote } from "../../services/calendarService";
import { NOTE_COLOR_PRESETS } from "./calendarConstants";

type Notify = (message: string, kind: "success" | "error") => void;

function errorMessage(err: unknown): string {
  const e = err as {
    response?: { data?: { message?: string; errors?: Record<string, string[]> } };
  };
  const first = e?.response?.data?.errors
    ? Object.values(e.response.data.errors)[0]?.[0]
    : undefined;
  return first ?? e?.response?.data?.message ?? "Impossible d'ajouter la note.";
}

export default function AddNoteForm({
  date,
  onNoteAdded,
  notify,
}: {
  date: string;
  onNoteAdded: () => void;
  notify: Notify;
}) {
  const [content, setContent] = useState("");
  const [color, setColor] = useState(NOTE_COLOR_PRESETS[0].value);
  const [busy, setBusy] = useState(false);

  const canSubmit = content.trim().length >= 3 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await addNote({ date, content: content.trim(), color });
      setContent("");
      setColor(NOTE_COLOR_PRESETS[0].value);
      notify("Note ajoutée", "success");
      onNoteAdded();
    } catch (err) {
      notify(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
      <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
        📝 Ajouter une note
      </p>

      <textarea
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={500}
        placeholder="Rappel, consigne, point de suivi…"
        className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      />

      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">Couleur :</span>
        {NOTE_COLOR_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            title={preset.label}
            onClick={() => setColor(preset.value)}
            className={`h-6 w-6 rounded-full border-2 transition ${
              color === preset.value
                ? "border-gray-800 dark:border-white"
                : "border-transparent"
            }`}
            style={{ backgroundColor: preset.value }}
          />
        ))}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setContent("")}
          disabled={busy || content === ""}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {busy ? "Ajout…" : "Ajouter la note"}
        </button>
      </div>
    </div>
  );
}
