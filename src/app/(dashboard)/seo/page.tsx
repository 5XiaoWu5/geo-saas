import { BarChart3, Boxes, FileSearch, FileText, Gauge, ListChecks, Search, Tags, TrendingUp } from "lucide-react";
import { GrowthEngineHub, type GrowthEngineModule } from "@/features/product-architecture/growth-engine-hub";

const modules: GrowthEngineModule[] = [
  { title: "网站审计", description: "查看真实网站抓取结果、页面结构、链接、robots.txt、站点地图和已检测的 Schema。", href: "/crawl", icon: FileSearch },
  { title: "SEO 分析器", description: "查看各项目最新保存的技术、Schema 与内容信号。", href: "/analyzer", icon: Gauge },
  { title: "技术 SEO", description: "基于现有抓取与分析证据，发现阻碍搜索引擎抓取和理解的技术问题。", href: "/analyzer", icon: BarChart3 },
  { title: "Schema 分析", description: "检查 JSON-LD 覆盖情况，并将缺失的结构化数据转化为优化任务。", href: "/analyzer", icon: Tags },
  { title: "关键词研究", description: "复用 Campaign 与查询能力，作为关键词和搜索意图研究的当前基础。", href: "/campaigns", icon: Search, status: "foundation" },
  { title: "内容优化", description: "在统一优化中心管理内容与技术建议，不建立重复的任务系统。", href: "/optimization", icon: FileText, status: "foundation" },
  { title: "索引状态", description: "复用抓取结果检查可访问性、robots.txt 与站点地图，为后续索引覆盖数据保留入口。", href: "/crawl", icon: ListChecks, status: "foundation" },
  { title: "排名追踪", description: "通过已有 Growth 与监控数据查看趋势，后续接入真实关键词排名数据。", href: "/growth/overview", icon: TrendingUp, status: "planned" },
  { title: "网站资产库", description: "保留统一页面资产入口，作为后续多页面 SEO 能力的承载层。", href: "/inventory", icon: Boxes, status: "planned" },
];

export default function SeoGrowthPage() {
  return <GrowthEngineHub eyebrow="传统搜索增长" title="SEO 增长" description="从统一入口审计网站健康度、技术基础、Schema、关键词与内容，同时保留已有抓取和分析流程。" accent="seo" modules={modules} />;
}
