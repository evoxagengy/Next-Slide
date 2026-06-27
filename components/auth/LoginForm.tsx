"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Falha no login.");
      return;
    }
    router.push(params.get("next") || data.redirectTo || "/dashboard");
    router.refresh();
  }

  return (
    <form action={submit} className="space-y-6">
      <div className="space-y-3">
        <Label htmlFor="email" className="text-base font-bold text-white">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          required
          className="h-14 rounded-xl border-white/15 bg-slate-950/30 px-4 text-base text-white placeholder:text-slate-500 focus:border-cyan-300 focus:ring-cyan-300/15"
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="password" className="text-base font-bold text-white">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="h-14 rounded-xl border-white/15 bg-slate-950/30 px-4 pr-12 text-base text-white placeholder:text-slate-500 focus:border-cyan-300 focus:ring-cyan-300/15"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff size={21} /> : <Eye size={21} />}
          </button>
        </div>
        <div className="flex justify-start">
          <Link href="/login" className="text-sm font-semibold text-blue-400 transition hover:text-cyan-300 hover:underline">
            Esqueceu sua senha?
          </Link>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-medium text-red-100">{error}</div>}

      <Button className="h-14 w-full rounded-xl text-base font-black shadow-[0_16px_42px_rgba(6,182,212,0.22)]" disabled={loading}>
        <span>{loading ? "Entrando..." : "Entrar"}</span>
        {!loading && <ArrowRight size={24} className="ml-auto" />}
      </Button>

      <div className="flex items-center gap-4 pt-3 text-sm text-slate-400">
        <div className="h-px flex-1 bg-white/10" />
        <span>Ainda não tem conta?</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <Link href="/register" className="mx-auto flex w-fit items-center justify-center gap-3 rounded-xl px-4 py-2 text-base font-bold text-blue-400 transition hover:bg-white/5 hover:text-cyan-300">
        <Users size={22} className="text-lime-400" />
        Criar organização
      </Link>
    </form>
  );
}
