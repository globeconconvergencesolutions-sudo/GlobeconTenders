import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { requireSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { BID_STAGES, bidPipeline, orgMemberships, pipelineActivity, pipelineTasks, tenders, users } from "@/lib/db/schema";
import { getOrgContext } from "@/lib/tenant/org-context";

const stageSchema = z.object({
  tenderId: z.number().int().positive(),
  stage: z.enum(BID_STAGES),
  notes: z.string().max(2000).optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  internalDeadline: z.string().max(40).nullable().optional(),
});

const taskSchema = z.object({
  tenderId: z.number().int().positive(),
  title: z.string().min(2).max(200),
  dueOn: z.string().max(20).optional(),
});

async function guard() {
  const user = await requireSessionUser();
  if (!user.orgId) throw new Error("UNAUTHORIZED");
  if (user.role === "viewer") throw new Error("FORBIDDEN");
  const org = await getOrgContext();
  if (!org.features.pis) throw new Error("FEATURE_DISABLED");
  const db = getDb();
  if (!db) throw new Error("Database not configured");
  return { user, db, orgId: user.orgId };
}

export async function POST(request: Request) {
  try {
    const { user, db, orgId } = await guard();
    const payload = await request.json();
    if (payload.kind === "task") {
      const body = taskSchema.parse(payload);
      await db.insert(pipelineTasks).values({
        orgId,
        tenderId: body.tenderId,
        title: body.title,
        dueOn: body.dueOn,
      });
      await db.insert(pipelineActivity).values({
        orgId,
        tenderId: body.tenderId,
        actorId: user.id,
        action: "task",
        detail: body.title,
      });
      return NextResponse.json({ ok: true });
    }

    if (payload.kind === "task-toggle") {
      const body = z
        .object({
          taskId: z.number().int().positive(),
          done: z.boolean(),
        })
        .parse(payload);
      const [task] = await db
        .select()
        .from(pipelineTasks)
        .where(and(eq(pipelineTasks.id, body.taskId), eq(pipelineTasks.orgId, orgId)))
        .limit(1);
      if (!task) throw new Error("NOT_FOUND");
      await db
        .update(pipelineTasks)
        .set({ done: body.done })
        .where(eq(pipelineTasks.id, task.id));
      await db.insert(pipelineActivity).values({
        orgId,
        tenderId: task.tenderId,
        actorId: user.id,
        action: body.done ? "task done" : "task reopened",
        detail: task.title,
      });
      return NextResponse.json({ ok: true });
    }

    const body = stageSchema.parse(payload);
    const internalDeadline =
      body.internalDeadline === undefined
        ? undefined
        : body.internalDeadline
          ? new Date(body.internalDeadline.length === 10 ? `${body.internalDeadline}T12:00:00` : body.internalDeadline)
          : null;
    if (internalDeadline && !Number.isFinite(internalDeadline.getTime())) {
      throw new Error("NOT_FOUND");
    }
    const [tender] = await db
      .select({ id: tenders.id })
      .from(tenders)
      .where(and(eq(tenders.id, body.tenderId), eq(tenders.orgId, orgId)))
      .limit(1);
    if (!tender) throw new Error("NOT_FOUND");

    const [existing] = await db
      .select()
      .from(bidPipeline)
      .where(and(eq(bidPipeline.orgId, orgId), eq(bidPipeline.tenderId, body.tenderId)))
      .limit(1);

    if (existing) {
      await db
        .update(bidPipeline)
        .set({
          stage: body.stage,
          notes: body.notes ?? existing.notes,
          assigneeId: body.assigneeId === undefined ? existing.assigneeId : body.assigneeId,
          internalDeadline:
            internalDeadline === undefined ? existing.internalDeadline : internalDeadline,
          updatedAt: new Date(),
        })
        .where(eq(bidPipeline.id, existing.id));
    } else {
      await db.insert(bidPipeline).values({
        orgId,
        tenderId: body.tenderId,
        stage: body.stage,
        notes: body.notes,
        assigneeId: body.assigneeId ?? null,
        internalDeadline: internalDeadline ?? null,
      });
    }

    let assigneeName: string | null = null;
    if (body.assigneeId) {
      const [member] = await db
        .select({ name: users.name })
        .from(users)
        .innerJoin(orgMemberships, eq(orgMemberships.userId, users.id))
        .where(and(eq(users.id, body.assigneeId), eq(orgMemberships.orgId, orgId)))
        .limit(1);
      assigneeName = member?.name ?? null;
    }

    await db.insert(pipelineActivity).values({
      orgId,
      tenderId: body.tenderId,
      actorId: user.id,
      action: "stage",
      detail: [
        body.stage,
        assigneeName ? `assignee ${assigneeName}` : null,
        body.notes ? "notes updated" : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
