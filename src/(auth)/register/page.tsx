import type { Metadata } from "next";
import Link from "next/link";
import { Crown } from "lucide-react";
import { AuthForm } from "@/components/auth/AuthForm";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/db/bootstrap";

export const metadata: Metadata = { title: "Регистрация" };

export default function RegisterPage() {
  return (
    <div>
      <Link href="/" className="mb-8 flex items-center gap-2 text-sm font-semibold text-slate-900 lg:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-amber-400">
      <Crown className="h-4 w-4" strokeWidth={2.2} />
    </span>
        BDG Trainer
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Создать аккаунт</h1>
      <p className="mt-1.5 text-sm text-slate-500">Личный репертуар, тренажёр и статистика прогресса — всё сохраняется в вашем профиле.</p>
      <div className="mt-8">
        <AuthForm mode="register" demoEmail={DEMO_EMAIL} demoPassword={DEMO_PASSWORD} />
      </div>
    </div>
  );
}
