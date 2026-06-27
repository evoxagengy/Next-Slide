"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatDateTime } from "@/lib/utils";

type Role = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
type Plan = "TRIAL" | "BASIC" | "PRO" | "PREMIUM" | "ENTERPRISE";
type Status = "ACTIVE" | "TRIAL" | "EXPIRED" | "SUSPENDED" | "CANCELLED";

type UserRow = {
  id: string;
  licenseId: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type CompanyRow = {
  id: string;
  companyName: string;
  plan: Plan;
  status: Status;
  maxUsers: number;
  maxModules: number;
  maxSlidesPerModule: number;
  startsAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  usersCount: number;
  modulesCount: number;
  users: UserRow[];
};

type ManagerPayload = {
  canManageAllCompanies: boolean;
  currentLicenseId: string;
  companies: CompanyRow[];
};

type CompanyDraft = {
  companyName: string;
  plan: "BASIC" | "PREMIUM" | "ENTERPRISE";
  status: Status;
  maxUsers: number;
};

type EditingCompany = {
  companyName: string;
  plan: "BASIC" | "PREMIUM" | "ENTERPRISE";
  status: Status;
  maxUsers: number;
};

const planLabels: Record<Plan, string> = {
  TRIAL: "Basic legado",
  BASIC: "Basic",
  PRO: "Premium legado",
  PREMIUM: "Premium",
  ENTERPRISE: "Enterprise"
};

const statusLabels: Record<Status, string> = {
  ACTIVE: "Ativa",
  TRIAL: "Trial",
  EXPIRED: "Expirada",
  SUSPENDED: "Suspensa",
  CANCELLED: "Cancelada"
};

const planModules: Record<"BASIC" | "PREMIUM" | "ENTERPRISE", string> = {
  BASIC: "20 módulos",
  PREMIUM: "100 módulos",
  ENTERPRISE: "Sem limite"
};

function normalizeEditablePlan(plan: Plan): "BASIC" | "PREMIUM" | "ENTERPRISE" {
  if (plan === "ENTERPRISE") return "ENTERPRISE";
  if (plan === "PREMIUM" || plan === "PRO") return "PREMIUM";
  return "BASIC";
}

function planTone(plan: Plan): "default" | "success" | "warning" | "danger" | "info" {
  if (plan === "ENTERPRISE") return "success";
  if (plan === "PREMIUM" || plan === "PRO") return "info";
  return "warning";
}

function statusTone(status: Status): "default" | "success" | "warning" | "danger" | "info" {
  if (status === "ACTIVE" || status === "TRIAL") return "success";
  if (status === "SUSPENDED" || status === "EXPIRED") return "warning";
  if (status === "CANCELLED") return "danger";
  return "default";
}

function Modal({ title, description, children, onClose }: { title: string; description?: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-border bg-[#0B1220] p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-text">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-3 py-1.5 text-sm text-muted hover:bg-white/5 hover:text-text">Fechar</button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function ManagerClient({ initialCompanies, currentLicenseId, canManageAllCompanies }: { initialCompanies: CompanyRow[]; currentLicenseId: string; canManageAllCompanies: boolean }) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [activeTab, setActiveTab] = useState<"users" | "companies">("users");
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanies[0]?.id || currentLicenseId);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [companyDraft, setCompanyDraft] = useState<CompanyDraft>({ companyName: "", plan: "BASIC", status: "ACTIVE", maxUsers: 5 });
  const [editingCompanies, setEditingCompanies] = useState<Record<string, EditingCompany>>({});

  const selectedCompany = useMemo(() => companies.find((company) => company.id === selectedCompanyId) || companies[0], [companies, selectedCompanyId]);
  const selectedUsers = selectedCompany?.users || [];

  async function refresh() {
    const response = await fetch("/api/manager", { cache: "no-store" });
    const data = (await response.json()) as ManagerPayload;
    if (response.ok) {
      setCompanies(data.companies);
      if (!data.companies.some((company) => company.id === selectedCompanyId)) {
        setSelectedCompanyId(data.companies[0]?.id || currentLicenseId);
      }
    }
  }

  async function createUser(formData: FormData) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/manager/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseId: formData.get("licenseId"),
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          role: formData.get("role")
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Não foi possível criar usuário.");
        return;
      }
      setCreateUserOpen(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function patchUser(user: UserRow, body: Partial<Pick<UserRow, "role" | "isActive" | "licenseId" | "name">>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/manager/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Não foi possível atualizar usuário.");
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function createCompany() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/manager/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyDraft)
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Não foi possível criar empresa.");
        return;
      }
      setCreateCompanyOpen(false);
      setCompanyDraft({ companyName: "", plan: "BASIC", status: "ACTIVE", maxUsers: 5 });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveCompany(company: CompanyRow) {
    const draft = editingCompanies[company.id] || {
      companyName: company.companyName,
      plan: normalizeEditablePlan(company.plan),
      status: company.status,
      maxUsers: company.maxUsers
    };
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/manager/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Não foi possível salvar empresa.");
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function companyDraftFor(company: CompanyRow) {
    return editingCompanies[company.id] || {
      companyName: company.companyName,
      plan: normalizeEditablePlan(company.plan),
      status: company.status,
      maxUsers: company.maxUsers
    };
  }

  function setCompanyEdit(id: string, patch: Partial<EditingCompany>) {
    const company = companies.find((item) => item.id === id);
    if (!company) return;
    setEditingCompanies((current) => ({
      ...current,
      [id]: {
        companyName: company.companyName,
        plan: normalizeEditablePlan(company.plan),
        status: company.status,
        maxUsers: company.maxUsers,
        ...current[id],
        ...patch
      }
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-surface/60 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex rounded-2xl border border-border bg-[#070B12] p-1">
          <button type="button" onClick={() => setActiveTab("users")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === "users" ? "bg-gradient-to-r from-primary to-cyan text-white shadow-glow" : "text-muted hover:text-text"}`}>Usuários</button>
          <button type="button" onClick={() => setActiveTab("companies")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === "companies" ? "bg-gradient-to-r from-primary to-cyan text-white shadow-glow" : "text-muted hover:text-text"}`}>Empresas</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setCreateUserOpen(true)}>Criar usuário</Button>
          {canManageAllCompanies ? <Button type="button" variant="secondary" onClick={() => setCreateCompanyOpen(true)}>Criar empresa</Button> : null}
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-red-100">{error}</div> : null}

      {activeTab === "users" ? (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-end">
              <div>
                <h3 className="text-lg font-bold text-text">Usuários por empresa</h3>
                <p className="mt-1 text-sm text-muted">Selecione uma empresa para visualizar, ativar/desativar e alterar permissões.</p>
              </div>
              <div>
                <Label>Empresa</Label>
                <Select value={selectedCompany?.id || ""} onChange={(event) => setSelectedCompanyId(event.target.value)}>
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.companyName}</option>)}
                </Select>
              </div>
            </div>
            {selectedCompany ? (
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                <Badge tone={planTone(selectedCompany.plan)}>{planLabels[selectedCompany.plan]}</Badge>
                <Badge tone={statusTone(selectedCompany.status)}>{statusLabels[selectedCompany.status]}</Badge>
                <span className="rounded-full border border-border px-3 py-1">Usuários/licenças: {selectedCompany.usersCount}/{selectedCompany.maxUsers}</span>
                <span className="rounded-full border border-border px-3 py-1">Módulos: {selectedCompany.modulesCount}/{selectedCompany.maxModules >= 9999 ? "sem limite" : selectedCompany.maxModules}</span>
              </div>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-muted">
                <tr>
                  <th className="px-5 py-4">Usuário</th>
                  <th className="px-5 py-4">Papel</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Último login</th>
                  <th className="px-5 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {selectedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.03]">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-text">{user.name}</div>
                      <div className="text-xs text-muted">{user.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <Select className="w-36" value={user.role} onChange={(event) => patchUser(user, { role: event.target.value as Role })} disabled={busy}>
                        <option value="OWNER">OWNER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="EDITOR">EDITOR</option>
                        <option value="VIEWER">VIEWER</option>
                      </Select>
                    </td>
                    <td className="px-5 py-4"><Badge tone={user.isActive ? "success" : "danger"}>{user.isActive ? "Ativo" : "Inativo"}</Badge></td>
                    <td className="px-5 py-4 text-muted">{formatDateTime(user.lastLoginAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Button type="button" size="sm" variant={user.isActive ? "danger" : "secondary"} disabled={busy} onClick={() => patchUser(user, { isActive: !user.isActive })}>{user.isActive ? "Desativar" : "Ativar"}</Button>
                    </td>
                  </tr>
                ))}
                {selectedUsers.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-muted">Nenhum usuário cadastrado nesta empresa.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border p-5">
            <h3 className="text-lg font-bold text-text">Empresas e planos</h3>
            <p className="mt-1 text-sm text-muted">Configure plano, quantidade de licenças de usuário e limite de módulos por empresa.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-muted">
                <tr>
                  <th className="px-5 py-4">Empresa</th>
                  <th className="px-5 py-4">Plano</th>
                  <th className="px-5 py-4">Usuários/licenças</th>
                  <th className="px-5 py-4">Módulos</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {companies.map((company) => {
                  const draft = companyDraftFor(company);
                  return (
                    <tr key={company.id} className="hover:bg-white/[0.03]">
                      <td className="px-5 py-4">
                        <Input value={draft.companyName} disabled={!canManageAllCompanies} onChange={(event) => setCompanyEdit(company.id, { companyName: event.target.value })} />
                        <div className="mt-1 text-xs text-muted">Criada em {formatDateTime(company.createdAt)}</div>
                      </td>
                      <td className="px-5 py-4">
                        <Select value={draft.plan} disabled={!canManageAllCompanies} onChange={(event) => setCompanyEdit(company.id, { plan: event.target.value as EditingCompany["plan"] })}>
                          <option value="BASIC">Basic</option>
                          <option value="PREMIUM">Premium</option>
                          <option value="ENTERPRISE">Enterprise</option>
                        </Select>
                        <div className="mt-1 text-xs text-muted">{planModules[draft.plan]}</div>
                      </td>
                      <td className="px-5 py-4">
                        <Input type="number" min={1} max={9999} value={draft.maxUsers} disabled={!canManageAllCompanies} onChange={(event) => setCompanyEdit(company.id, { maxUsers: Number(event.target.value) })} />
                        <div className="mt-1 text-xs text-muted">Em uso: {company.usersCount}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-text">{company.modulesCount}/{company.maxModules >= 9999 ? "sem limite" : company.maxModules}</div>
                        <div className="text-xs text-muted">Slides/módulo: {company.maxSlidesPerModule >= 9999 ? "sem limite" : company.maxSlidesPerModule}</div>
                      </td>
                      <td className="px-5 py-4">
                        <Select value={draft.status} disabled={!canManageAllCompanies} onChange={(event) => setCompanyEdit(company.id, { status: event.target.value as Status })}>
                          <option value="ACTIVE">Ativa</option>
                          <option value="TRIAL">Trial</option>
                          <option value="EXPIRED">Expirada</option>
                          <option value="SUSPENDED">Suspensa</option>
                          <option value="CANCELLED">Cancelada</option>
                        </Select>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {canManageAllCompanies ? <Button type="button" size="sm" disabled={busy} onClick={() => saveCompany(company)}>Salvar</Button> : <span className="text-xs text-muted">Somente master</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {createUserOpen ? (
        <Modal title="Criar usuário" description="Crie o acesso e vincule a uma empresa/licença." onClose={() => setCreateUserOpen(false)}>
          <form action={createUser} className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2"><Label>Empresa</Label><Select name="licenseId" defaultValue={selectedCompany?.id || currentLicenseId}>{companies.map((company) => <option key={company.id} value={company.id}>{company.companyName}</option>)}</Select></div>
            <div><Label>Nome</Label><Input name="name" required /></div>
            <div><Label>E-mail</Label><Input name="email" type="email" required /></div>
            <div><Label>Senha inicial</Label><Input name="password" type="password" required /></div>
            <div><Label>Papel</Label><Select name="role" defaultValue="VIEWER"><option value="OWNER">OWNER</option><option value="ADMIN">ADMIN</option><option value="EDITOR">EDITOR</option><option value="VIEWER">VIEWER</option></Select></div>
            <div className="lg:col-span-2 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCreateUserOpen(false)}>Cancelar</Button><Button disabled={busy}>Criar usuário</Button></div>
          </form>
        </Modal>
      ) : null}

      {createCompanyOpen ? (
        <Modal title="Criar empresa" description="Defina o plano e a quantidade de licenças de usuário dessa empresa." onClose={() => setCreateCompanyOpen(false)}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2"><Label>Nome da empresa</Label><Input value={companyDraft.companyName} onChange={(event) => setCompanyDraft((current) => ({ ...current, companyName: event.target.value }))} /></div>
            <div><Label>Plano</Label><Select value={companyDraft.plan} onChange={(event) => setCompanyDraft((current) => ({ ...current, plan: event.target.value as CompanyDraft["plan"] }))}><option value="BASIC">Basic — 20 módulos, sem PPTX</option><option value="PREMIUM">Premium — 100 módulos, com PPTX</option><option value="ENTERPRISE">Enterprise — sem limite</option></Select></div>
            <div><Label>Licenças de usuário</Label><Input type="number" min={1} max={9999} value={companyDraft.maxUsers} onChange={(event) => setCompanyDraft((current) => ({ ...current, maxUsers: Number(event.target.value) }))} /></div>
            <div><Label>Status</Label><Select value={companyDraft.status} onChange={(event) => setCompanyDraft((current) => ({ ...current, status: event.target.value as Status }))}><option value="ACTIVE">Ativa</option><option value="TRIAL">Trial</option><option value="SUSPENDED">Suspensa</option></Select></div>
            <div className="rounded-2xl border border-cyan/20 bg-cyan/10 p-4 text-sm text-cyan-50"><strong>Limite de módulos:</strong><br />{planModules[companyDraft.plan]}<br /><span className="text-xs text-muted">Basic não permite conversão PPTX. Premium e Enterprise permitem.</span></div>
            <div className="lg:col-span-2 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCreateCompanyOpen(false)}>Cancelar</Button><Button type="button" disabled={busy || companyDraft.companyName.trim().length < 2} onClick={createCompany}>Criar empresa</Button></div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
