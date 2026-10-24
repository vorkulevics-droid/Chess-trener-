import Link from "next/link";
import { Crown } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
      <div className="max-w-md text-center animate-rise">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-amber-400 shadow-lg">
          <Crown className="h-7 w-7" strokeWidth={2.2} />
        </div>
        <p className="mt-6 font-mono text-sm text-slate-500">404 · позиция не найдена</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Такой страницы нет</h1>
        <p className="mt-2 text-sm text-slate-500">Возможно, линия была удалена из репертуара или ссылка устарела.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/dashboard" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
            На главную
          </Link>
          <Link href="/repertoire" className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">
            Репертуар
          </Link>
        </div>
      </div>
    </main>
  );
}
