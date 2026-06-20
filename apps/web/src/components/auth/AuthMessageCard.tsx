import { CircleHelp, Info, TriangleAlert, type LucideIcon } from "lucide-react";

type AuthMessageTone = "protected" | "warning" | "info";

type AuthMessageCardProps = {
  tone: AuthMessageTone;
  title: string;
  body: string;
  actionLabel?: string;
};

const toneStyles: Record<
  AuthMessageTone,
  {
    icon: LucideIcon;
    iconClassName: string;
    cardClassName: string;
  }
> = {
  protected: {
    icon: CircleHelp,
    iconClassName: "text-sf-muted",
    cardClassName: "border-sf-border bg-white",
  },
  warning: {
    icon: TriangleAlert,
    iconClassName: "text-sf-warning",
    cardClassName: "border-amber-200 bg-amber-50/45",
  },
  info: {
    icon: Info,
    iconClassName: "text-blue-600",
    cardClassName: "border-blue-200 bg-blue-50/35",
  },
};

export function AuthMessageCard({
  tone,
  title,
  body,
  actionLabel,
}: AuthMessageCardProps) {
  const style = toneStyles[tone];
  const Icon = style.icon;

  return (
    <section
      className={`flex items-start gap-4 rounded-lg border px-5 py-4 shadow-sm ${style.cardClassName}`}
    >
      <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${style.iconClassName}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-sf-text">{title}</h3>
          {actionLabel ? (
            <button
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
              type="button"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-sm leading-5 text-sf-muted">{body}</p>
      </div>
    </section>
  );
}
