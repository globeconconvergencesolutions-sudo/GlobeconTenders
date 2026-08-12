import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { z } from "zod";

import { hasPermission } from "@/lib/auth/permissions";
import { requireSessionUser } from "@/lib/auth/session";
import { removeIdsFromAllUserFilters } from "@/lib/catalog/filter-state";
import { getDb } from "@/lib/db";
import { serviceLines, sources, tenders } from "@/lib/db/schema";

const archiveSchema = z.object({
  action: z.enum(["archive", "restore"]),
});

export type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export async function archiveSource(id: number) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const [source] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, id))
    .limit(1);

  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  if (source.archivedAt) {
    return NextResponse.json({ error: "Source is already archived" }, { status: 400 });
  }

  const [updated] = await db
    .update(sources)
    .set({ archivedAt: new Date(), enabled: false })
    .where(eq(sources.id, id))
    .returning();

  await removeIdsFromAllUserFilters("sourceIds", [id], source.orgId);

  return NextResponse.json({ source: updated, archived: true });
}

export async function restoreSource(id: number) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const [source] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, id))
    .limit(1);

  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  if (!source.archivedAt) {
    return NextResponse.json({ error: "Source is not archived" }, { status: 400 });
  }

  const [updated] = await db
    .update(sources)
    .set({ archivedAt: null, enabled: true })
    .where(eq(sources.id, id))
    .returning();

  return NextResponse.json({ source: updated, restored: true });
}

export async function deleteSourcePermanently(id: number) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const [source] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, id))
    .limit(1);

  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  if (source.isBuiltIn) {
    const [builtInTenderCount] = await db
      .select({ count: count() })
      .from(tenders)
      .where(eq(tenders.sourceId, id));

    if ((builtInTenderCount?.count ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `This built-in source has ${builtInTenderCount?.count} linked tender(s). Archive it instead of deleting.`,
          tenderCount: builtInTenderCount?.count ?? 0,
        },
        { status: 409 },
      );
    }
  } else {
    const [tenderCount] = await db
      .select({ count: count() })
      .from(tenders)
      .where(eq(tenders.sourceId, id));

    if ((tenderCount?.count ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `This source has ${tenderCount?.count} linked tender(s). Archive it instead of deleting.`,
          tenderCount: tenderCount?.count ?? 0,
        },
        { status: 409 },
      );
    }
  }

  await db.delete(sources).where(eq(sources.id, id));
  await removeIdsFromAllUserFilters("sourceIds", [id], source.orgId);

  return NextResponse.json({ deleted: true, id });
}

export async function handleSourcePatch(request: Request, context: RouteContext) {
  try {
    const user = await requireSessionUser();
    if (!hasPermission(user.role, "sources:update")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ error: "Invalid source id" }, { status: 400 });
    }

    const payload = archiveSchema.parse(await request.json());
    if (payload.action === "archive") return archiveSource(id);
    return restoreSource(id);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update source" },
      { status: 500 },
    );
  }
}

export async function handleSourceDelete(_request: Request, context: RouteContext) {
  try {
    const user = await requireSessionUser();
    if (!hasPermission(user.role, "sources:delete")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ error: "Invalid source id" }, { status: 400 });
    }

    return deleteSourcePermanently(id);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete source" },
      { status: 500 },
    );
  }
}

export async function archiveServiceLine(id: number) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const [line] = await db
    .select()
    .from(serviceLines)
    .where(eq(serviceLines.id, id))
    .limit(1);

  if (!line) {
    return NextResponse.json({ error: "Service line not found" }, { status: 404 });
  }

  if (line.archivedAt) {
    return NextResponse.json(
      { error: "Service line is already archived" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(serviceLines)
    .set({ archivedAt: new Date() })
    .where(eq(serviceLines.id, id))
    .returning();

  await removeIdsFromAllUserFilters("serviceLineIds", [id], line.orgId);

  return NextResponse.json({ serviceLine: updated, archived: true });
}

export async function restoreServiceLine(id: number) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const [line] = await db
    .select()
    .from(serviceLines)
    .where(eq(serviceLines.id, id))
    .limit(1);

  if (!line) {
    return NextResponse.json({ error: "Service line not found" }, { status: 404 });
  }

  if (!line.archivedAt) {
    return NextResponse.json(
      { error: "Service line is not archived" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(serviceLines)
    .set({ archivedAt: null })
    .where(eq(serviceLines.id, id))
    .returning();

  return NextResponse.json({ serviceLine: updated, restored: true });
}

export async function deleteServiceLinePermanently(id: number) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const [line] = await db
    .select()
    .from(serviceLines)
    .where(eq(serviceLines.id, id))
    .limit(1);

  if (!line) {
    return NextResponse.json({ error: "Service line not found" }, { status: 404 });
  }

  await db.delete(serviceLines).where(eq(serviceLines.id, id));
  await removeIdsFromAllUserFilters("serviceLineIds", [id], line.orgId);

  return NextResponse.json({ deleted: true, id });
}

export async function handleServiceLinePatch(
  request: Request,
  context: RouteContext,
) {
  try {
    const user = await requireSessionUser();
    if (!hasPermission(user.role, "service_lines:delete")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ error: "Invalid service line id" }, { status: 400 });
    }

    const payload = archiveSchema.parse(await request.json());
    if (payload.action === "archive") return archiveServiceLine(id);
    return restoreServiceLine(id);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update service line",
      },
      { status: 500 },
    );
  }
}

export async function handleServiceLineDelete(
  _request: Request,
  context: RouteContext,
) {
  try {
    const user = await requireSessionUser();
    if (!hasPermission(user.role, "service_lines:delete")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ error: "Invalid service line id" }, { status: 400 });
    }

    return deleteServiceLinePermanently(id);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete service line",
      },
      { status: 500 },
    );
  }
}
