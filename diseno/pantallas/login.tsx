import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Mark } from "@/components/mark";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    alta: search.alta === true || search.alta === "1" || search.alta === "true",
  }),
  component: Login,
});

function Login() {
  const { alta } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">(alta ? "up" : "in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPending && user) return <Navigate to="/panel" />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") {
        const result = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0] || "Creador",
          callbackURL: "/panel",
        });
        if (result.error) throw new Error(result.error.message || "No se pudo crear la cuenta.");
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
          callbackURL: "/panel",
        });
        if (result.error) throw new Error(result.error.message || "Correo o contraseña incorrectos.");
      }
      window.location.assign("/panel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Mark />
      <h1 className="font-display mt-8 text-3xl font-bold">
        {mode === "up" ? "Crea tu estudio" : "Entra a tu estudio"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Cada cuenta guarda sus proyectos, clips y créditos. La recuperación por correo se activa cuando
        el envío de mensajes esté configurado. Mientras tanto puedes cambiar la contraseña desde tu cuenta.
      </p>
      <div className="mt-6 grid grid-cols-2 rounded-full border border-line p-1 text-sm">
        <button
          type="button"
          className={`min-h-10 rounded-full ${mode === "in" ? "bg-surface-2 text-fg" : "text-muted"}`}
          onClick={() => setMode("in")}
        >
          Entrar
        </button>
        <button
          type="button"
          className={`min-h-10 rounded-full ${mode === "up" ? "bg-surface-2 text-fg" : "text-muted"}`}
          onClick={() => setMode("up")}
        >
          Registrarse
        </button>
      </div>
      {authEnabled ? (
        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "up" ? (
            <input
              className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-sm"
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          ) : null}
          <input
            className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-sm"
            placeholder="Correo electrónico"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-sm"
            placeholder="Contraseña (mínimo 8)"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "up" ? "new-password" : "current-password"}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 w-full rounded-full bg-violet text-sm font-semibold text-bg disabled:opacity-50"
          >
            {busy ? "Un momento…" : mode === "up" ? "Crear cuenta" : "Entrar"}
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-muted">El acceso está desactivado.</p>
      )}
      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        o continúa con
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="space-y-2">
        {GROK_PROVIDERS.map((provider) => (
          <button
            key={provider.providerId}
            type="button"
            onClick={() => signIn(provider.providerId, { callbackURL: "/panel" })}
            className="min-h-11 w-full rounded-full border border-line text-sm"
          >
            Continuar con {provider.label}
          </button>
        ))}
      </div>
      <Link to="/" className="mt-6 text-center text-sm text-muted">
        Volver al inicio
      </Link>
    </main>
  );
}
