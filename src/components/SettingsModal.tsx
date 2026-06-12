"use client";

import { useState, useTransition, type FormEvent } from "react";
import { X } from "lucide-react";
import { changePasscode } from "@/app/actions/auth";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Settings</h2>
          <button onClick={onClose} aria-label="Close" className="text-zinc-400 hover:text-zinc-600">
            <X size={20} />
          </button>
        </div>

        <ChangePinForm />
      </div>
    </div>
  );
}

function ChangePinForm() {
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!/^\d{4}$/.test(newPasscode)) {
      setError("New PIN must be exactly 4 digits.");
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setError("New PINs don't match.");
      return;
    }

    const formData = new FormData();
    formData.set("currentPasscode", currentPasscode);
    formData.set("newPasscode", newPasscode);

    startTransition(async () => {
      const result = await changePasscode(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setCurrentPasscode("");
      setNewPasscode("");
      setConfirmPasscode("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="currentPasscode" className="text-sm font-medium text-zinc-700">
          Current PIN
        </label>
        <input
          id="currentPasscode"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          required
          placeholder="••••"
          value={currentPasscode}
          onChange={(e) => setCurrentPasscode(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base tracking-widest text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPasscode" className="text-sm font-medium text-zinc-700">
          New PIN
        </label>
        <input
          id="newPasscode"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          required
          placeholder="••••"
          value={newPasscode}
          onChange={(e) => setNewPasscode(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base tracking-widest text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPasscode" className="text-sm font-medium text-zinc-700">
          Confirm new PIN
        </label>
        <input
          id="confirmPasscode"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          required
          placeholder="••••"
          value={confirmPasscode}
          onChange={(e) => setConfirmPasscode(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base tracking-widest text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">PIN updated successfully.</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Update PIN"}
      </button>
    </form>
  );
}
