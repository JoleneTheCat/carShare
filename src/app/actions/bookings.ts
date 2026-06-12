"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/session";

interface ConflictInfo {
  name: string;
  start: string;
  end: string;
}

interface SaveBookingResult {
  error?: string;
  requiresConfirmation?: boolean;
  conflicts?: ConflictInfo[];
  success?: boolean;
}

export async function saveBooking(formData: FormData): Promise<SaveBookingResult> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { error: "You must be signed in." };
  }

  const bookingId = (formData.get("bookingId") as string) || null;
  const startDateStr = formData.get("startDate") as string;
  const startTime = formData.get("startTime") as string;
  const endDateStr = formData.get("endDate") as string;
  const endTime = formData.get("endTime") as string;
  const confirmOverwrite = formData.get("confirmOverwrite") === "true";
  let forUserId = formData.get("forUserId") as string;

  if (sessionUser.role !== "admin") {
    forUserId = sessionUser.id;
  }

  if (!startDateStr || !startTime || !endDateStr || !endTime || !forUserId) {
    return { error: "Please fill in all fields." };
  }

  const startDate = new Date(`${startDateStr}T${startTime}:00`);
  const endDate = new Date(`${endDateStr}T${endTime}:00`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { error: "Invalid date or time." };
  }

  if (endDate.getTime() <= startDate.getTime()) {
    return { error: "End time must be after start time." };
  }

  if (startDate.getTime() < Date.now()) {
    return { error: "You can't book a time slot in the past." };
  }

  const supabase = createServiceClient();

  let conflictQuery = supabase
    .from("bookings")
    .select("id, user_id, start_time, end_time")
    .lt("start_time", endDate.toISOString())
    .gt("end_time", startDate.toISOString());

  if (bookingId) {
    conflictQuery = conflictQuery.neq("id", bookingId);
  }

  const { data: conflicts, error: conflictError } = await conflictQuery;
  if (conflictError) {
    return { error: "Something went wrong. Please try again." };
  }

  if (conflicts && conflicts.length > 0) {
    if (sessionUser.role !== "admin") {
      return { error: "This time overlaps with an existing booking." };
    }

    if (!confirmOverwrite) {
      const { data: profiles } = await supabase.from("user_profiles").select("id, name");
      const namesById = new Map((profiles ?? []).map((u) => [u.id, u.name as string]));

      return {
        requiresConfirmation: true,
        conflicts: conflicts.map((c) => ({
          name: namesById.get(c.user_id) ?? "Someone",
          start: c.start_time,
          end: c.end_time,
        })),
      };
    }
  }

  const { error: saveError } = await supabase.rpc("save_booking", {
    p_booking_id: bookingId,
    p_user_id: forUserId,
    p_start: startDate.toISOString(),
    p_end: endDate.toISOString(),
    p_allow_overwrite: sessionUser.role === "admin" && confirmOverwrite,
  });

  if (saveError) {
    return { error: "Could not save booking. It may overlap with another booking." };
  }

  return { success: true };
}

export async function deleteBooking(bookingId: string): Promise<SaveBookingResult> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { error: "You must be signed in." };
  }

  const supabase = createServiceClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("user_id")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { error: "Booking not found." };
  }

  if (sessionUser.role !== "admin" && booking.user_id !== sessionUser.id) {
    return { error: "You can only delete your own bookings." };
  }

  const { error: deleteError } = await supabase.from("bookings").delete().eq("id", bookingId);
  if (deleteError) {
    return { error: "Could not delete booking." };
  }

  return { success: true };
}
