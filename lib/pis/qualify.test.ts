import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deadlineHistoryNote,
  isDuplicateCandidate,
  judgeRequirement,
  scanDepth,
  summarizeQualification,
} from "./decisions";

const taxLine =
  "The bidder must hold a valid tax compliance certificate for at least three years.";

describe("qualification decisions", () => {
  it("does not score an empty company profile", () => {
    const row = judgeRequirement(taxLine, "", false);
    const summary = summarizeQualification({
      hasProfile: false,
      rows: [row],
      description: taxLine,
    });
    assert.equal(row.status, "UNVERIFIED");
    assert.equal(summary.overall, "INSUFFICIENT INFORMATION");
    assert.equal(summary.qualificationScore, null);
  });

  it("keeps a failed mandatory requirement visible", () => {
    const row = judgeRequirement(
      taxLine,
      "The firm does not hold a valid tax compliance certificate.",
      true,
    );
    const summary = summarizeQualification({
      hasProfile: true,
      rows: [row],
      description: taxLine,
    });
    assert.equal(row.status, "DOES NOT MEET");
    assert.equal(summary.overall, "REQUIREMENTS NOT SATISFIED");
    assert.match(summary.mismatchExplanation, /cannot override/);
  });

  it("treats missing evidence as unverified", () => {
    const row = judgeRequirement(
      taxLine,
      "Globecon builds roads and bridges across Kenya.",
      true,
    );
    assert.equal(row.status, "UNVERIFIED");
    assert.match(row.evidenceNote, /evidence|document/i);
  });

  it("meets when the profile shares the requirement terms", () => {
    const row = judgeRequirement(
      taxLine,
      "Globecon holds a valid tax compliance certificate issued in Kenya.",
      true,
    );
    assert.equal(row.status, "MEETS");
  });

  it("recommends a partner when the notice asks and a criterion is met", () => {
    const line =
      "The consultant must demonstrate relevant bridge design experience and client references.";
    const row = judgeRequirement(
      line,
      "Our bridge design experience includes three client references.",
      true,
    );
    const summary = summarizeQualification({
      hasProfile: true,
      rows: [row, { mandatory: true, status: "UNVERIFIED" }],
      description: "Bids may be submitted as a joint venture with a local partner.",
    });
    assert.equal(row.status, "MEETS");
    assert.equal(summary.action, "BID WITH PARTNER/JV");
  });

  it("keeps both dates when a deadline changes", () => {
    const note = deadlineHistoryNote("2026-10-01", "2026-10-20");
    assert.match(note, /2026-10-01/);
    assert.match(note, /2026-10-20/);
    assert.match(note, /earlier date stays/);
  });

  it("marks an unreadable document as an incomplete scan", () => {
    const depth = scanDepth({ description: "Short notice.", documentText: null });
    assert.equal(depth.deepScanStatus, "incomplete");
    assert.equal(depth.sourceKind, "metadata");
  });

  it("proposes duplicates only across sources", () => {
    const left = {
      id: 1,
      sourceId: 4,
      title: "Road supervision",
      buyer: "KeNHA",
      deadline: new Date("2026-11-01T00:00:00Z"),
      referenceId: "A",
    };
    assert.equal(
      isDuplicateCandidate(left, { ...left, id: 2, referenceId: "B" }),
      false,
    );
    assert.equal(
      isDuplicateCandidate(left, { ...left, id: 2, sourceId: 9, referenceId: "A" }),
      true,
    );
  });
});
