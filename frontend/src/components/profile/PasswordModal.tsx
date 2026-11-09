import { useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { changePassword } from "../../services/profileService";
import { getApiErrorMessage } from "./apiError";
import { useProfileToast } from "./Toast";

export default function PasswordModal({ onClose }: { onClose: () => void }) {
  const toast = useProfileToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);

    if (next.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (next !== confirm) {
      setError("La confirmation ne correspond pas.");
      return;
    }

    setBusy(true);
    try {
      await changePassword({
        current_password: current,
        password: next,
        password_confirmation: confirm,
      });
      toast.success("Mot de passe modifié");
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Impossible de modifier le mot de passe."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} className="m-4 max-w-[480px]">
      <div className="w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
        <h4 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          Changer le mot de passe
        </h4>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Saisissez votre mot de passe actuel puis le nouveau.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="current_password">Mot de passe actuel</Label>
            <Input
              type="password"
              id="current_password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="new_password">Nouveau mot de passe</Label>
            <Input
              type="password"
              id="new_password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              hint="8 caractères minimum"
            />
          </div>
          <div>
            <Label htmlFor="confirm_password">Confirmer le nouveau mot de passe</Label>
            <Input
              type="password"
              id="confirm_password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
              {error}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-3">
            <Button size="sm" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button size="sm" disabled={busy} onClick={submit}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
