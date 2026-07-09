import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Bot, ChartNoAxesCombined, Globe2, Radar, ShieldCheck, Sparkles, Zap } from "lucide-react";

const insightCards = [
  { label: "AI 可见性", value: "86%", tone: "from-cyan-400/25 to-blue-500/10" },
  { label: "引用潜力", value: "+42", tone: "from-violet-400/25 to-fuchsia-500/10" },
  { label: "实体完整度", value: "A级", tone: "from-emerald-400/25 to-teal-500/10" },
];

export function AuthShell({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050814] text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,.24),transparent_32%),radial-gradient(circle_at_78%_12%,rgba(168,85,247,.20),transparent_28%),radial-gradient(circle_at_55%_82%,rgba(16,185,129,.14),transparent_32%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />
      <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden min-h-screen border-r border-white/10 p-10 xl:p-14 lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="group flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-2xl shadow-primary/20 backdrop-blur-xl">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,.85)]" />
              </div>
              <div><p className="font-semibold tracking-tight">GeoPilot AI</p><p className="text-xs text-muted-foreground">企业级 GEO 增长平台</p></div>
            </Link>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">AI 搜索时代</div>
          </div>

          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm text-primary shadow-lg shadow-primary/10">
              <Radar className="h-4 w-4 animate-pulse" />
              让品牌成为 AI 答案里的首选
            </div>
            <div>
              <h1 className="text-5xl font-semibold leading-tight tracking-[-0.04em] xl:text-6xl">从搜索排名，升级到 AI 推荐排名。</h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">GeoPilot AI 帮助企业持续监控 GEO 健康度、AI 可见性与引用机会，把网站资产转化为可被生成式搜索理解和推荐的品牌信号。</p>
            </div>

            <div className="grid max-w-xl grid-cols-3 gap-3">
              {insightCards.map((card) => <div key={card.label} className={`rounded-3xl border border-white/10 bg-gradient-to-br ${card.tone} p-4 backdrop-blur-xl`}><p className="text-xs text-muted-foreground">{card.label}</p><p className="mt-3 text-2xl font-semibold">{card.value}</p></div>)}
            </div>

            <div className="relative max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-400/20 blur-2xl" />
              <div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-medium">GEO 智能分析流</p><p className="text-xs text-muted-foreground">从资产到优化闭环</p></div><ArrowUpRight className="h-4 w-4 text-primary" /></div>
              <div className="grid gap-3">
                <SignalRow icon={<Globe2 className="h-4 w-4" />} label="网站资产识别" value="已同步" progress="w-[92%]" />
                <SignalRow icon={<Bot className="h-4 w-4" />} label="AI 可见性检测" value="监控中" progress="w-[74%]" />
                <SignalRow icon={<ChartNoAxesCombined className="h-4 w-4" />} label="优化任务生成" value="12 项" progress="w-[63%]" />
              </div>
            </div>
          </div>

          <div className="grid max-w-xl grid-cols-3 gap-3 text-xs text-muted-foreground">
            <TrustItem icon={<ShieldCheck className="h-4 w-4" />} text="数据库会话" />
            <TrustItem icon={<Zap className="h-4 w-4" />} text="人机验证" />
            <TrustItem icon={<Bot className="h-4 w-4" />} text="企业级安全" />
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-[460px]">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10"><Sparkles className="h-5 w-5 text-primary" /></div>
              <div><p className="font-semibold">GeoPilot AI</p><p className="text-xs text-muted-foreground">企业级 GEO 增长平台</p></div>
            </div>
            <div className="rounded-[2rem] border border-white/12 bg-white/[0.07] p-6 shadow-2xl shadow-black/35 backdrop-blur-2xl sm:p-8">
              <div className="mb-7"><p className="mb-3 text-xs font-medium tracking-[0.28em] text-primary">安全入口</p><h2 className="text-3xl font-semibold tracking-tight">{title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p></div>
              {children}
              {footer ? <div className="mt-7 text-center text-sm text-muted-foreground">{footer}</div> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SignalRow({ icon, label, value, progress }: { icon: ReactNode; label: string; value: string; progress: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="mb-2 flex items-center justify-between text-sm"><div className="flex items-center gap-2 text-muted-foreground">{icon}<span>{label}</span></div><span className="font-medium text-foreground">{value}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full bg-gradient-to-r from-primary to-cyan-300 ${progress}`} /></div></div>;
}

function TrustItem({ icon, text }: { icon: ReactNode; text: string }) {
  return <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">{icon}<span>{text}</span></div>;
}
