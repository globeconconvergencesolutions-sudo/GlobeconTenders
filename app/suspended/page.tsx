import { Building2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PLATFORM_PRODUCT_NAME } from "@/lib/tenant/config";

export default function SuspendedPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950 px-6">
      <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-white">Workspace suspended</h1>
        <p className="mt-2 text-sm text-slate-400">
          This {PLATFORM_PRODUCT_NAME} organization is suspended. Contact your administrator
          or Globcons support to restore access.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="mailto:support@globeconcs.com">Contact support</Link>
        </Button>
      </div>
    </div>
  );
}
