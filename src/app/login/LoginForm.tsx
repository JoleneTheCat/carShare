"use client";

import { useActionState } from "react";
import { Car, Lock } from "lucide-react";
import { login } from "@/app/actions/auth";
import type { UserProfile } from "@/lib/types";

interface LoginFormProps {
  users: UserProfile[];
}

interface LoginState {
  error?: string;
}

export default function LoginForm({ users }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState<LoginState | null, FormData>(
    async (_prevState, formData) => {
      const result = await login(formData);
      return result ?? null;
    },
    null
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-[#800020] text-[#800020]">
            <Car size={24} />
          </div>
          <h1 className="text-xl font-semibold text-zinc-900">Car Share</h1>
          <p className="text-sm text-zinc-500">Sign in to view or book the car</p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-zinc-700">
              Who are you?
            </label>
            <select
              id="name"
              name="name"
              required
              defaultValue=""
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            >
              <option value="" disabled>
                Select your name
              </option>
              {users.map((user) => (
                <option key={user.id} value={user.name}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="passcode" className="text-sm font-medium text-zinc-700">
              Passcode
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                id="passcode"
                name="passcode"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                required
                placeholder="••••"
                className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-3 text-base tracking-widest text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              name="rememberMe"
              defaultChecked
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
            />
            Remember me on this device
          </label>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-1 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
