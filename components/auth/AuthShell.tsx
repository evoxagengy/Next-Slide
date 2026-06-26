import { Brand } from "@/components/layout/Brand";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background bg-radial-blue px-4 py-10 text-text next-grid">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_460px] lg:items-center">
          <section className="hidden lg:block">
            <Brand />
            <h1 className="mt-10 max-w-2xl text-5xl font-black leading-tight tracking-tight">Telas corporativas inteligentes, rodando 24/7.</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted">Crie módulos de slides, incorpore dashboards e publique um link seguro para TVs, mini PCs ou navegadores de gestão à vista.</p>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {['Power BI', 'Grafana', 'Comunicados'].map((item) => <div key={item} className="rounded-2xl border border-border bg-white/[0.04] p-4 text-sm font-semibold text-slate-200">{item}</div>)}
            </div>
          </section>
          <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-card backdrop-blur-xl sm:p-8">
            <div className="mb-8 lg:hidden"><Brand /></div>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
