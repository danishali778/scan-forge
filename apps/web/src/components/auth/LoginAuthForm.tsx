import {
  EyeOff,
  ExternalLink,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthMessageCard } from "@/components/auth/AuthMessageCard";
import { loginSchema, type LoginFormValues } from "@/lib/validation";

interface LoginAuthFormProps {
  errorMessage?: string;
  isSubmitting?: boolean;
  onSubmit: (values: LoginFormValues) => Promise<void> | void;
}

export function LoginAuthForm({ errorMessage, isSubmitting = false, onSubmit }: LoginAuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const submit = form.handleSubmit(async (values) => {
    const parsed = loginSchema.safeParse(values);

    if (!parsed.success) {
      setValidationMessage(parsed.error.issues[0]?.message ?? "Check your login details.");
      return;
    }

    setValidationMessage(null);
    await onSubmit(parsed.data);
  });

  const visibleError = validationMessage ?? errorMessage;

  return (
    <section className="mx-auto flex w-full max-w-[560px] flex-col px-6 py-10 sm:px-8 lg:px-0">
      <div className="mb-8 lg:hidden">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sf-running">
          ScopeForge
        </p>
      </div>

      <div>
        <h1 className="text-[32px] font-bold leading-tight text-slate-950">
          Welcome back
        </h1>
        <p className="mt-2 text-lg text-sf-muted">
          Sign in to your ScopeForge workspace
        </p>
      </div>

      <form
        className="mt-8"
        onSubmit={submit}
      >
        <label className="block" htmlFor="email">
          <span className="text-sm font-semibold text-slate-950">Email</span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-sf-border bg-white px-4 text-base text-slate-950 outline-none transition focus:border-sf-running focus:ring-4 focus:ring-teal-600/10"
            id="email"
            placeholder="danish.ali@acme.com"
            type="email"
            {...form.register("email")}
          />
        </label>

        <label className="mt-6 block" htmlFor="password">
          <span className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-950">
              Password
            </span>
            <button
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
              type="button"
            >
              Forgot password?
            </button>
          </span>
          <span className="relative mt-2 block">
            <input
              className="h-11 w-full rounded-md border border-sf-border bg-white px-4 pr-12 text-base text-slate-950 outline-none transition focus:border-sf-running focus:ring-4 focus:ring-teal-600/10"
              id="password"
              placeholder="Enter your password"
              type={showPassword ? "text" : "password"}
              {...form.register("password")}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-1 text-sf-muted hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              <EyeOff className="h-5 w-5" />
            </button>
          </span>
        </label>

        {visibleError ? (
          <div className="mt-3 flex items-center gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-red-500 text-xs">
              !
            </span>
            {visibleError}
          </div>
        ) : null}

        <button
          className="mt-4 flex h-12 w-full items-center justify-center gap-3 rounded-md bg-sf-running px-4 text-base font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          <LockKeyhole className="h-5 w-5" />
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-slate-700">
            <input
              checked={rememberDevice}
              className="h-4 w-4 rounded border-sf-border accent-blue-600"
              onChange={(event) => setRememberDevice(event.target.checked)}
              type="checkbox"
            />
            Remember this device
          </label>
          <button
            className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:text-blue-700"
            type="button"
          >
            Learn more
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>

        <div className="my-5 flex items-center gap-4 text-xs uppercase text-sf-muted">
          <span className="h-px flex-1 bg-sf-border" />
          OR
          <span className="h-px flex-1 bg-sf-border" />
        </div>

        <button
          className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-sf-border bg-white px-4 text-base font-medium text-slate-950 transition hover:bg-slate-50"
          type="button"
        >
          <KeyRound className="h-5 w-5" />
          Sign in with SSO
        </button>
      </form>

      <div className="mt-6 flex items-start gap-4 rounded-lg border border-sf-border bg-white px-5 py-4 shadow-sm">
        <ShieldCheck className="mt-0.5 h-7 w-7 shrink-0 text-sf-muted" />
        <div>
          <h3 className="text-sm font-semibold text-sf-text">
            Your session is protected
          </h3>
          <p className="mt-1 text-sm leading-5 text-sf-muted">
            We enforce device checks, session timeouts, and audit logging for
            all actions taken in ScopeForge.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <AuthMessageCard
          actionLabel="Refresh"
          body="Your previous session has expired. Please sign in again."
          title="Session expired"
          tone="warning"
        />
        <AuthMessageCard
          actionLabel="Contact owner"
          body="You don't have access to any workspaces yet."
          title="Access requires a workspace invitation"
          tone="info"
        />
      </div>

      <div className="mt-8 flex items-start gap-3 text-sm text-sf-muted">
        <CircleHelpIcon />
        <p>
          <span className="font-semibold text-sf-text">Need help?</span>
          <br />
          Contact your workspace owner or email{" "}
          <a className="font-medium text-blue-600" href="mailto:support@scopeforge.com">
            support@scopeforge.com
          </a>
        </p>
      </div>
    </section>
  );
}

function CircleHelpIcon() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-sf-muted text-xs font-semibold text-sf-muted">
      ?
    </span>
  );
}
