import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden border-r border-white/10 p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">GeoPilot AI</p>
            <p className="text-xs text-muted-foreground">Enterprise GEO platform</p>
          </div>
        </div>
        <div className="max-w-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-primary">Command Center</p>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight">Control how enterprise buyers discover your brand in AI answers.</h1>
          <p className="mt-6 text-lg text-muted-foreground">A dark, modular SaaS shell prepared for future Generative Engine Optimization workflows.</p>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <Card className="glass-panel w-full max-w-md border-white/10">
          <CardHeader>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Use demo credentials to preview the project skeleton.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="admin@geopilot.ai" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" defaultValue="geopilot-demo" />
              </div>
              <Button type="button" className="mt-2 w-full">Continue to dashboard</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
