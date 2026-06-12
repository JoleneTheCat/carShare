import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/session";
import LoginForm from "./LoginForm";
import type { UserProfile } from "@/lib/types";

export default async function LoginPage() {
  const sessionUser = await getSessionUser();
  if (sessionUser) {
    redirect("/");
  }

  const { data: users } = await supabase
    .from("user_profiles")
    .select("*")
    .order("name");

  return <LoginForm users={(users as UserProfile[]) ?? []} />;
}
