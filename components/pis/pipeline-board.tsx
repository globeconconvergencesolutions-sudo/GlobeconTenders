"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { controlClass, Field } from "@/components/pis/fields";
import { postJson, SaveButton } from "@/components/pis/save-button";
import { formatDay, stageLabel } from "@/lib/pis/format";
import { Input } from "@/components/ui/input";

export type PipelineCard = {
  tenderId: number;
  title: string;
  stage: string;
  officialDeadline: string;
  internalDeadline: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  notes: string | null;
  discoveredOnly: boolean;
  tasks: Array<{ id: number; title: string; done: boolean; dueOn: string | null }>;
  activity: Array<{ id: number; action: string; detail: string | null; at: string }>;
};

const STAGE_HELP: Record<string, string> = {
  DISCOVERED: "Not accepted yet. These are watchlist matches waiting for someone to take them on.",
  REVIEWING: "Accepted. Someone is reading the notice.",
  QUALIFICATION_CHECK: "The check against the company profile is in progress.",
  SHORTLISTED: "Worth a closer look.",
  BID_NO_BID: "The team is deciding whether to pursue it.",
  PREPARING: "A bid is being prepared.",
  SUBMITTED: "The bid has been sent.",
  AWARDED: "The buyer awarded it.",
  UNSUCCESSFUL: "The bid was not awarded.",
  CANCELLED: "The notice or the pursuit was cancelled.",
  ARCHIVED: "Kept for the record. Not active work.",
};

export function PipelineBoard({
  stages,
  cards,
  members,
  canEdit,
}: {
  stages: string[];
  cards: PipelineCard[];
  members: Array<{ id: number; name: string }>;
  canEdit: boolean;
}) {
  const [stageFilter, setStageFilter] = useState(stages[0] ?? "DISCOVERED");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = cards.find((card) => card.tenderId === selectedId) ?? null;
  const byStage = useMemo(() => {
    const map = new Map<string, PipelineCard[]>();
    for (const stage of stages) map.set(stage, []);
    for (const card of cards) {
      const list = map.get(card.stage) ?? [];
      list.push(card);
      map.set(card.stage, list);
    }
    return map;
  }, [cards, stages]);

  return (
    <div className="space-y-8">
      <div className="lg:hidden">
        <Field label="Stage">
          <select
            className={controlClass}
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value)}
          >
            {stages.map((stage) => (
              <option key={stage} value={stage}>
                {stageLabel(stage)} ({byStage.get(stage)?.length ?? 0})
              </option>
            ))}
          </select>
        </Field>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {STAGE_HELP[stageFilter] ?? "A person moves work into this stage."}
        </p>
        <div className="mt-4 space-y-3">
          {(byStage.get(stageFilter) ?? []).map((card) => (
            <CardButton key={card.tenderId} card={card} onOpen={() => setSelectedId(card.tenderId)} />
          ))}
        </div>
      </div>

      <div className="hidden gap-4 overflow-x-auto pb-2 lg:flex">
        {stages.map((stage) => (
          <section key={stage} className="w-80 shrink-0 rounded-2xl bg-slate-100/80 p-4">
            <h2 className="text-sm font-semibold text-slate-800">{stageLabel(stage)}</h2>
            <p className="mt-1 min-h-10 text-xs leading-relaxed text-slate-500">
              {STAGE_HELP[stage] ?? "A person moves work into this stage."}
            </p>
            <div className="mt-4 space-y-3">
              {(byStage.get(stage) ?? []).map((card) => (
                <CardButton key={card.tenderId} card={card} onOpen={() => setSelectedId(card.tenderId)} />
              ))}
              {(byStage.get(stage) ?? []).length === 0 && (
                <p className="text-sm text-slate-500">Nothing in this stage.</p>
              )}
            </div>
          </section>
        ))}
      </div>

      {selected && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{selected.title}</h2>
              <p className="mt-2 text-sm text-slate-600">
                Official close {formatDay(selected.officialDeadline)}
              </p>
            </div>
            <Link href={`/opportunities/${selected.tenderId}`} className="text-sm text-blue-700">
              Open opportunity
            </Link>
          </div>
          {canEdit ? (
            <CardEditor card={selected} stages={stages} members={members} />
          ) : (
            <p className="mt-6 text-sm text-slate-600">Read-only. An editor can move this card.</p>
          )}
          <h3 className="mt-8 text-sm font-semibold text-slate-900">Activity</h3>
          <ul className="mt-3 space-y-3">
            {selected.activity.map((item) => (
              <li key={item.id} className="text-sm leading-relaxed text-slate-700">
                {formatDay(item.at)} · {item.action}
                {item.detail ? ` · ${item.detail}` : ""}
              </li>
            ))}
            {selected.activity.length === 0 && (
              <li className="text-sm text-slate-500">No activity yet.</li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}

function CardButton({ card, onOpen }: { card: PipelineCard; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm"
    >
      <span className="block text-sm font-medium leading-snug text-slate-900">{card.title}</span>
      <span className="mt-2 block text-xs text-slate-500">
        Official {formatDay(card.officialDeadline)}
        {card.internalDeadline ? ` · internal ${formatDay(card.internalDeadline)}` : ""}
      </span>
      {card.assigneeName && (
        <span className="mt-1 block text-xs text-slate-500">{card.assigneeName}</span>
      )}
    </button>
  );
}

function CardEditor({
  card,
  stages,
  members,
}: {
  card: PipelineCard;
  stages: string[];
  members: Array<{ id: number; name: string }>;
}) {
  const [stage, setStage] = useState(card.discoveredOnly ? "REVIEWING" : card.stage);
  const [assigneeId, setAssigneeId] = useState(card.assigneeId ? String(card.assigneeId) : "");
  const [internalDeadline, setInternalDeadline] = useState(
    card.internalDeadline ? card.internalDeadline.slice(0, 10) : "",
  );
  const [notes, setNotes] = useState(card.notes ?? "");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const router = useRouter();

  return (
    <div className="mt-6 grid gap-6">
      <Field label="Stage">
        <select className={controlClass} value={stage} onChange={(event) => setStage(event.target.value)}>
          {stages
            .filter((item) => item !== "DISCOVERED")
            .map((item) => (
              <option key={item} value={item}>
                {stageLabel(item)}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Assignee">
        <select className={controlClass} value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Internal deadline" hint="This is your team’s date. The official close stays on the notice.">
        <Input className="h-11" type="date" value={internalDeadline} onChange={(event) => setInternalDeadline(event.target.value)} />
      </Field>
      <Field label="Notes">
        <textarea className={`${controlClass} min-h-28 py-3`} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <SaveButton
        label="Save card"
        onSave={() =>
          postJson("/api/pis/pipeline", {
            tenderId: card.tenderId,
            stage,
            notes,
            assigneeId: assigneeId ? Number(assigneeId) : null,
            internalDeadline: internalDeadline || null,
          })
        }
      />
      <div className="border-t border-slate-100 pt-6">
        <h3 className="text-sm font-semibold text-slate-900">Tasks</h3>
        <ul className="mt-3 space-y-3">
          {card.tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-4 text-sm">
              <span>
                {task.title}
                {task.dueOn ? ` · due ${task.dueOn}` : ""}
              </span>
              <button
                type="button"
                className="text-blue-700"
                onClick={() => {
                  void postJson("/api/pis/pipeline", {
                    kind: "task-toggle",
                    taskId: task.id,
                    done: !task.done,
                  }).then(() => router.refresh());
                }}
              >
                {task.done ? "Reopen" : "Mark done"}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input className="h-11" placeholder="Task" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
          <Input className="h-11" type="date" value={taskDue} onChange={(event) => setTaskDue(event.target.value)} />
        </div>
        <div className="mt-4">
          <SaveButton
            label="Add task"
            onSave={async () => {
              await postJson("/api/pis/pipeline", {
                kind: "task",
                tenderId: card.tenderId,
                title: taskTitle,
                dueOn: taskDue || undefined,
              });
              setTaskTitle("");
              setTaskDue("");
            }}
          />
        </div>
      </div>
    </div>
  );
}
