import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }

  const db = drizzle(neon(url));

  const victor = await db.execute(sql`
    SELECT u.id, u.email, u.name, u.is_platform_admin,
           o.id as org_id, o.slug, o.name as org_name, o.plan, o.status,
           m.role, m.is_active, m.created_at
    FROM users u
    JOIN org_memberships m ON m.user_id = u.id
    JOIN organizations o ON o.id = m.org_id
    WHERE u.email = 'victor@globeconcs.com'
    ORDER BY m.created_at
  `);

  console.log("=== Victor memberships ===");
  console.log(JSON.stringify(victor.rows, null, 2));

  const multi = await db.execute(sql`
    SELECT u.email, u.name,
           array_agg(o.slug ORDER BY o.slug) as org_slugs,
           COUNT(*)::int as org_count
    FROM users u
    JOIN org_memberships m ON m.user_id = u.id AND m.is_active = true
    JOIN organizations o ON o.id = m.org_id
    GROUP BY u.id, u.email, u.name
    HAVING COUNT(*) > 1
  `);

  console.log("\n=== All multi-org users ===");
  console.log(JSON.stringify(multi.rows, null, 2));

  const acme = await db.execute(sql`
    SELECT o.id, o.slug, o.name, o.plan, o.status, o.created_at,
           (SELECT COUNT(*)::int FROM org_memberships m
            WHERE m.org_id = o.id AND m.is_active) as active_members
    FROM organizations o
    WHERE o.slug = 'acme'
  `);

  console.log("\n=== Acme org ===");
  console.log(JSON.stringify(acme.rows, null, 2));

  const allOrgs = await db.execute(sql`
    SELECT o.slug, o.name, o.plan,
           COUNT(m.user_id)::int as members
    FROM organizations o
    LEFT JOIN org_memberships m ON m.org_id = o.id AND m.is_active = true
    GROUP BY o.id, o.slug, o.name, o.plan
    ORDER BY o.id
  `);

  console.log("\n=== All orgs ===");
  console.log(JSON.stringify(allOrgs.rows, null, 2));

  const allMemberships = await db.execute(sql`
    SELECT u.email, o.slug, m.role, m.created_at
    FROM org_memberships m
    JOIN users u ON u.id = m.user_id
    JOIN organizations o ON o.id = m.org_id
    ORDER BY u.email, m.created_at
  `);

  console.log("\n=== All memberships ===");
  for (const row of allMemberships.rows) {
    console.log(
      `${row.email} → ${row.slug} (${row.role}) @ ${row.created_at}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
