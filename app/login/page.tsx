import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell title="Bem-vindo de volta!" subtitle="Acesse sua conta para continuar">
      <Suspense><LoginForm /></Suspense>
    </AuthShell>
  );
}
