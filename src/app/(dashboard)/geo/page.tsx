import { BookOpen, Bot, BrainCircuit, Building2, Eye, FlaskConical, MessagesSquare, Swords } from "lucide-react";
import { GrowthEngineHub, type GrowthEngineModule } from "@/features/product-architecture/growth-engine-hub";

const modules: GrowthEngineModule[] = [
  { title: "AI 可见性", description: "按项目追踪已保存的提示词、平台检查、品牌提及、推荐位置与来源链接。", href: "/visibility", icon: Eye },
  { title: "实体智能", description: "建立 AI 理解企业、产品与权威性所需的实体证据。", href: "/entity", icon: Building2 },
  { title: "AI 推荐模拟器", description: "使用真实项目证据运行明确标注的规则推荐预测。", href: "/simulator", icon: FlaskConical },
  { title: "Campaign 与查询", description: "将商业问题和平台覆盖整理为可衡量的 AI 搜索 Campaign。", href: "/campaigns", icon: MessagesSquare },
  { title: "AI 推荐洞察", description: "解释正向信号、推荐缺口和下一步有证据支持的行动。", href: "/insights", icon: BrainCircuit },
  { title: "竞品基准", description: "选择项目管理竞品，并建立推荐概率与排名对比基础。", href: "/projects", icon: Swords, status: "foundation" },
  { title: "企业知识智能", description: "进入支撑实体、模拟与推荐分析的企业证据层。", href: "/knowledge", icon: BookOpen },
  { title: "真实 AI 搜索检查", description: "未来独立承载 ChatGPT、Gemini、Claude 与 Perplexity 的真实检查结果。", href: "/visibility", icon: Bot, status: "planned" },
];

export default function GeoGrowthPage() {
  return <GrowthEngineHub eyebrow="生成式搜索增长" title="AI 搜索增长" description="提升 AI 系统对企业的理解、引用和推荐能力，并清晰区分规则模拟预测与真实可见性检查。" accent="geo" modules={modules} />;
}
