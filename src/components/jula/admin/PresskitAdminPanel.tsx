import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { savePresskitContent, setPresskitPassword } from "@/lib/admin.functions";
import { uploadFailureHint } from "@/lib/media-budget";
import {
  PRESSKIT_LOGO_GROUPS,
  parsePresskitLogoVariants,
  PRESSKIT_LOGO_CANVAS_CLASS,
  presskitSlotPreviewFallback,
  primaryPresskitLogoUrl,
  type PresskitLogoSlotKey,
  type PresskitLogoVariants,
} from "@/lib/presskit-logo-variants";
import { parsePresskitRider, riderLinesFromText, riderTextFromLines } from "@/lib/presskit-rider";
import { coercePresskitAdminSettings, type PresskitAdminSettings } from "@/lib/presskit-admin-settings";
import { uploadPreparedSiteFile } from "@/lib/upload-prepared";

export function PresskitAdminPanel({
  settings: settingsRaw,
  bookingEmail,
  onSaved,
}: {
  settings: PresskitAdminSettings | null | undefined;
  bookingEmail: string;
  onSaved: () => Promise<void>;
}) {
  const settings = coercePresskitAdminSettings(settingsRaw);
  const queryClient = useQueryClient();
  const savePresskit = useServerFn(savePresskitContent);
  const savePass = useServerFn(setPresskitPassword);
  const [releaseBody, setReleaseBody] = useState(settings.release_body);
  const [booking, setBooking] = useState(bookingEmail);
  const [riderText, setRiderText] = useState(() =>
    riderTextFromLines(parsePresskitRider(settings.presskit_rider)),
  );
  const [logos, setLogos] = useState<PresskitLogoVariants>(() =>
    parsePresskitLogoVariants(settings.presskit_logo_urls, settings.logo_url),
  );
  const [logoUploading, setLogoUploading] = useState<PresskitLogoSlotKey | null>(null);
  const [presskitPass, setPresskitPass] = useState("");
  const [presskitPass2, setPresskitPass2] = useState("");
  const [busy, setBusy] = useState(false);

  async function uploadLogoSlot(slot: PresskitLogoSlotKey, file: File) {
    setLogoUploading(slot);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `brand/logo-${slot}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      await uploadPreparedSiteFile(file, path);
      const url = supabase.storage.from("site-media").getPublicUrl(path).data.publicUrl;
      setLogos((prev) => ({ ...prev, [slot]: url }));
      toast.success("Arquivo enviado. Salve o presskit para publicar no site.");
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      toast.error(uploadFailureHint(raw) || "Não foi possível enviar a logo.");
    } finally {
      setLogoUploading(null);
    }
  }

  async function saveAll() {
    setBusy(true);
    try {
      const primary = primaryPresskitLogoUrl(logos, settings.logo_url);
      const logo_url = primary.startsWith("/brand/") ? null : primary;
      await savePresskit({
        data: {
          release_body: releaseBody,
          booking_email: booking.trim(),
          logo_url,
          presskit_logo_urls: logos,
          presskit_rider: riderLinesFromText(riderText),
        },
      });
      await onSaved();
      await queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Presskit atualizado.");
    } catch {
      toast.error("Não foi possível salvar o presskit.");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    if (presskitPass.length < 4 || presskitPass !== presskitPass2) {
      toast.error("As senhas precisam ter 4+ caracteres e ser iguais.");
      return;
    }
    try {
      await savePass({ data: { password: presskitPass } });
      setPresskitPass("");
      setPresskitPass2("");
      toast.success("Senha do presskit atualizada.");
    } catch {
      toast.error("Não foi possível atualizar a senha.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="max-w-4xl border border-border bg-card p-6">
        <h2 className="mb-2 text-2xl uppercase">Release</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Texto ao lado do rider técnico na página do presskit. Fotos e vídeos vêm da aba Mídia
          (flag Presskit).
        </p>
        <Textarea className="min-h-56" value={releaseBody} onChange={(e) => setReleaseBody(e.target.value)} />
      </section>

      <section className="max-w-4xl border border-border bg-card p-6">
        <h2 className="mb-2 text-2xl uppercase">Bookings</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Aparece abaixo do release no presskit (link mailto).
        </p>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">E-mail</Label>
        <Input
          className="mt-2 max-w-md"
          type="email"
          placeholder="tulio.music1@gmail.com"
          value={booking}
          onChange={(e) => setBooking(e.target.value)}
        />
      </section>

      <section className="max-w-4xl border border-border bg-card p-6">
        <h2 className="mb-2 text-2xl uppercase">Rider técnico</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Uma linha por item. Separe opções equivalentes com <code className="text-primary">|</code>{" "}
          (ex.: <span className="font-mono text-xs">CDJ 3000 | CDJ 2000</span>).
        </p>
        <Textarea className="min-h-40 font-mono text-sm" value={riderText} onChange={(e) => setRiderText(e.target.value)} />
      </section>

      <section className="max-w-4xl space-y-8">
        {PRESSKIT_LOGO_GROUPS.map((group) => (
          <div key={group.id} className="border border-border bg-card p-6">
            <h2 className="mb-2 text-2xl uppercase">{group.title}</h2>
            <p className="mb-5 text-sm text-muted-foreground">{group.description}</p>
            <div className="grid gap-6 sm:grid-cols-2">
              {group.slots.map((slot) => {
                const url = logos[slot.key];
                const isIcon = group.id === "icon";
                const src = url ?? presskitSlotPreviewFallback(slot.key);
                return (
                  <div key={slot.key} className="border border-border bg-background/50 p-4">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      {slot.label}
                    </Label>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      PNG/WebP/SVG com fundo transparente (sem quadrado preto ou branco).
                    </p>
                    <div
                      className={`relative mt-3 flex min-h-[7rem] items-center justify-center p-4 ${PRESSKIT_LOGO_CANVAS_CLASS}`}
                    >
                      {src ? (
                        <img
                          src={src}
                          alt=""
                          className={`max-h-24 w-auto object-contain ${isIcon ? "max-w-[4.5rem]" : "max-w-[200px]"}`}
                        />
                      ) : (
                        <p className="px-2 text-center text-xs text-muted-foreground">
                          Nenhum arquivo — envie a versão {slot.key.includes("escura") ? "escura" : "clara"}.
                        </p>
                      )}
                      {url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 size-8 bg-background/90"
                          onClick={() => setLogos((prev) => ({ ...prev, [slot.key]: null }))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                    <Input
                      className="mt-3"
                      type="file"
                      accept="image/png,image/webp,image/jpeg,image/svg+xml"
                      disabled={logoUploading !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void uploadLogoSlot(slot.key, file);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-sm text-muted-foreground">
          No presskit público, o download em ZIP inclui todos os arquivos enviados acima.
        </p>
      </section>

      <div className="max-w-4xl">
        <Button disabled={busy} onClick={() => void saveAll()}>
          <Save /> Salvar presskit
        </Button>
      </div>

      <section className="max-w-4xl border border-border bg-card p-6">
        <h2 className="mb-2 text-2xl uppercase">Senha do presskit</h2>
        <p className="text-sm text-muted-foreground">Senha que contratantes usam para abrir o presskit.</p>
        <div className="mt-5 max-w-sm space-y-3">
          <Input
            type="password"
            placeholder="Nova senha"
            value={presskitPass}
            onChange={(e) => setPresskitPass(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Repita a nova senha"
            value={presskitPass2}
            onChange={(e) => setPresskitPass2(e.target.value)}
          />
          <Button onClick={() => void changePassword()} disabled={!presskitPass}>
            <Save /> Atualizar senha
          </Button>
        </div>
      </section>
    </div>
  );
}