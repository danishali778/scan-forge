import { CheckCircle2, CircleHelp, Clock3, Link2, XCircle } from "lucide-react";

import type { AdminRole, AuthLinkStatus, PermissionGrant, UserStatus } from "@/types/admin-users-roles";

export function UserAvatar({
  initials,
  tone,
  size = "md",
}: {
  initials: string;
  tone: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-11 w-11 text-sm" : size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs";

  return (
    <span
      className={[
        "grid shrink-0 place-items-center rounded-full font-bold ring-2 ring-offset-0",
        sizeClass,
        tone,
      ].join(" ")}
    >
      {initials}
    </span>
  );
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const tone =
    status === "Active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "Invited"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : "border-red-200 bg-red-50 text-red-700";

  return <span className={`rounded border px-2 py-0.5 text-[12px] font-semibold ${tone}`}>{status}</span>;
}

export function RoleBadge({ role }: { role: AdminRole }) {
  const toneByRole: Record<AdminRole, string> = {
    Owner: "border-teal-300 bg-teal-50 text-teal-800",
    Admin: "border-slate-300 bg-slate-50 text-slate-800",
    Operator: "border-blue-300 bg-blue-50 text-blue-700",
    Reviewer: "border-violet-300 bg-violet-50 text-violet-700",
    Viewer: "border-slate-300 bg-white text-slate-700",
  };

  return (
    <span className={`rounded border px-2 py-0.5 text-[12px] font-semibold ${toneByRole[role]}`}>
      {role}
    </span>
  );
}

export function AuthLinkBadge({ status }: { status: AuthLinkStatus }) {
  if (status === "Linked") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-700">
        <Link2 className="h-3.5 w-3.5" />
        Linked
      </span>
    );
  }

  if (status === "Pending") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-orange-600">
        <Clock3 className="h-3.5 w-3.5" />
        Pending
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
      <CircleHelp className="h-3.5 w-3.5" />
      Unknown
    </span>
  );
}

export function PermissionCell({ grant }: { grant: PermissionGrant }) {
  if (grant === "full") {
    return (
      <span className="inline-flex items-center justify-center text-emerald-700" title="Allowed">
        <CheckCircle2 className="h-4 w-4" />
      </span>
    );
  }

  if (grant === "none") {
    return (
      <span className="inline-flex items-center justify-center text-red-500" title="Not allowed">
        <XCircle className="h-4 w-4" />
      </span>
    );
  }

  return <span className="text-[12px] font-medium text-slate-600">View</span>;
}
