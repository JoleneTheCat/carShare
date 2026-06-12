"use client";

import { useState, useTransition, type FormEvent } from "react";
import { KeyRound, RotateCcw, ShieldCheck, X } from "lucide-react";
import { adminResetPasscode, changePasscode } from "@/app/actions/auth";
import type { UserProfile } from "@/lib/types";

interface SettingsModalProps {
  currentUser: UserProfile;
  users: UserProfile[];
  onClose: () => void;
}

type Tab = "pin" | "admin";

export default function SettingsModal({ currentUser, users, onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>("pin");
  const isAdmin = currentUser.role === "admin";

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

        {isAdmin && (
          <div className="mb-4 flex gap-2 rounded-lg bg-zinc-100 p-1">
            <button
              onClick={() => setTab("pin")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === "pin" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Change PIN
            </button>
            <button
              onClick={() => setTab("admin")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === "admin" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Manage Users
            </button>
          </div>
        )}

        {tab === "pin" ? <ChangePinForm /> : <AdminUsersPanel users={users} />}
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

function AdminUsersPanel({ users }: { users: UserProfile[] }) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleReset(userId: string) {
    if (confirmingId !== userId) {
      setConfirmingId(userId);
      return;
    }

    setConfirmingId(null);
    setResetUserId(userId);
    setMessages((prev) => ({ ...prev, [userId]: "" }));

    const formData = new FormData();
    formData.set("userId", userId);

    startTransition(async () => {
      const result = await adminResetPasscode(formData);
      setResetUserId(null);
      setMessages((prev) => ({
        ...prev,
        [userId]: result.error ?? "PIN reset to 1234.",
      }));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 flex items-center gap-1.5 text-sm text-zinc-500">
        <ShieldCheck size={14} />
        Reset a family member&apos;s PIN back to the default (1234).
      </div>

      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2.5"
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-900">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: user.color }} />
              {user.name}
              {user.role === "admin" && (
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-500">
                  Admin
                </span>
              )}
            </div>
            {messages[user.id] && <p className="text-xs text-zinc-500">{messages[user.id]}</p>}
          </div>

          <button
            onClick={() => handleReset(user.id)}
            disabled={isPending && resetUserId === user.id}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
              confirmingId === user.id
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {confirmingId === user.id ? <KeyRound size={14} /> : <RotateCcw size={14} />}
            {resetUserId === user.id ? "Resetting..." : confirmingId === user.id ? "Confirm reset" : "Reset PIN"}
          </button>
        </div>
      ))}
    </div>
  );
}
