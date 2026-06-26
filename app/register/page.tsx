import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthShell title="Criar organização" subtitle="Comece com uma licença trial e publique sua primeira TV em minutos.">
      <RegisterForm />
    </AuthShell>
  );
}
