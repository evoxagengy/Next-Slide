import { BarChart3, LockKeyhole, MessageSquareText, ShieldCheck, TrendingUp } from "lucide-react";
import { Brand } from "@/components/layout/Brand";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const chips = [
    { label: "KPIs", icon: TrendingUp },
    { label: "Comunicados", icon: MessageSquareText },
    { label: "Power BI", icon: BarChart3 },
    { label: "Grafana", icon: BarChart3 },
    { label: "Segurança", icon: ShieldCheck }
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[url('/brand/login-background.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_34%,rgba(0,179,255,0.16),transparent_34%),linear-gradient(90deg,rgba(2,6,23,0.98)_0%,rgba(2,8,23,0.91)_34%,rgba(2,8,23,0.58)_64%,rgba(2,6,23,0.88)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent" />

      <div className="relative z-10 flex min-h-screen flex-col px-6 py-8 lg:px-24">
        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[1fr_520px]">
          <section className="max-w-4xl">
            <Brand />

            <h1 className="mt-14 max-w-3xl text-5xl font-black leading-[1.08] tracking-tight text-white drop-shadow-2xl md:text-6xl lg:text-7xl">
              Suas informações.
              <br />
              Sempre em destaque<span className="text-lime-300">.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-xl font-medium leading-9 text-slate-300">
              Crie links seguros para apresentações e dashboards
              <br className="hidden md:block" /> e exiba em TVs corporativas com gestão à vista.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              {chips.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.045] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_45px_rgba(0,0,0,0.18)] backdrop-blur-md">
                    <Icon size={20} className={item.label === "Segurança" ? "text-lime-300" : "text-cyan-300"} />
                    {item.label}
                  </div>
                );
              })}
            </div>

            <div className="mt-24 hidden items-center gap-4 text-sm font-medium text-slate-300 lg:flex">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-cyan-200 shadow-[0_12px_30px_rgba(0,0,0,0.24)]">
                <ShieldCheck size={22} />
              </div>
              <span>
                Links seguros e estáveis para suas TVs,
                <br /> mini PCs e navegadores de gestão à vista.
              </span>
            </div>
          </section>

          <section className="relative mx-auto w-full max-w-[520px]">
            <div className="next-login-card">
              <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_18%_0%,rgba(0,217,255,0.14),transparent_35%),radial-gradient(circle_at_100%_100%,rgba(125,223,0,0.10),transparent_34%)]" />
              <div className="relative">
                <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 shadow-[0_0_35px_rgba(0,217,255,0.16)]">
                  <LockKeyhole size={22} />
                </div>

                <h2 className="text-3xl font-black tracking-tight text-white">{title}</h2>
                <p className="mt-2 text-base font-medium text-slate-300">{subtitle}</p>

                <div className="mt-8">{children}</div>
              </div>
            </div>
          </section>
        </div>

        <footer className="relative z-10 flex flex-wrap items-center justify-center gap-6 border-t border-white/10 pt-6 text-xs font-medium text-slate-400">
          <div className="flex items-center gap-2 text-lime-300">
            <LockKeyhole size={14} />
            Ambiente seguro
          </div>
          <div className="hidden h-6 w-px bg-white/15 sm:block" />
          <div>© 2026 Next Slide. Todos os direitos reservados.</div>
        </footer>
      </div>

      <style>{`
        .next-login-card {
          position: relative;
          overflow: hidden;
          border-radius: 2rem;
          padding: 2.5rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background:
            linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.86)),
            rgba(2, 6, 23, 0.88);
          box-shadow:
            0 30px 100px rgba(0, 0, 0, 0.58),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(24px);
        }

        .next-login-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: conic-gradient(
            from var(--card-angle),
            rgba(37, 99, 235, 0.16),
            rgba(0, 217, 255, 0.72),
            rgba(125, 223, 0, 0.55),
            rgba(37, 99, 235, 0.16),
            rgba(37, 99, 235, 0.16)
          );
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          animation: nextCardBorderFlow 7s linear infinite;
        }

        .next-login-card::after {
          content: "";
          position: absolute;
          width: 190px;
          height: 190px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(0, 217, 255, 0.24), rgba(125, 223, 0, 0.10) 42%, transparent 70%);
          filter: blur(20px);
          opacity: 0.52;
          transform: translate(-50%, -50%);
          animation: nextCardSoftSpot 9s ease-in-out infinite;
          pointer-events: none;
        }

        @property --card-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }

        @keyframes nextCardBorderFlow {
          to {
            --card-angle: 360deg;
          }
        }

        @keyframes nextCardSoftSpot {
          0% {
            left: 12%;
            top: 12%;
          }
          25% {
            left: 88%;
            top: 18%;
          }
          50% {
            left: 86%;
            top: 86%;
          }
          75% {
            left: 16%;
            top: 82%;
          }
          100% {
            left: 12%;
            top: 12%;
          }
        }

        @media (max-width: 640px) {
          .next-login-card {
            padding: 2rem;
          }
        }
      `}</style>
    </main>
  );
}
