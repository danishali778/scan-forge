import type { ReactNode } from "react";

import { getErrorMessage } from "@/lib/errors";

type RequestStateProps = {
  title: string;
  detail?: string;
  action?: ReactNode;
  className?: string;
};

export function FullPageState({ title, detail, action }: RequestStateProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-6 text-slate-900">
      <StateCard title={title} detail={detail} action={action} />
    </main>
  );
}

export function StateCard({ title, detail, action, className = "" }: RequestStateProps) {
  return (
    <div className={`w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm ${className}`}>
      <h1 className="text-lg font-semibold">{title}</h1>
      {detail ? <p className="mt-2 text-sm text-slate-500">{detail}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ title = "Loading", detail = "Preparing the latest data." }: Partial<RequestStateProps>) {
  return <StateCard title={title} detail={detail} />;
}

export function ErrorState({
  error,
  title = "Something went wrong",
  fallback,
  action,
}: {
  error: unknown;
  title?: string;
  fallback?: string;
  action?: ReactNode;
}) {
  return <StateCard title={title} detail={getErrorMessage(error, fallback)} action={action} />;
}

export function EmptyState({ title = "Nothing to show yet", detail, action }: Partial<RequestStateProps>) {
  return <StateCard title={title} detail={detail} action={action} />;
}
