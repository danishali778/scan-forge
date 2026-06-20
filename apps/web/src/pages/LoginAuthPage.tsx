import { LoginAuthForm } from "@/components/auth/LoginAuthForm";
import { PlatformStatusPanel } from "@/components/auth/PlatformStatusPanel";
import { useCurrentUser, useLogin } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import type { LoginFormValues } from "@/lib/validation";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function LoginAuthPage() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const login = useLogin();

  useEffect(() => {
    if (currentUser.data?.authenticated) {
      navigate("/projects/new", { replace: true });
    }
  }, [currentUser.data?.authenticated, navigate]);

  const handleSubmit = async (values: LoginFormValues) => {
    await login.mutateAsync(values);
    navigate("/projects/new", { replace: true });
  };

  return (
    <main className="min-h-screen bg-white text-sf-text">
      <div className="grid min-h-screen lg:grid-cols-[1.02fr_1fr]">
        <div className="hidden lg:block">
          <PlatformStatusPanel />
        </div>
        <div className="flex min-h-screen items-center justify-center bg-white">
          <LoginAuthForm
            errorMessage={login.error ? getErrorMessage(login.error, "Invalid email or password.") : undefined}
            isSubmitting={login.isPending}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </main>
  );
}

export default LoginAuthPage;
