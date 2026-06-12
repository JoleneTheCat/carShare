"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionUser, SESSION_COOKIE } from "@/lib/session";
import type { UserProfile } from "@/lib/types";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const DEFAULT_PASSCODE = "1234";

interface PasscodeResult {
  error?: string;
  success?: boolean;
}

export async function login(formData: FormData) {
  const name = formData.get("name");
  const passcode = formData.get("passcode");
  const rememberMe = formData.get("rememberMe") === "on";

  if (typeof name !== "string" || typeof passcode !== "string" || !name || !passcode) {
    return { error: "Please select your name and enter your passcode." };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("verify_login", {
    p_name: name,
    p_passcode: passcode,
  });

  if (error) {
    return { error: "Something went wrong. Please try again." };
  }

  const user = (data as UserProfile[] | null)?.[0];
  if (!user) {
    return { error: "Incorrect name or passcode." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(rememberMe ? { maxAge: ONE_YEAR_SECONDS } : {}),
  });

  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function changePasscode(formData: FormData): Promise<PasscodeResult> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { error: "You must be signed in." };
  }

  const currentPasscode = formData.get("currentPasscode");
  const newPasscode = formData.get("newPasscode");

  if (typeof currentPasscode !== "string" || typeof newPasscode !== "string" || !currentPasscode || !newPasscode) {
    return { error: "Please fill in all fields." };
  }

  if (!/^\d{4}$/.test(newPasscode)) {
    return { error: "New PIN must be exactly 4 digits." };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("change_passcode", {
    p_user_id: sessionUser.id,
    p_current_passcode: currentPasscode,
    p_new_passcode: newPasscode,
  });

  if (error) {
    console.error("changePasscode RPC error:", error);
    return { error: "Something went wrong. Please try again." };
  }

  if (!data) {
    return { error: "Current PIN is incorrect." };
  }

  return { success: true };
}

export async function adminResetPasscode(formData: FormData): Promise<PasscodeResult> {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return { error: "You must be an admin to do this." };
  }

  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) {
    return { error: "Missing user." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("admin_set_passcode", {
    p_user_id: userId,
    p_new_passcode: DEFAULT_PASSCODE,
  });

  if (error) {
    return { error: "Could not reset PIN." };
  }

  return { success: true };
}
