import { LoginAuthForm } from "@/components/auth/LoginAuthForm";
import { PlatformStatusPanel } from "@/components/auth/PlatformStatusPanel";

export function LoginAuthPage() {
  return (
    <main className="min-h-screen bg-white text-sf-text">
      <div className="grid min-h-screen lg:grid-cols-[1.02fr_1fr]">
        <div className="hidden lg:block">
          <PlatformStatusPanel />
        </div>
        <div className="flex min-h-screen items-center justify-center bg-white">
          <LoginAuthForm />
        </div>
      </div>
    </main>
  );
}

export default LoginAuthPage;
