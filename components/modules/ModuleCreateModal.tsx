"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { ModuleCreateForm } from "@/components/modules/ModuleCreateForm";
import { Button } from "@/components/ui/button";

export function ModuleCreateModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}><Plus size={18} /> Novo módulo</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm lg:p-8">
          <div className="w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-background shadow-card">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-5 py-4 backdrop-blur-xl">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-cyan">Novo módulo</div>
                <h2 className="text-xl font-black text-text">Criar apresentação para TV</h2>
                <p className="text-sm text-muted">Tudo em um modal: arquivos, sites, tempo, transição e logo.</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} aria-label="Fechar modal"><X size={20} /></Button>
            </div>
            <div className="max-h-[calc(100vh-150px)] overflow-y-auto p-4 lg:p-6">
              <ModuleCreateForm modalMode onCancel={() => setOpen(false)} onCreated={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
