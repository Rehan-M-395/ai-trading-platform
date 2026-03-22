"use client";

import { Bell, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StoredUser, clearStoredUser } from "@/lib/auth";

type TopbarProps = {
  user: StoredUser;
};

export function Topbar({ user }: TopbarProps) {
  function handleLogout() {
    clearStoredUser();
    window.location.href = "/";
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-xl p-4 md:flex-row md:items-center md:justify-between md:p-6 transition-all duration-300">

      {/* 🔍 Search Bar */}
      <div className="relative w-full max-w-xl group">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-fuchsia-400 transition" />
        <Input
          className="pl-11 h-11 rounded-xl bg-white/[0.05] border border-white/10 focus:border-fuchsia-400 focus:ring-0 transition-all"
          placeholder="Search stocks, indices, sectors..."
        />
      </div>

      {/* 🔔 Right Section */}
      <div className="flex items-center gap-3 self-end md:self-auto">

        {/* Notification */}
        <button
          className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-all hover:bg-white/[0.1] hover:scale-105 active:scale-95"
        >
          <Bell className="h-4 w-4" />

          {/* Notification Dot */}
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-fuchsia-500"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 hover:bg-white/[0.08] transition-all">

          {/* Avatar */}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 text-fuchsia-300 shadow-inner">
            <UserRound className="h-4 w-4" />
          </div>

          {/* Info */}
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-semibold text-white tracking-tight">
              {user.name}
            </p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          className="px-5 h-11 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:opacity-90 transition-all shadow-md"
        >
          Logout
        </Button>
      </div>
    </div>
  );
}