import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell title="Acessar Next Slide" subtitle="Entre para gerenciar seus módulos de gestão à vista.">
      <Suspense><LoginForm /></Suspense>
    </AuthShell>
  );
}
