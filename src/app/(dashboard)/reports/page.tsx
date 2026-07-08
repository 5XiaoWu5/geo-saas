import { FileText } from "lucide-react";
import { reports } from "@/data/mock";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader title="Reports" description="Mock report library for executive, growth, and strategy reporting." action={<Button variant="outline">Create report</Button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.title} className="glass-panel border-white/10">
            <CardContent className="p-6">
              <FileText className="h-8 w-8 text-primary" />
              <h2 className="mt-5 font-semibold">{report.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{report.cadence} cadence · {report.audience}</p>
              <span className="mt-6 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs">{report.status}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
