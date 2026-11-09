import { useEffect, useRef, useState } from "react";
import { uploadAvatar } from "../../services/profileService";
import { getApiErrorMessage } from "./apiError";
import { initialsOf } from "./constants";
import { useProfileToast } from "./Toast";

const MAX_BYTES = 2 * 1024 * 1024; // doit rester aligné sur la règle backend `max:2048`

export default function AvatarUploader({
  avatarUrl,
  fullName,
  onUploaded,
}: {
  avatarUrl: string | null;
  fullName: string;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useProfileToast();

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const pick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Le fichier doit être une image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("L'image ne doit pas dépasser 2 Mo.");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setBusy(true);
    try {
      const url = await uploadAvatar(file);
      onUploaded(url);
      toast.success("Photo de profil mise à jour");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Échec de l'envoi de la photo."));
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const shown = preview ?? avatarUrl;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={pick}
        disabled={busy}
        className="group relative h-20 w-20 overflow-hidden rounded-full border border-gray-200 bg-brand-50 dark:border-gray-800 dark:bg-brand-500/10"
        aria-label="Changer la photo de profil"
      >
        {shown ? (
          <img src={shown} alt={fullName} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-brand-500">
            {initialsOf(fullName)}
          </span>
        )}
        <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-[11px] font-medium text-white group-hover:flex">
          {busy ? "…" : "Modifier"}
        </span>
      </button>

      <button
        type="button"
        onClick={pick}
        disabled={busy}
        className="text-xs font-medium text-brand-500 hover:text-brand-600 disabled:opacity-50"
      >
        {busy ? "Envoi…" : shown ? "Changer la photo" : "Ajouter une photo"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}
