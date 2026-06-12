"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, endOfDay, format, startOfDay, startOfMonth } from "date-fns";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import DateStrip, { DAYS_AFTER, DAYS_BEFORE } from "@/components/DateStrip";
import Timeline from "@/components/Timeline";
import BookingModal from "@/components/BookingModal";
import type { Booking, BookingWithUser, UserProfile } from "@/lib/types";

interface AgendaViewProps {
  currentUser: UserProfile;
  users: UserProfile[];
}

type ModalState =
  | { mode: "create"; initialStart: Date }
  | { mode: "edit"; booking: BookingWithUser }
  | null;

function defaultStartTime(selectedDate: Date) {
  const now = new Date();
  if (startOfDay(now).getTime() !== startOfDay(selectedDate).getTime()) {
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0);
    return start;
  }

  const start = new Date(now);
  start.setSeconds(0, 0);
  const remainder = start.getMinutes() % 15;
  if (remainder !== 0) {
    start.setMinutes(start.getMinutes() + (15 - remainder));
  }
  return start;
}

export default function AgendaView({ currentUser, users }: AgendaViewProps) {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [bookings, setBookings] = useState<BookingWithUser[]>([]);
  const [dayIndicators, setDayIndicators] = useState<Map<string, string[]>>(new Map());
  const [modal, setModal] = useState<ModalState>(null);

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const refreshBookings = useCallback(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

    supabase
      .from("bookings")
      .select("*")
      .lt("start_time", dayEnd.toISOString())
      .gt("end_time", dayStart.toISOString())
      .order("start_time")
      .then(({ data, error }) => {
        if (error || !data) {
          setBookings([]);
          return;
        }
        const withUsers = (data as Booking[])
          .map((booking) => {
            const user = usersById.get(booking.user_id);
            return user ? { ...booking, user } : null;
          })
          .filter((b): b is BookingWithUser => b !== null);
        setBookings(withUsers);
      });
  }, [selectedDate, usersById]);

  useEffect(() => {
    refreshBookings();
  }, [refreshBookings]);

  const refreshDayIndicators = useCallback(() => {
    const today = startOfDay(new Date());
    const rangeStart = addDays(today, -DAYS_BEFORE);
    const rangeEnd = addDays(today, DAYS_AFTER + 1);

    supabase
      .from("bookings")
      .select("user_id, start_time, end_time")
      .lt("start_time", rangeEnd.toISOString())
      .gt("end_time", rangeStart.toISOString())
      .then(({ data, error }) => {
        if (error || !data) {
          setDayIndicators(new Map());
          return;
        }

        const map = new Map<string, string[]>();
        for (let day = rangeStart; day < rangeEnd; day = addDays(day, 1)) {
          const dayEnd = addDays(day, 1);
          const colors: string[] = [];
          for (const booking of data as Pick<Booking, "user_id" | "start_time" | "end_time">[]) {
            const start = new Date(booking.start_time);
            const end = new Date(booking.end_time);
            if (start < dayEnd && end > day) {
              const color = usersById.get(booking.user_id)?.color;
              if (color && !colors.includes(color)) colors.push(color);
            }
          }
          if (colors.length) map.set(format(day, "yyyy-MM-dd"), colors);
        }
        setDayIndicators(map);
      });
  }, [usersById]);

  useEffect(() => {
    refreshDayIndicators();
  }, [refreshDayIndicators]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-zinc-200 bg-white px-4 pt-3">
        <h2 className="text-lg font-semibold text-zinc-900">{format(visibleMonth, "MMMM yyyy")}</h2>
      </div>
      <DateStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onVisibleMonthChange={setVisibleMonth}
        dayIndicators={dayIndicators}
      />
      <div className="relative flex-1 overflow-y-auto">
        <Timeline
          date={selectedDate}
          bookings={bookings}
          onEmptySlotClick={(start) => setModal({ mode: "create", initialStart: start })}
          onBookingClick={(booking) => setModal({ mode: "edit", booking })}
        />
      </div>

      <button
        onClick={() => setModal({ mode: "create", initialStart: defaultStartTime(selectedDate) })}
        aria-label="New booking"
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-lg transition-colors hover:bg-zinc-800"
      >
        <Plus size={18} />
        New Booking
      </button>

      {modal && (
        <BookingModal
          currentUser={currentUser}
          users={users}
          booking={modal.mode === "edit" ? modal.booking : undefined}
          initialStart={modal.mode === "create" ? modal.initialStart : undefined}
          onClose={() => setModal(null)}
          onSaved={() => {
            refreshBookings();
            refreshDayIndicators();
          }}
        />
      )}
    </div>
  );
}
