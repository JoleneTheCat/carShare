import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabase/client";
import Header from "@/components/Header";
import AgendaView from "./AgendaView";
import type { UserProfile } from "@/lib/types";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { data: users } = await supabase
    .from("user_profiles")
    .select("*")
    .order("name");

  const userProfiles = (users as UserProfile[]) ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user} users={userProfiles} />
      <AgendaView currentUser={user} users={userProfiles} />
    </div>
  );
}
