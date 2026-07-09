import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Bot, ChartNoAxesCombined, Globe2, Radar, ShieldCheck, Sparkles, Zap } from "lucide-react";

const insightCards = [
  { label: "AI 可见性", value: "86%", tone: "from-cyan-400/25 to-blue-500/10" },
  { label: "引用潜力", value: "+42", tone: "from-violet-400/25 to-fuchsia-500/10" },
  { label: "实体完整度", value: "A级", tone: "from-emerald-400/25 to-teal-500/10" },
];

const aiMonitors = ["ChatGPT", "Claude", "Gemini", "Perplexity"];

export function AuthShell({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030712] text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,.22),transparent_30%),radial-gradient(circle_at_78%_14%,rgba(124,58,237,.24),transparent_30%),radial-gradient(circle_at_50%_88%,rgba(14,165,233,.13),transparent_34%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.032)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.032)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />
      <div className="absolute left-[42%] top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="absolute right-20 top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="hidden min-h-screen border-r border-white/10 p-10 xl:p-14 lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="group flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl">
                <Sparkles className="h-5 w-5 text-cyan-300" />
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,.85)]" />
              </div>
              <div>
                <p className="font-semibold tracking-tight">GeoPilot AI</p>
                <p className="text-xs text-muted-foreground">AI 搜索优化平台</p>
              </div>
            </Link>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">企业工作空间</div>
          </div>

          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-200 shadow-lg shadow-cyan-500/10">
              <Radar className="h-4 w-4 animate-pulse" />
              AI 搜索监控 · 多模型可见性追踪
            </div>
            <div>
              <h1 className="text-5xl font-semibold leading-[0.96] tracking-[-0.055em] xl:text-6xl">
                从搜索排名，升级到 <span className="bg-gradient-to-r from-cyan-200 via-blue-200 to-violet-200 bg-clip-text text-transparent">AI 推荐排名</span>。
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300/78">GeoPilot AI 帮助企业持续监控 GEO 健康度、AI 可见性与引用机会，把网站资产转化为可被生成式搜索理解和推荐的品牌信号。</p>
            </div>

            <div className="grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
              {aiMonitors.map((name) => <div key={name} className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-3 text-sm text-slate-200 shadow-lg shadow-black/10 backdrop-blur-xl"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.9)]" />{name}</div>)}
            </div>

            <div className="grid max-w-xl grid-cols-3 gap-3">
              {insightCards.map((card) => <div key={card.label} className={`rounded-3xl border border-white/10 bg-gradient-to-br ${card.tone} p-4 backdrop-blur-xl`}><p className="text-xs text-muted-foreground">{card.label}</p><p className="mt-3 text-2xl font-semibold">{card.value}</p></div>)}
            </div>

            <div className="relative max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl" />
              <div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-medium">AI 搜索优化</p><p className="text-xs text-muted-foreground">工作空间 · 监控 · 优化</p></div><ArrowUpRight className="h-4 w-4 text-cyan-300" /></div>
              <div className="grid gap-3">
                <SignalRow icon={<Globe2 className="h-4 w-4" />} label="网站资产识别" value="已同步" progress="w-[92%]" />
                <SignalRow icon={<Bot className="h-4 w-4" />} label="AI 搜索可见性" value="监控中" progress="w-[74%]" />
                <SignalRow icon={<ChartNoAxesCombined className="h-4 w-4" />} label="优化任务闭环" value="12 项" progress="w-[63%]" />
              </div>
            </div>
          </div>

          <div className="grid max-w-xl grid-cols-3 gap-3 text-xs text-muted-foreground">
            <TrustItem icon={<ShieldCheck className="h-4 w-4" />} text="数据库会话" />
            <TrustItem icon={<Zap className="h-4 w-4" />} text="安全校验" />
            <TrustItem icon={<Bot className="h-4 w-4" />} text="企业级安全" />
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-[464px]">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10"><Sparkles className="h-5 w-5 text-cyan-300" /></div>
              <div><p className="font-semibold">GeoPilot AI</p><p className="text-xs text-muted-foreground">AI 搜索优化平台</p></div>
            </div>
            <div className="relative overflow-hidden rounded-[2.1rem] border border-white/12 bg-slate-950/58 p-6 shadow-2xl shadow-black/45 backdrop-blur-2xl sm:p-8">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
              <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-violet-500/18 blur-3xl" />
              <div className="relative mb-7">
                <div className="mb-5 flex items-center justify-between">
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-[0.22em] text-cyan-200">工作空间</div>
                  <div className="text-[11px] text-muted-foreground">AI 搜索优化</div>
                </div>
                <p className="mb-2 text-sm text-slate-400">欢迎回来</p>
                <h2 className="text-3xl font-semibold tracking-[-0.035em]">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
              <div className="relative">{children}</div>
              {footer ? <div className="mt-7 text-center text-sm text-muted-foreground">{footer}</div> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SignalRow({ icon, label, value, progress }: { icon: ReactNode; label: string; value: string; progress: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="mb-2 flex items-center justify-between text-sm"><div className="flex items-center gap-2 text-muted-foreground">{icon}<span>{label}</span></div><span className="font-medium text-foreground">{value}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300 ${progress}`} /></div></div>;
}

function TrustItem({ icon, text }: { icon: ReactNode; text: string }) {
  return <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">{icon}<span>{text}</span></div>;
}
