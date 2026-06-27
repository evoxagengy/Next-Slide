import { BarChart3, Lock, MonitorPlay, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/layout/Brand";

const featurePills = [
  { label: "KPIs", icon: BarChart3, accent: "text-lime-300" },
  { label: "Comunicados", icon: MonitorPlay, accent: "text-cyan-300" },
  { label: "Power BI", icon: BarChart3, accent: "text-amber-300" },
  { label: "Grafana", icon: MonitorPlay, accent: "text-orange-300" },
  { label: "Segurança", icon: ShieldCheck, accent: "text-lime-300" }
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020817] text-white">
      <div className="absolute inset-0 bg-[url('/brand/login-background.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.94)_0%,rgba(2,6,23,0.84)_36%,rgba(2,6,23,0.58)_67%,rgba(2,6,23,0.78)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_81%_45%,rgba(13,148,236,0.22),transparent_34%),radial-gradient(circle_at_24%_12%,rgba(34,197,94,0.10),transparent_30%)]" />
      <div className="absolute inset-x-0 bottom-0 h-24 border-t border-white/10 bg-[#061120]/80 backdrop-blur-xl" />

      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1720px] grid-rows-[1fr_auto] px-6 py-8 sm:px-10 lg:px-24">
        <div className="grid min-h-[calc(100vh-8rem)] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_520px] xl:grid-cols-[minmax(0,1fr)_560px]">
          <div className="hidden max-w-[760px] lg:block">
            <Brand />

            <div className="mt-20">
              <h1 className="max-w-[680px] text-5xl font-black leading-[1.08] tracking-[-0.04em] text-white drop-shadow-2xl xl:text-6xl">
                Suas informações.
                <br />
                Sempre em destaque<span className="text-lime-400">.</span>
              </h1>

              <p className="mt-8 max-w-[640px] text-xl leading-9 text-slate-300">
                Crie links seguros para apresentações e dashboards
                <br />
                e exiba em TVs corporativas com gestão à vista.
              </p>

              <div className="mt-10 flex max-w-[760px] flex-wrap gap-4">
                {featurePills.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex min-w-[118px] items-center gap-3 rounded-xl border border-white/15 bg-slate-950/35 px-4 py-3 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
                      <Icon size={22} className={item.accent} />
                      {item.label}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-24 flex items-center gap-4 text-sm leading-5 text-slate-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-blue-500/15 text-white shadow-[0_0_34px_rgba(37,99,235,0.22)]">
                <ShieldCheck size={24} />
              </div>
              <div>
                Links seguros e estáveis para suas TVs,
                <br />
                mini PCs e navegadores de gestão à vista.
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[520px] lg:mx-0 lg:justify-self-end">
            <div className="mb-8 flex justify-center lg:hidden">
              <Brand />
            </div>

            <div className="relative overflow-hidden rounded-[34px] border border-cyan-400/55 bg-[#071225]/88 p-6 shadow-[0_0_0_1px_rgba(132,204,22,0.22),0_0_70px_rgba(14,165,233,0.24),0_22px_80px_rgba(0,0,0,0.54)] backdrop-blur-2xl sm:p-10">
              <div className="pointer-events-none absolute inset-0 rounded-[34px] bg-[radial-gradient(circle_at_93%_95%,rgba(132,204,22,0.16),transparent_34%),radial-gradient(circle_at_0%_0%,rgba(37,99,235,0.22),transparent_38%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />

              <div className="relative">
                <h2 className="text-3xl font-black tracking-[-0.03em] text-white">{title}</h2>
                <p className="mt-2 text-base leading-7 text-slate-300">{subtitle}</p>
                <div className="mt-9">{children}</div>
              </div>
            </div>
          </div>
        </div>

        <footer className="relative z-10 flex flex-col items-center justify-center gap-3 border-t border-white/10 pt-5 text-sm text-slate-400 sm:flex-row sm:gap-8">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-lime-400" />
            <span>Ambiente seguro</span>
          </div>
          <div className="hidden h-6 w-px bg-white/15 sm:block" />
          <span>© 2026 Next Slide. Todos os direitos reservados.</span>
        </footer>
      </section>
    </main>
  );
}
