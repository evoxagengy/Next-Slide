"use client";

import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password")
      })
    });

    const data = await response.json().catch(() => ({ error: "Falha no login." }));
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Falha no login.");
      return;
    }

    router.replace(params.get("next") || data.redirectTo || "/dashboard");
  }

  return (
    <form action={submit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-bold text-white">
          E-mail
        </label>
        <div className="group flex items-center gap-3 rounded-xl border border-white/15 bg-slate-950/35 px-4 py-3 transition focus-within:border-cyan-300/70 focus-within:bg-slate-950/55 focus-within:shadow-[0_0_0_4px_rgba(0,188,255,0.08)]">
          <Mail size={18} className="text-slate-400 transition group-focus-within:text-cyan-300" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            required
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-bold text-white">
          Senha
        </label>
        <div className="group flex items-center gap-3 rounded-xl border border-white/15 bg-slate-950/35 px-4 py-3 transition focus-within:border-cyan-300/70 focus-within:bg-slate-950/55 focus-within:shadow-[0_0_0_4px_rgba(0,188,255,0.08)]">
          <LockKeyhole size={18} className="text-slate-400 transition group-focus-within:text-cyan-300" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" className="text-xs font-bold text-cyan-300/90 transition hover:text-lime-300">
          Esqueceu sua senha?
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-100">
          {error}
        </div>
      )}

      <Button
        className="group h-14 w-full rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-lime-400 text-base font-black text-white shadow-[0_18px_50px_rgba(0,174,255,0.28)] transition hover:scale-[1.01] hover:shadow-[0_22px_70px_rgba(0,174,255,0.38)]"
        disabled={loading}
      >
        {loading ? "Entrando..." : "Entrar"}
        <span className="ml-2 text-xl transition group-hover:translate-x-1">→</span>
      </Button>
    </form>
  );
}
