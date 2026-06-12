"use client";

import { useSyncExternalStore, type MouseEvent } from "react";
import { format, isSameDay, startOfDay } from "date-fns";
import type { BookingWithUser } from "@/lib/types";

const HOUR_HEIGHT = 64; // px per hour
const LABEL_WIDTH = 56; // px
const SNAP_MINUTES = 15;
const CLOCK_INTERVAL_MS = 60_000;

interface TimelineProps {
  date: Date;
  bookings: BookingWithUser[];
  onEmptySlotClick?: (start: Date) => void;
  onBookingClick?: (booking: BookingWithUser) => void;
}

function minutesFromMidnight(iso: string, dayStart: Date, dayEnd: Date) {
  const time = new Date(iso).getTime();
  const clamped = Math.min(Math.max(time, dayStart.getTime()), dayEnd.getTime());
  return (clamped - dayStart.getTime()) / 60000;
}

// Rounds to the current minute so repeated calls within the same render
// return an identical snapshot (required by useSyncExternalStore).
function getClockSnapshot() {
  return Math.floor(Date.now() / CLOCK_INTERVAL_MS) * CLOCK_INTERVAL_MS;
}

// No "current time" during SSR/initial hydration, so the red line is only
// rendered once the client clock snapshot is available.
function getServerClockSnapshot() {
  return null;
}

function subscribeToClock(onChange: () => void) {
  const interval = setInterval(onChange, CLOCK_INTERVAL_MS);
  return () => clearInterval(interval);
}

export default function Timeline({ date, bookings, onEmptySlotClick, onBookingClick }: TimelineProps) {
  const nowTimestamp = useSyncExternalStore(subscribeToClock, getClockSnapshot, getServerClockSnapshot);
  const now = nowTimestamp !== null ? new Date(nowTimestamp) : null;

  const dayStart = startOfDay(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const isToday = now !== null && isSameDay(date, now);
  const nowOffsetMinutes = now !== null ? minutesFromMidnight(now.toISOString(), dayStart, dayEnd) : 0;

  function handleBackgroundClick(e: MouseEvent<HTMLDivElement>) {
    if (!onEmptySlotClick) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const totalMinutes = (offsetY / (24 * HOUR_HEIGHT)) * 24 * 60;

    let snapped = Math.round(totalMinutes / SNAP_MINUTES) * SNAP_MINUTES;
    snapped = Math.min(Math.max(snapped, 0), 24 * 60 - SNAP_MINUTES);

    onEmptySlotClick(new Date(dayStart.getTime() + snapped * 60_000));
  }

  return (
    <div
      className="relative cursor-pointer"
      style={{ height: `${24 * HOUR_HEIGHT}px` }}
      onClick={handleBackgroundClick}
    >
      {Array.from({ length: 24 }, (_, hour) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-zinc-100"
          style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
        >
          <span className="absolute -top-2.5 left-2 bg-zinc-50 px-1 text-[11px] text-zinc-400">
            {String(hour).padStart(2, "0")}:00
          </span>
        </div>
      ))}

      {isToday && (
        <div
          className="absolute right-0 z-20 flex items-center"
          style={{
            top: `${(nowOffsetMinutes / 60) * HOUR_HEIGHT}px`,
            left: `${LABEL_WIDTH}px`,
          }}
        >
          <div className="h-2 w-2 -translate-y-1/2 rounded-full bg-red-500" />
          <div className="h-px flex-1 -translate-y-1/2 bg-red-500" />
        </div>
      )}

      {bookings.map((booking) => {
        const top = minutesFromMidnight(booking.start_time, dayStart, dayEnd);
        const bottom = minutesFromMidnight(booking.end_time, dayStart, dayEnd);
        const height = Math.max(bottom - top, 18);

        return (
          <div
            key={booking.id}
            onClick={(e) => {
              e.stopPropagation();
              onBookingClick?.(booking);
            }}
            className="absolute right-2 z-10 overflow-hidden rounded-lg px-2 py-1 text-xs text-white shadow-sm transition-opacity active:opacity-80"
            style={{
              top: `${(top / 60) * HOUR_HEIGHT}px`,
              height: `${(height / 60) * HOUR_HEIGHT}px`,
              left: `${LABEL_WIDTH + 4}px`,
              backgroundColor: booking.user.color,
            }}
          >
            <p className="truncate font-semibold">{booking.user.name}</p>
            <p className="truncate opacity-90">
              {format(new Date(booking.start_time), "HH:mm")} –{" "}
              {format(new Date(booking.end_time), "HH:mm")}
            </p>
          </div>
        );
      })}
    </div>
  );
}
