import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { RoleAccessGuide } from "@/components/admin/role-access-guide";
import { UsersManagement } from "@/components/admin/users-management";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";

export default async function AdminUsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (!hasPermission(user.role, "users:read")) {
    redirect("/");
  }

  return (
    <div className="flex min-h-full flex-col bg-slate-50 dark:bg-background">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 dark:border-border dark:bg-card sm:px-6 lg:px-8 lg:py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Team management
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Invite colleagues and assign a role. Each role is limited to the
              pages and actions listed below.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <RoleAccessGuide actorRole={user.role} />
        <UsersManagement
          actorRole={user.role}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
