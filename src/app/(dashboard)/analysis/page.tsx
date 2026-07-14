import { analysisItems } from "@/data/mock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page";

export default function AnalysisPage() {
  return (
    <div>
      <PageHeader title="分析" description="基于模拟 GEO 信号和评分卡片的静态分析工作台。" />
      <div className="grid gap-4 md:grid-cols-2">
        {analysisItems.map((item) => (
          <Card key={item.topic} className="glass-panel border-white/10">
            <CardHeader><CardTitle>{item.topic}</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-4 flex items-end justify-between"><span className="text-4xl font-semibold">{item.score}</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{item.trend}</span></div>
              <div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-primary" style={{ width: `${item.score}%` }} /></div>
              <p className="mt-4 text-sm text-muted-foreground">来源界面：{item.engine}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
