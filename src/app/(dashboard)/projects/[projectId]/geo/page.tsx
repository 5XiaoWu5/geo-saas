import { BookOpen, BrainCircuit, Building2, Eye, FlaskConical, MessagesSquare, Radar, Swords } from "lucide-react";
import { GrowthEngineHub, type GrowthEngineModule } from "@/features/product-architecture/growth-engine-hub";

export default async function ProjectGeoPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const modules: GrowthEngineModule[] = [
    { title: "AI 搜索增长诊断", description: "汇总实体、知识、产品、客户证明、技术权威、引用和竞品信号，解释 AI 为什么可能不推荐企业。", href: `/projects/${projectId}/geo/intelligence`, icon: Radar },
    { title: "AI 可见性", description: "查看当前项目已保存的提示词、检查、品牌提及与来源证据。", href: `/projects/${projectId}/visibility`, icon: Eye },
    { title: "实体智能", description: "管理企业实体画像并生成有证据支持的建议。", href: `/projects/${projectId}/entity`, icon: Building2 },
    { title: "AI 推荐模拟器", description: "使用当前项目真实证据运行规则推荐预测。", href: `/projects/${projectId}/simulator`, icon: FlaskConical },
    { title: "Campaign 与查询", description: "整理当前项目的 AI 搜索问题与平台覆盖。", href: `/projects/${projectId}/campaigns`, icon: MessagesSquare },
    { title: "AI 推荐洞察", description: "解释企业为什么可能获得或无法获得 AI 推荐。", href: `/project/${projectId}/insights`, icon: BrainCircuit },
    { title: "竞品基准", description: "管理项目隔离的竞品资料与基准分析基础。", href: `/projects/${projectId}/competitors`, icon: Swords, status: "foundation" },
    { title: "企业知识智能", description: "查看支撑 GEO 分析的严格证据企业画像。", href: `/projects/${projectId}/knowledge/intelligence`, icon: BookOpen },
  ];

  return <GrowthEngineHub eyebrow="项目工作区" title="AI 搜索增长" description="统一管理当前项目的实体、可见性、推荐与竞品智能，并保持规则预测与未来真实 AI 搜索检查相互独立。" accent="geo" modules={modules} />;
}
