import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ProjectNotFoundPage() {
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold">项目不存在或无权访问</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">请确认当前账号是否拥有该项目，或返回项目列表重新选择。</p>
        <Button asChild className="mt-6">
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" /> 返回项目列表
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
