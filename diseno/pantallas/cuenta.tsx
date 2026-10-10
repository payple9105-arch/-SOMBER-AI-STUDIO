import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { authClient } from "@/lib/auth/client";
import { listLedger, renameProfile } from "@/lib/somber.functions";
import { Card, Field, PrimaryButton, StudioShell, controlClass, errorText } from "@/components/studio-shell";
import { useStudio } from "@/components/use-studio";

export const Route = createFileRoute("/cuenta")({ component: Cuenta });

function Cuenta() {
  const studio = useStudio();
  const [nick, setNick] = useState("");
  const [ledger, setLedger] = useState<Awaited<ReturnType<typeof listLedger>>>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!studio.user) return;
    setNick(studio.name);
    listLedger()
      .then(setLedger)
      .catch(() => undefined);
  }, [studio.user, studio.name]);

  if (studio.isPending || (studio.user && !studio.ready && !studio.error)) {
    return <main className="min-h-screen" />;
  }
  if (!studio.user) return <RedirectToSignIn />;

  return (
    <StudioShell title="Cuenta" kicker="Perfil" credits={studio.credits}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <p className="text-sm text-muted">{studio.user.primaryEmail ?? studio.user.displayName}</p>
          <Field label="Cómo te llamamos">
            <input className={controlClass} value={nick} onChange={(e) => setNick(e.target.value)} maxLength={40} />
          </Field>
          <PrimaryButton
            onClick={() =>
              void renameProfile({ data: { displayName: nick } })
                .then(() => studio.reload())
                .then(() => setNote("Nombre guardado."))
                .catch((err: unknown) => setNote(errorText(err)))
            }
          >
            Guardar nombre
          </PrimaryButton>
          <Field label="Contraseña actual">
            <input
              className={controlClass}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Field label="Nueva contraseña">
            <input
              className={controlClass}
              type="password"
              minLength={8}
              value={nextPassword}
              onChange={(e) => setNextPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <PrimaryButton
            disabled={nextPassword.length < 8 || currentPassword.length < 8}
            onClick={() =>
              void authClient
                .changePassword({ currentPassword, newPassword: nextPassword, revokeOtherSessions: true })
                .then((result) => {
                  if (result.error) throw new Error(result.error.message || "No se pudo cambiar.");
                  setCurrentPassword("");
                  setNextPassword("");
                  setNote("Contraseña actualizada.");
                })
                .catch((err: unknown) => setNote(errorText(err)))
            }
          >
            Cambiar contraseña
          </PrimaryButton>
          <p className="text-xs leading-relaxed text-muted">
            Si entraste con Google o X, esta cuenta no tiene contraseña local. El correo de recuperación se
            conectará cuando haya un servicio de envío; hoy no se mandan mensajes.
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold">Movimientos de créditos</h2>
          <p className="mt-1 text-sm text-muted">Saldo: {studio.credits ?? 0}. El alta incluye 60 de prueba.</p>
          {ledger.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Todavía no hay consumos.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {ledger.map((row) => (
                <li key={row.id} className="flex justify-between gap-3 py-2">
                  <span>{row.reason}</span>
                  <span className={row.delta < 0 ? "text-danger" : "text-electric"}>
                    {row.delta > 0 ? "+" : ""}
                    {row.delta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {note ? <p className="mt-4 text-sm text-muted">{note}</p> : null}
    </StudioShell>
  );
}
