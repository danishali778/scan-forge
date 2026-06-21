import { ArrowUp, Check, MinusCircle, Pencil, X } from "lucide-react";

import type { ReactNode } from "react";

import type { MemoryRecord } from "@/types/memory-library";

import { EmbeddingBadge, SecretScanBadge, StatusBadge, VisibilityBadge } from "./MemoryBadges";

interface SelectedMemoryPanelProps {
  memory: MemoryRecord | null;
  reviewNote: string;
  onReviewNoteChange: (note: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onPromote: () => void;
  onClose: () => void;
}

export function SelectedMemoryPanel({
  memory,
  reviewNote,
  onReviewNoteChange,
  onApprove,
  onReject,
  onPromote,
  onClose,
}: SelectedMemoryPanelProps) {
  return (
    <aside className="flex w-[500px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex h-[58px] items-center justify-between border-b border-slate-200 px-5">
        <h2 className="text-sm font-semibold text-slate-950">Selected memory</h2>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      {memory ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div
            className={`rounded-md border p-4 ${
              memory.status === "Blocked" || memory.secretScan === "Flagged"
                ? "border-red-200 bg-red-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="min-w-0 truncate text-base font-semibold text-slate-950">{memory.title}</h3>
              <StatusBadge status={memory.status} />
            </div>
            <p className="mt-3 text-sm leading-5 text-slate-700">
              {memory.secretScan === "Flagged"
                ? "Secret scan flagged sensitive content. Edit the content to remove secrets before approval."
                : memory.summary}
            </p>
          </div>

          <DetailBlock title="Summary">
            <p>{memory.summary}</p>
          </DetailBlock>

          <DetailBlock title="Content preview">
            {memory.secretScan === "Flagged" ? (
              <p>
                Avoid hardcoding API tokens in code. Example: token =
                <span className="mx-1 rounded bg-red-100 px-1 font-mono text-xs font-semibold text-red-700">
                  [redacted-api-token]
                </span>
                Use environment variables or a secrets manager instead.
              </p>
            ) : (
              <p>{memory.contentPreview}</p>
            )}
            <button type="button" className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-800">
              Show more
            </button>
          </DetailBlock>

          <div className="mt-5 space-y-4 text-xs text-slate-600">
            <DetailRow label="Source">
              <span className="rounded bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                {memory.sourceLabel}
              </span>
              <span>{memory.sourceContext}</span>
            </DetailRow>
            <DetailRow label="Visibility">
              <VisibilityBadge visibility={memory.visibility} />
              <span>{memory.project}</span>
            </DetailRow>
            <DetailRow label="Scope">
              <span>
                {memory.scope.project ? `Project: ${memory.scope.project}` : "Workspace: Acme Security"}
                {memory.scope.session ? (
                  <>
                    <br />
                    Session: {memory.scope.session}
                  </>
                ) : null}
              </span>
            </DetailRow>
            <DetailRow label="Secret scan">
              <SecretScanBadge status={memory.secretScan} />
              <span>{memory.secretScanDetail}</span>
            </DetailRow>
            <DetailRow label="Embedding status">
              <EmbeddingBadge status={memory.embedding} />
              <span>{memory.embeddingDetail}</span>
            </DetailRow>
          </div>

          <label className="mt-5 block">
            <span className="text-xs font-semibold text-slate-600">Review note</span>
            <textarea
              value={reviewNote}
              onChange={(event) => onReviewNoteChange(event.target.value)}
              className="mt-2 h-[66px] w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
              placeholder="Add a review note (optional)..."
            />
          </label>
        </div>
      ) : (
        <div className="grid flex-1 place-items-center px-8 text-center text-sm text-slate-500">
          Select a memory row to review details.
        </div>
      )}

      <div className="flex h-[66px] shrink-0 items-center gap-2 border-t border-slate-200 px-5">
        <button type="button" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700">
          <Pencil className="h-4 w-4" />
          Edit
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={!memory}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Check className="h-4 w-4" />
          Approve
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={!memory}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <MinusCircle className="h-4 w-4" />
          Reject
        </button>
        <button
          type="button"
          onClick={onPromote}
          disabled={!memory}
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          <ArrowUp className="h-4 w-4" />
          Promote
        </button>
      </div>
    </aside>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h4 className="text-xs font-semibold text-slate-600">{title}</h4>
      <div className="mt-2 text-sm leading-5 text-slate-700">{children}</div>
    </section>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
      <div className="font-semibold text-slate-600">{label}</div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 leading-5">{children}</div>
    </div>
  );
}
