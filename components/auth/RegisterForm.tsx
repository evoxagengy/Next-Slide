"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: formData.get("companyName"),
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password")
      })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Falha no cadastro.");
      return;
    }
    router.push(data.redirectTo || "/dashboard");
    router.refresh();
  }

  return (
    <form action={submit} className="space-y-4">
      <div>
        <Label htmlFor="companyName">Empresa / organização</Label>
        <Input id="companyName" name="companyName" placeholder="Ex.: Cerradão Bioenergia" required />
      </div>
      <div>
        <Label htmlFor="name">Seu nome</Label>
        <Input id="name" name="name" placeholder="Nome completo" required />
      </div>
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@empresa.com" required />
      </div>
      <div>
        <Label htmlFor="password">Senha forte</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        <p className="mt-2 text-xs text-muted">Mínimo 8 caracteres, maiúscula, minúscula, número e caractere especial.</p>
      </div>
      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error}</div>}
      <Button className="w-full" disabled={loading}>{loading ? "Criando..." : "Criar organização"}</Button>
      <p className="text-center text-sm text-muted">Já tem conta? <Link href="/login" className="font-semibold text-cyan hover:underline">Entrar</Link></p>
    </form>
  );
}
