"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Crown,
  LayoutDashboard,
  LogOut,
  Menu,
  Play,
  X,
} from "lucide-react";
import { ProgressBar, cn } from "@/components/ui";
import type { LineDTO, SessionUser } from "@/lib/types";

const nav = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/repertoire", label: "Репертуар", icon: BookOpen },
  { href: "/train", label: "Тренажёр", icon: Play },
  { href: "/mistakes", label: "Ошибки", icon: AlertTriangle },
];

type Props = {
  user: SessionUser;
  lines: LineDTO[];
  summary: { mastered: number; total: number; accuracy: number; unresolved: number };
};

export function Sidebar({ user, lines, summary }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const studied = [...lines]
    .filter((l) => l.stats.attempts > 0)
    .sort((a, b) => (b.stats.lastTrainedAt ?? "").localeCompare(a.stats.lastTrainedAt ?? ""))
    .slice(0, 7);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const panel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-5">
        <Link href="/dashboard" className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-sm">
            <Crown className="h-5 w-5" strokeWidth={2.2} />
          </span>
          BDG Trainer
        </Link>
        <button className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Закрыть меню">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="mt-6 space-y-1 px-3">
        {nav.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
              {item.href === "/mistakes" && summary.unresolved > 0 && (
                <span className="ml-auto rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] font-semibold text-rose-300">{summary.unresolved}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-7 flex-1 overflow-y-auto px-3 scrollbar-thin">
        <div className="flex items-center justify-between px-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Изученные линии</h3>
          <Link href="/repertoire" className="text-[11px] text-slate-500 hover:text-slate-300">
            все
          </Link>
        </div>
        {studied.length === 0 ? (
          <p className="mt-3 px-3 text-xs leading-relaxed text-slate-500">Пока пусто. Пройдите первую линию в тренажёре — она появится здесь.</p>
        ) : (
          <ul className="mt-2 space-y-0.5">
            {studied.map((l) => {
              const active = pathname === `/repertoire/${l.id}`;
              return (
                <li key={l.id}>
                  <Link href={`/repertoire/${l.id}`} className={cn("block rounded-lg px-3 py-2 transition hover:bg-white/5", active && "bg-white/10")}>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          l.stats.mastery >= 80 ? "bg-emerald-400" : l.stats.mastery >= 40 ? "bg-amber-400" : "bg-rose-400",
                        )}
                      />
                      <span className="truncate text-xs text-slate-300">{l.name}</span>
                      <span className="ml-auto shrink-0 font-mono text-[11px] text-slate-500">{l.stats.mastery}%</span>
                    </div>
                    <ProgressBar value={l.stats.mastery} className="mt-1.5 h-1 bg-white/10" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mx-3 mb-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Освоено</span>
          <span className="font-mono text-slate-200">
            {summary.mastered}/{summary.total}
          </span>
        </div>
        <ProgressBar value={summary.total ? (summary.mastered / summary.total) * 100 : 0} tone="emerald" className="mt-2 bg-white/10" />
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span>Точность</span>
          <span className="font-mono text-slate-200">{summary.accuracy}%</span>
        </div>
      </div>

      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-slate-950">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <button
            onClick={logout}
            disabled={loggingOut}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            title="Выйти"
            aria-label="Выйти"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile app bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-amber-400">
              <Crown className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="truncate text-sm">BDG Trainer</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 min-[380px]:inline">
              {summary.mastered}/{summary.total} освоено
            </span>
            <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-700 transition active:bg-slate-100" aria-label="Открыть меню">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 bg-ink-950 lg:block">{panel}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60 animate-fade-in" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[85vw] max-w-xs bg-ink-950 shadow-2xl animate-rise">{panel}</aside>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Основная навигация"
      >
        <ul className="grid grid-cols-4">
          {nav.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition",
                    active ? "text-slate-900" : "text-slate-500 active:text-slate-800",
                  )}
                >
                  {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-amber-500" />}
                  <span className="relative">
                    <Icon className={cn("h-5 w-5", active && "text-amber-600")} strokeWidth={active ? 2.3 : 1.8} />
                    {item.href === "/mistakes" && summary.unresolved > 0 && (
                      <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {summary.unresolved > 9 ? "9+" : summary.unresolved}
                      </span>
                    )}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
