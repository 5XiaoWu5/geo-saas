import { BarChart3, FileSearch, FileText, Search, Tags } from "lucide-react";
import { GrowthEngineHub, type GrowthEngineModule } from "@/features/product-architecture/growth-engine-hub";

export default async function ProjectSeoPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const modules: GrowthEngineModule[] = [
    { title: "网站审计", description: "运行并查看当前项目的真实网站扫描。", href: `/projects/${projectId}/overview`, icon: FileSearch },
    { title: "SEO 分析器", description: "查看持久化扫描证据中的技术、Schema 与内容发现。", href: "/analyzer", icon: BarChart3 },
    { title: "Schema 分析", description: "检查结构化数据覆盖情况与相关优化建议。", href: "/analyzer", icon: Tags },
    { title: "关键词研究", description: "打开当前项目共享的 Campaign 与查询研究基础。", href: `/projects/${projectId}/campaigns`, icon: Search, status: "foundation" },
    { title: "内容优化", description: "将 SEO 发现转化为统一优化中心中的任务。", href: `/projects/${projectId}/optimization`, icon: FileText, status: "foundation" },
  ];

  return <GrowthEngineHub eyebrow="项目工作区" title="SEO 增长" description="使用现有扫描、分析器与任务流程，统一管理当前项目的传统搜索健康度和优化。" accent="seo" modules={modules} />;
}
