"use client";

import { useState } from "react";
import { Car, LogOut, Settings } from "lucide-react";
import { logout } from "@/app/actions/auth";
import SettingsModal from "@/components/SettingsModal";
import type { UserProfile } from "@/lib/types";

interface HeaderProps {
  user: UserProfile;
}

export default function Header({ user }: HeaderProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-white">
          <Car size={16} />
        </div>
        <span className="font-semibold text-zinc-900">Car Share</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-700">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: user.color }}
          />
          {user.name}
        </span>
        <button
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
          className="text-zinc-400 transition-colors hover:text-zinc-600"
        >
          <Settings size={18} />
        </button>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Sign out"
            className="text-zinc-400 transition-colors hover:text-zinc-600"
          >
            <LogOut size={18} />
          </button>
        </form>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </header>
  );
}
