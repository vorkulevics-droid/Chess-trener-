"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";

export function AuthForm({ mode, demoEmail, demoPassword }: { mode: "login" | "register"; demoEmail: string; demoPassword: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [withDemo, setWithDemo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"form" | "demo" | null>(null);

  async function submit(payload: Record<string, unknown>, endpoint: string, which: "form" | "demo") {
    setError(null);
    setLoading(which);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Что-то пошло не так");
        setLoading(null);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Нет соединения с сервером");
      setLoading(null);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "login") void submit({ email, password }, "/api/auth/login", "form");
    else void submit({ name, email, password, withDemo }, "/api/auth/register", "form");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "register" && (
        <Field label="Имя">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Как к вам обращаться" required autoComplete="name" />
        </Field>
      )}
      <Field label="Email">
        <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
      </Field>
      <Field label="Пароль" hint={mode === "register" ? "Минимум 6 символов" : undefined}>
        <input
          className={inputClass}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </Field>

      {mode === "register" && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-amber-500" checked={withDemo} onChange={(e) => setWithDemo(e.target.checked)} />
          <span>
            <span className="font-medium text-slate-800">Добавить стартовый репертуар</span>
            <span className="block text-xs text-slate-500">15 линий гамбита Блэкмара-Димера, включая ловушку Халосара и другие тактические ловушки.</span>
          </span>
        </label>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 animate-rise" role="alert">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" loading={loading === "form"}>
        {mode === "login" ? "Войти" : "Создать аккаунт"}
      </Button>

      <div className="relative py-1 text-center text-xs text-slate-400">
        <span className="relative z-10 bg-white px-2">или</span>
        <span className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        loading={loading === "demo"}
        onClick={() => void submit({ email: demoEmail, password: demoPassword }, "/api/auth/login", "demo")}
      >
        <Sparkles className="h-4 w-4" /> Войти в демо-аккаунт
      </Button>

      <p className="text-center text-sm text-slate-500">
        {mode === "login" ? (
          <>
            Нет аккаунта?{" "}
            <Link href="/register" className="font-medium text-slate-900 underline-offset-4 hover:underline">
              Зарегистрироваться
            </Link>
          </>
        ) : (
          <>
            Уже есть аккаунт?{" "}
            <Link href="/login" className="font-medium text-slate-900 underline-offset-4 hover:underline">
              Войти
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
