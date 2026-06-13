"use client";

import { useState, useTransition, type FormEvent } from "react";
import { format } from "date-fns";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { deleteBooking, saveBooking } from "@/app/actions/bookings";
import type { BookingWithUser, UserProfile } from "@/lib/types";

interface ConflictInfo {
  name: string;
  start: string;
  end: string;
}

function formatDuration(ms: number) {
  const totalMinutes = Math.round(ms / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  return parts.join(" ") || "0m";
}

interface BookingModalProps {
  currentUser: UserProfile;
  users: UserProfile[];
  booking?: BookingWithUser;
  initialStart?: Date;
  onClose: () => void;
  onSaved: () => void;
}

export default function BookingModal({
  currentUser,
  users,
  booking,
  initialStart,
  onClose,
  onSaved,
}: BookingModalProps) {
  const canEdit = currentUser.role === "admin" || !booking || booking.user_id === currentUser.id;

  const startReference = booking ? new Date(booking.start_time) : initialStart ?? new Date();
  const endReference = booking
    ? new Date(booking.end_time)
    : new Date(startReference.getTime() + 60 * 60 * 1000);

  const [forUserId, setForUserId] = useState(booking?.user_id ?? currentUser.id);
  const [startDate, setStartDate] = useState(() => format(startReference, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(() => format(startReference, "HH:mm"));
  const [endDate, setEndDate] = useState(() => format(endReference, "yyyy-MM-dd"));
  const [endTime, setEndTime] = useState(() => format(endReference, "HH:mm"));

  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictInfo[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const durationMs =
    new Date(`${endDate}T${endTime}:00`).getTime() - new Date(`${startDate}T${startTime}:00`).getTime();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Resolve the picker's local date/time fields to absolute instants here,
    // in the browser's own timezone, before they cross the wire. The server
    // must not re-parse "YYYY-MM-DDTHH:mm" itself - Date() would then parse
    // it in the server's timezone, shifting the stored time.
    const startInstant = new Date(`${startDate}T${startTime}:00`);
    const endInstant = new Date(`${endDate}T${endTime}:00`);

    const formData = new FormData();
    if (booking) formData.set("bookingId", booking.id);
    formData.set("forUserId", forUserId);
    formData.set("start", startInstant.toISOString());
    formData.set("end", endInstant.toISOString());
    formData.set("confirmOverwrite", confirming ? "true" : "false");

    startTransition(async () => {
      const result = await saveBooking(formData);

      if (result.error) {
        setError(result.error);
        setConflicts(null);
        setConfirming(false);
        return;
      }

      if (result.requiresConfirmation) {
        setConflicts(result.conflicts ?? []);
        setConfirming(true);
        return;
      }

      onSaved();
      onClose();
    });
  }

  function handleDelete() {
    if (!booking) return;

    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteBooking(booking.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
      onClose();
    });
  }

  const forUser = users.find((u) => u.id === forUserId) ?? currentUser;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            {booking ? (canEdit ? "Edit Booking" : "Booking Details") : "New Booking"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-400 hover:text-zinc-600"
          >
            <X size={20} />
          </button>
        </div>

        {!canEdit ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: forUser.color }}
              />
              Booked by {forUser.name}
            </div>
            <p className="text-sm text-zinc-600">
              {format(startReference, "EEEE, MMM d")}
              <br />
              {format(startReference, "HH:mm")} – {format(endReference, "HH:mm")}
            </p>
            <button
              onClick={onClose}
              className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {currentUser.role === "admin" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="forUserId" className="text-sm font-medium text-zinc-700">
                  Booking for
                </label>
                <select
                  id="forUserId"
                  value={forUserId}
                  onChange={(e) => {
                    setForUserId(e.target.value);
                    setConflicts(null);
                    setConfirming(false);
                  }}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor="startDate" className="text-sm font-medium text-zinc-700">
                  Start date
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const value = e.target.value;
                    setStartDate(value);
                    if (endDate < value) setEndDate(value);
                    setConflicts(null);
                    setConfirming(false);
                  }}
                  required
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor="startTime" className="text-sm font-medium text-zinc-700">
                  Start time
                </label>
                <input
                  id="startTime"
                  type="time"
                  step={60}
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setConflicts(null);
                    setConfirming(false);
                  }}
                  required
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor="endDate" className="text-sm font-medium text-zinc-700">
                  End date
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setConflicts(null);
                    setConfirming(false);
                  }}
                  required
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor="endTime" className="text-sm font-medium text-zinc-700">
                  End time
                </label>
                <input
                  id="endTime"
                  type="time"
                  step={60}
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setConflicts(null);
                    setConfirming(false);
                  }}
                  required
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                />
              </div>
            </div>

            {durationMs > 0 ? (
              <p className="text-xs text-zinc-500">Duration: {formatDuration(durationMs)}</p>
            ) : (
              <p className="text-xs text-red-600">End must be after start.</p>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            {conflicts && conflicts.length > 0 && (
              <div className="flex flex-col gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle size={16} />
                  This will delete the following booking(s):
                </div>
                <ul className="list-inside list-disc">
                  {conflicts.map((c, i) => (
                    <li key={i}>
                      {c.name}: {format(new Date(c.start), "MMM d, HH:mm")} –{" "}
                      {format(new Date(c.end), "HH:mm")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              {booking && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                    deleteConfirm
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-red-50 text-red-600 hover:bg-red-100"
                  }`}
                >
                  <Trash2 size={16} />
                  {deleteConfirm ? "Confirm delete" : "Delete"}
                </button>
              )}
              <button
                type="submit"
                disabled={isPending || durationMs <= 0}
                className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
              >
                {isPending
                  ? "Saving..."
                  : conflicts && conflicts.length > 0
                    ? "Overwrite & Save"
                    : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
