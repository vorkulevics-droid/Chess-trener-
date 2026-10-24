import type { Metadata } from "next";
import Link from "next/link";
import { Crown } from "lucide-react";
import { AuthForm } from "@/components/auth/AuthForm";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/db/bootstrap";

export const metadata: Metadata = { title: "Вход" };

export default function LoginPage() {
  return (
    <div>
      <Link href="/" className="mb-8 flex items-center gap-2 text-sm font-semibold text-slate-900 lg:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-amber-400">
      <Crown className="h-4 w-4" strokeWidth={2.2} />
    </span>
        BDG Trainer
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">С возвращением</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Войдите, чтобы продолжить тренировку. Демо-доступ: <span className="font-mono text-slate-700">{DEMO_EMAIL}</span> /{" "}
        <span className="font-mono text-slate-700">{DEMO_PASSWORD}</span>
      </p>
      <div className="mt-8">
        <AuthForm mode="login" demoEmail={DEMO_EMAIL} demoPassword={DEMO_PASSWORD} />
      </div>
    </div>
  );
}
