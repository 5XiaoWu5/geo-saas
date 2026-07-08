"use client";

import { Building2 } from "lucide-react";
import { useWorkspace } from "@/features/workspace";
import { Select } from "@/components/ui/select";

export function WorkspaceSwitcher() {
  const { workspace, workspaces, loading, switchWorkspace } = useWorkspace();

  return (
    <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 md:flex">
      <Building2 className="h-4 w-4 text-primary" />
      <Select value={workspace.id} disabled={loading} onChange={(event) => void switchWorkspace(event.target.value)} className="h-7 w-44 border-0 bg-transparent px-0 py-0 focus-visible:ring-0">
        {workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Select>
    </div>
  );
}
