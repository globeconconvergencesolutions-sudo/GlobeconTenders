import { User } from "lucide-react";

import { NotificationSettings } from "@/components/profile/notification-settings";
import { getSessionUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/permissions";

export default async function ProfilePage() {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-full flex-col bg-slate-50 dark:bg-background">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 dark:border-border dark:bg-card sm:px-6 lg:px-8 lg:py-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Account settings, email alerts, and team role
        </p>
      </header>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto grid w-full max-w-3xl gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card sm:p-8">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <User className="h-7 w-7" />
              </div>
              <div>
                <p className="text-lg font-semibold">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-slate-100 px-4 py-3 dark:border-border">
                <dt className="text-muted-foreground">Role</dt>
                <dd className="mt-1 font-medium">
                  {user ? ROLE_LABELS[user.role] : "—"}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-100 px-4 py-3 dark:border-border">
                <dt className="text-muted-foreground">Alert delivery</dt>
                <dd className="mt-1 font-medium">Gmail digest</dd>
              </div>
            </dl>
          </div>

          {user && (
            <NotificationSettings
              userName={user.name}
              userEmail={user.email}
            />
          )}
        </div>
      </div>
    </div>
  );
}
