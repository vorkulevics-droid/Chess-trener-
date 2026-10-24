import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MiniBoard } from "@/components/board/MiniBoard";
import { finalFen } from "@/lib/chess";
import demoLines from "@/data/demo-lines.json";
import { ArrowRight, BookOpen, Crown, Play, Sparkles, Swords, TrendingUp, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

const MAIN_LINE_FEN = finalFen("d4 d5 e4 dxe4 Nc3 Nf6 f3 exf3 Nxf3");

const features = [
  {
    Icon: Swords,
    title: "Режим тренажёра",
    text: "Чёрные делают ход — вы отвечаете. Ошиблись? Поле подсветится красным, а стрелка покажет правильный ход.",
  },
  {
    Icon: Zap,
    title: "Тактические ловушки",
    text: "Ловушка Халосара, жертва Bxh6 в защите Эйве, Qxb7 в защите Тейхмана — отрабатывайте, пока рука сама не потянется к фигуре.",
  },
  {
    Icon: BookOpen,
    title: "Личный репертуар",
    text: "Добавляйте собственные линии, записывая их прямо на доске или вставляя PGN. Редактируйте и удаляйте без ограничений.",
  },
  {
    Icon: TrendingUp,
    title: "Статистика прогресса",
    text: "Освоенность каждой линии, точность, серия тренировок и журнал ошибок с позициями, где вы споткнулись.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const traps = demoLines.filter((l) => l.isTrap).length;

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950">
            <Crown className="h-5 w-5" strokeWidth={2.2} />
          </span>
          BDG Trainer
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10">
            Войти
          </Link>
          <Link href="/register" className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 sm:px-4">
            <span className="hidden sm:inline">Начать бесплатно</span>
            <span className="sm:hidden">Старт</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      <section className="relative overflow-hidden grid-pattern">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-300 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" /> 1.d4 d5 2.e4 dxe4 3.Nc3 Nf6 4.f3
            </span>
            <h1 className="mt-5 text-[2rem] font-semibold leading-[1.08] tracking-tight min-[400px]:text-4xl sm:text-5xl lg:text-6xl">
              Выучите гамбит
              <br />
              <span className="text-amber-400">Блэкмара-Димера</span>
              <br />
              до автоматизма
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-300 sm:mt-6 sm:text-lg">
              Интерактивный тренажёр за белых: теоретические варианты, тактические ловушки и честная статистика точности. Пешка за инициативу — и мат с первого хода.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-2.5 min-[400px]:grid-cols-2 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 sm:px-6 sm:text-base">
                Создать репертуар <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 sm:px-6 sm:text-base">
                <Play className="h-4 w-4" /> Попробовать демо
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-6">
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-400">Линий</dt>
                <dd className="mt-1 text-2xl font-semibold">{demoLines.length}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-400">Ловушек</dt>
                <dd className="mt-1 text-2xl font-semibold">{traps}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-400">Защит</dt>
                <dd className="mt-1 text-2xl font-semibold">{new Set(demoLines.map((l) => l.category)).size}</dd>
              </div>
            </dl>
          </div>
          <div className="relative mx-auto w-full max-w-md animate-rise [animation-delay:120ms]">
            <div className="board-shadow overflow-hidden rounded-2xl ring-1 ring-white/10">
              <MiniBoard
                fen={MAIN_LINE_FEN}
                size={400}
                highlight={[
                  { square: "f3", color: "rgba(250,204,21,0.5)" },
                  { square: "e4", color: "rgba(250,204,21,0.35)" },
                ]}
              />
            </div>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 font-mono text-xs text-amber-300 ring-1 ring-white/10 shadow-xl">
              5.Nxf3 — гамбит принят
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:bg-white/[0.07]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                <f.Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-8 sm:p-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">Стартовый репертуар уже внутри</h2>
          <p className="mt-3 max-w-2xl text-slate-300">
            Защиты Тейхмана, Эйве, Боголюбова, Гундерама, Циглера, гамбит Райдера с ловушкой Халосара, контргамбит Лембергера и другие — с комментариями, какой план выбрать за белых.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[...new Set(demoLines.map((l) => l.category))].map((c) => (
              <span key={c} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-500">BDG Trainer · Vom ersten Zug an auf Matt!</footer>
    </div>
  );
}
