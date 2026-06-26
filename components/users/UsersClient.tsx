"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

type UserRow = { id: string; name: string; email: string; role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER"; isActive: boolean; lastLoginAt: string | null; createdAt: string };

export function UsersClient({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState("");

  async function refresh() {
    const response = await fetch("/api/users");
    const data = await response.json();
    if (response.ok) setUsers(data.users);
  }

  async function create(formData: FormData) {
    setError("");
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formData.get("name"), email: formData.get("email"), password: formData.get("password"), role: formData.get("role") })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Não foi possível criar usuário.");
      return;
    }
    (document.getElementById("create-user-form") as HTMLFormElement | null)?.reset();
    await refresh();
  }

  async function toggle(user: UserRow) {
    const response = await fetch(`/api/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !user.isActive }) });
    const data = await response.json();
    if (!response.ok) alert(data.error || "Não foi possível atualizar.");
    await refresh();
  }

  async function changeRole(user: UserRow, role: UserRow["role"]) {
    const response = await fetch(`/api/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    const data = await response.json();
    if (!response.ok) alert(data.error || "Não foi possível alterar papel.");
    await refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card className="p-5">
        <h3 className="text-lg font-bold">Criar usuário</h3>
        <p className="mt-1 text-sm text-muted">No MVP, o usuário é criado diretamente. Convite por e-mail fica preparado para evolução futura.</p>
        <form id="create-user-form" action={create} className="mt-5 space-y-4">
          <div><Label>Nome</Label><Input name="name" required /></div>
          <div><Label>E-mail</Label><Input name="email" type="email" required /></div>
          <div><Label>Senha inicial</Label><Input name="password" type="password" required /></div>
          <div><Label>Papel</Label><Select name="role" defaultValue="VIEWER"><option value="ADMIN">ADMIN</option><option value="EDITOR">EDITOR</option><option value="VIEWER">VIEWER</option></Select></div>
          {error && <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-red-200">{error}</div>}
          <Button>Criar usuário</Button>
        </form>
      </Card>
      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id} className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="font-semibold text-text">{user.name}</div>
                <div className="text-sm text-muted">{user.email}</div>
                <div className="mt-1 text-xs text-muted">Último login: {formatDateTime(user.lastLoginAt)}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={user.isActive ? "success" : "danger"}>{user.isActive ? "Ativo" : "Inativo"}</Badge>
                <Select className="w-36" value={user.role} onChange={(event) => changeRole(user, event.target.value as UserRow["role"])} disabled={user.role === "OWNER"}>
                  <option value="OWNER">OWNER</option><option value="ADMIN">ADMIN</option><option value="EDITOR">EDITOR</option><option value="VIEWER">VIEWER</option>
                </Select>
                <Button type="button" variant="secondary" size="sm" onClick={() => toggle(user)}>{user.isActive ? "Desativar" : "Ativar"}</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
