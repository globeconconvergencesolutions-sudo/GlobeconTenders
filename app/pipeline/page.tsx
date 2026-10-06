import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";

import { PipelineBoard, type PipelineCard } from "@/components/pis/pipeline-board";
import { PageShell } from "@/components/pis/shell";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  BID_STAGES,
  bidPipeline,
  orgMemberships,
  pipelineActivity,
  pipelineTasks,
  tenders,
  users,
} from "@/lib/db/schema";
import { getActiveWatchlist, watchlistMatchSql } from "@/lib/pis/watchlist-feed";
import { redirectIfMarketsUnset } from "@/lib/pis/calibration";
import { getOrgContext } from "@/lib/tenant/org-context";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const org = await getOrgContext();
  if (!org.features.pis) redirect("/");
  const user = await getSessionUser();
  const db = getDb();
  if (!db || !user?.orgId) redirect("/login");
  await redirectIfMarketsUnset(user.orgId);

  const watchlist = await getActiveWatchlist(db, user.orgId);
  const [discovered, stored, tasks, activity, members] = await Promise.all([
    watchlist
      ? db
          .select({ id: tenders.id, title: tenders.title, deadline: tenders.deadline })
          .from(tenders)
          .where(and(eq(tenders.orgId, user.orgId), watchlistMatchSql(watchlist.lineIds)))
          .orderBy(desc(tenders.matchScore))
          .limit(30)
      : Promise.resolve([]),
    db
      .select({
        stage: bidPipeline.stage,
        tenderId: bidPipeline.tenderId,
        notes: bidPipeline.notes,
        assigneeId: bidPipeline.assigneeId,
        assigneeName: users.name,
        internalDeadline: bidPipeline.internalDeadline,
        title: tenders.title,
        officialDeadline: tenders.deadline,
      })
      .from(bidPipeline)
      .innerJoin(tenders, eq(tenders.id, bidPipeline.tenderId))
      .leftJoin(users, eq(users.id, bidPipeline.assigneeId))
      .where(eq(bidPipeline.orgId, user.orgId)),
    db.select().from(pipelineTasks).where(eq(pipelineTasks.orgId, user.orgId)),
    db
      .select()
      .from(pipelineActivity)
      .where(eq(pipelineActivity.orgId, user.orgId))
      .orderBy(desc(pipelineActivity.createdAt))
      .limit(200),
    db
      .select({ id: users.id, name: users.name })
      .from(orgMemberships)
      .innerJoin(users, eq(users.id, orgMemberships.userId))
      .where(and(eq(orgMemberships.orgId, user.orgId), eq(orgMemberships.isActive, true))),
  ]);

  const placed = new Set(stored.map((card) => card.tenderId));
  const cards: PipelineCard[] = [
    ...discovered
      .filter((row) => !placed.has(row.id))
      .map((row) => ({
        tenderId: row.id,
        title: row.title,
        stage: "DISCOVERED",
        officialDeadline: row.deadline.toISOString(),
        internalDeadline: null,
        assigneeId: null,
        assigneeName: null,
        notes: null,
        discoveredOnly: true,
        tasks: [],
        activity: [],
      })),
    ...stored.map((card) => ({
      tenderId: card.tenderId,
      title: card.title,
      stage: card.stage,
      officialDeadline: card.officialDeadline.toISOString(),
      internalDeadline: card.internalDeadline ? card.internalDeadline.toISOString() : null,
      assigneeId: card.assigneeId,
      assigneeName: card.assigneeName,
      notes: card.notes,
      discoveredOnly: false,
      tasks: tasks
        .filter((task) => task.tenderId === card.tenderId)
        .map((task) => ({
          id: task.id,
          title: task.title,
          done: task.done,
          dueOn: task.dueOn,
        })),
      activity: activity
        .filter((item) => item.tenderId === card.tenderId)
        .map((item) => ({
          id: item.id,
          action: item.action,
          detail: item.detail,
          at: item.createdAt.toISOString(),
        })),
    })),
  ];

  return (
    <PageShell
      wide
      title="Pipeline"
      lede="Work the firm has accepted. Discovered means not accepted yet. Official closing dates stay on the notice. Internal deadlines are yours."
    >
      <PipelineBoard
        stages={[...BID_STAGES]}
        cards={cards}
        members={members}
        canEdit={user.role !== "viewer"}
      />
    </PageShell>
  );
}
