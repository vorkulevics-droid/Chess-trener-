import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MiniBoard } from "@/components/board/MiniBoard";
import { finalFen } from "@/lib/chess";
import { Crown } from "lucide-react";

export const dynamic = "force-dynamic";

const HERO_FEN = finalFen("d4 d5 e4 dxe4 Nc3 Nf6 f3 exf3 Qxf3 Qxd4 Be3 Qb4 O-O-O Bg4 Nb5");

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12 grid-pattern">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <Link href="/" className="relative flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950">
            <Crown className="h-5 w-5" strokeWidth={2.2} />
          </span>
          BDG Trainer
        </Link>
        <div className="relative mx-auto w-full max-w-sm">
          <div className="board-shadow overflow-hidden rounded-2xl ring-1 ring-white/10">
            <MiniBoard fen={HERO_FEN} size={320} highlight={[{ square: "b5", color: "rgba(245,158,11,0.55)" }, { square: "c7", color: "rgba(239,68,68,0.5)" }]} />
          </div>
          <p className="mt-5 text-center font-mono text-sm text-amber-300">8.Nb5!! — ловушка Халосара</p>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-2xl font-semibold leading-tight">«К мату с первого хода!»</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Эмиль Йозеф Димер посвятил этому гамбиту всю жизнь. Запоминайте варианты, отрабатывайте ловушки и доводите точность до автоматизма.
          </p>
        </div>
      </aside>
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-rise">{children}</div>
      </main>
    </div>
  );
}
