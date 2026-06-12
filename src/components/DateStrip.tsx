"use client";

import { useEffect, useRef } from "react";
import { addDays, format, isSameDay, startOfDay, startOfMonth } from "date-fns";

export const DAYS_BEFORE = 7;
export const DAYS_AFTER = 60;

interface DateStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onVisibleMonthChange?: (date: Date) => void;
  dayIndicators?: Map<string, string[]>;
}

export default function DateStrip({ selectedDate, onSelectDate, onVisibleMonthChange, dayIndicators }: DateStripProps) {
  const today = startOfDay(new Date());
  const days = Array.from(
    { length: DAYS_BEFORE + DAYS_AFTER + 1 },
    (_, i) => addDays(today, i - DAYS_BEFORE)
  );

  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selectedDate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frame: number | null = null;

    function updateVisibleMonth() {
      const containerRect = container!.getBoundingClientRect();
      const center = containerRect.left + containerRect.width / 2;

      let closestIndex = 0;
      let closestDistance = Infinity;

      buttonRefs.current.forEach((btn, i) => {
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const btnCenter = rect.left + rect.width / 2;
        const distance = Math.abs(btnCenter - center);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      });

      onVisibleMonthChange?.(startOfMonth(days[closestIndex]));
    }

    function handleScroll() {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        updateVisibleMonth();
        frame = null;
      });
    }

    container.addEventListener("scroll", handleScroll);
    updateVisibleMonth();

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex gap-2 overflow-x-auto border-b border-zinc-200 bg-white px-3 py-3"
    >
      {days.map((day, i) => {
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, today);
        const colors = dayIndicators?.get(format(day, "yyyy-MM-dd"));

        return (
          <button
            key={day.getTime()}
            ref={(el) => {
              buttonRefs.current[i] = el;
              if (isSelected) selectedRef.current = el;
            }}
            onClick={() => onSelectDate(day)}
            className={`flex min-w-12 flex-shrink-0 flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 transition-colors ${
              isSelected
                ? "bg-zinc-900 text-white"
                : isToday
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <span className="text-[11px] font-medium uppercase">
              {format(day, "EEE")}
            </span>
            <span className="text-base font-semibold">{format(day, "d")}</span>
            <div className="flex h-1.5 items-center gap-0.5">
              {colors?.map((color, idx) => (
                <span
                  key={idx}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
