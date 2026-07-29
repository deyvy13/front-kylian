"use client";
import { useState } from "react";
import { LogIn, Store } from "lucide-react";
import { Input } from "@/presentation/components/ui/Input";
import { Button } from "@/presentation/components/ui/Button";
import { AuroraText } from "@/presentation/components/ui/AuroraText";
import { useToast } from "@/presentation/components/ui/Toast";
import { useSession } from "@/presentation/components/auth/SessionProvider";
import { loginConCorreo } from "@/core/services/auth.service";

export function LoginPage() {
  const toast = useToast();
  const { setUser } = useSession();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!correo.trim() || !password) return toast.push("error", "Ingresa tu correo y contraseña.");
    setLoading(true);
    try {
      const user = await loginConCorreo(correo, password);
      setUser(user);
      toast.push("success", `Bienvenid@, ${user.nombre.split(" ")[0]}.`);
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "No se pudo iniciar sesión.");
    } finally { setLoading(false); }
  }

  return (
    <div className="login-aurora min-h-dvh grid place-items-center px-4 py-10">
      <div className="aurora-blob" aria-hidden />
      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b from-[color:var(--primary)] to-[#0056d6] text-white shadow-[0_10px_30px_rgba(0,108,255,0.35)]">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            <AuroraText>Kylian José</AuroraText>
          </h1>
          <p className="text-xs uppercase tracking-[0.25em] text-foreground/60 font-semibold">
            Gestión
          </p>
        </div>

        <form
          onSubmit={submit}
          className="clay p-6 sm:p-7 space-y-4"
        >
          <div>
            <h2 className="text-lg font-bold">Iniciar sesión</h2>
            <p className="text-xs text-foreground/60 mt-0.5">Ingresa tus credenciales para continuar.</p>
          </div>

          <Input
            label="Correo electrónico" required autoFocus type="email" inputMode="email"
            value={correo} onChange={(e) => setCorreo(e.target.value.toLowerCase())}
            placeholder="admin@kylianjose.local"
          />
          <Input
            label="Contraseña" required type="password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Button type="submit" variant="success" loading={loading} className="w-full">
            <LogIn className="h-4 w-4" /> Ingresar
          </Button>

          <p className="text-[11px] text-center text-foreground/60 pt-1">
            Cuenta demo · <span className="font-semibold">admin@kylianjose.local</span> / <span className="font-semibold">admin123</span>
          </p>
        </form>
      </div>
    </div>
  );
}
