import { cookies } from "next/headers";
import type { UserProfile } from "@/lib/types";

export const SESSION_COOKIE = "car_share_user";

export async function getSessionUser(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}
