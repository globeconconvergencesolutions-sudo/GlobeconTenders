import { User } from "lucide-react";

import { NotificationSettings } from "@/components/profile/notification-settings";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import {
  ROLE_BADGE_CLASS,
  getRoleGuide,
} from "@/lib/auth/role-guide";
import { cn } from "@/lib/utils";

export default async function ProfilePage() {
  const user = await getSessionUser();
  const guide = user ? getRoleGuide(user.role) : null;

  return (
    <div className="flex min-h-full flex-col bg-slate-50 dark:bg-background">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 dark:border-border dark:bg-card sm:px-6 lg:px-8 lg:py-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Account, email alerts, and the pages this role can open
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
                <dd className="mt-2 flex flex-wrap items-center gap-2">
                  {user ? (
                    <Badge className={cn("font-normal", ROLE_BADGE_CLASS[user.role])}>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  ) : (
                    "—"
                  )}
                  {guide ? (
                    <span className="text-muted-foreground">{guide.tagline}</span>
                  ) : null}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-100 px-4 py-3 dark:border-border">
                <dt className="text-muted-foreground">Alert delivery</dt>
                <dd className="mt-1 font-medium">Gmail digest</dd>
              </div>
            </dl>
            {guide ? (
              <div className="mt-6 space-y-4 border-t border-slate-100 pt-6 dark:border-border">
                <p className="text-sm text-muted-foreground">{guide.summary}</p>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pages you can open
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {guide.pages.map((page) => (
                      <li key={page.href}>
                        {page.label}
                        {page.note ? (
                          <span className="text-muted-foreground">
                            {" "}
                            — {page.note}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Out of scope
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {guide.cannot.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
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
