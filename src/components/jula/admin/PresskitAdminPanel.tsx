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
import { parsePresskitLogoUrls } from "@/lib/presskit-logos";
import { parsePresskitRider, riderLinesFromText, riderTextFromLines } from "@/lib/presskit-rider";
import { coercePresskitAdminSettings, type PresskitAdminSettings } from "@/lib/presskit-admin-settings";
import { resolveSiteLogoUrl } from "@/lib/site-logo";
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
  const savePresskit = useServerFn(savePresskitContent);
  const savePass = useServerFn(setPresskitPassword);
  const [releaseBody, setReleaseBody] = useState(settings.release_body);
  const [booking, setBooking] = useState(bookingEmail);
  const [riderText, setRiderText] = useState(() =>
    riderTextFromLines(parsePresskitRider(settings.presskit_rider)),
  );
  const [logoUrls, setLogoUrls] = useState(() =>
    parsePresskitLogoUrls(settings.presskit_logo_urls, settings.logo_url).filter(
      (u) => !u.startsWith("/brand/"),
    ),
  );
  const [logoUploading, setLogoUploading] = useState(false);
  const [presskitPass, setPresskitPass] = useState("");
  const [presskitPass2, setPresskitPass2] = useState("");
  const [busy, setBusy] = useState(false);

  async function uploadLogos(files: FileList | File[]) {
    const list = [...files];
    if (list.length === 0) return;
    setLogoUploading(true);
    try {
      const added: string[] = [];
      for (const file of list) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        const path = `brand/logo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        await uploadPreparedSiteFile(file, path);
        const url = supabase.storage.from("site-media").getPublicUrl(path).data.publicUrl;
        added.push(url);
      }
      setLogoUrls((prev) => [...prev, ...added]);
      toast.success(
        added.length === 1 ? "Logo enviada. Salve o presskit para publicar." : `${added.length} logos enviadas.`,
      );
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      toast.error(uploadFailureHint(raw) || "Não foi possível enviar a(s) logo(s).");
    } finally {
      setLogoUploading(false);
    }
  }

  async function saveAll() {
    setBusy(true);
    try {
      const primary = logoUrls[0]?.trim() || null;
      await savePresskit({
        data: {
          release_body: releaseBody,
          booking_email: booking.trim(),
          logo_url: primary,
          presskit_logo_urls: logoUrls,
          presskit_rider: riderLinesFromText(riderText),
        },
      });
      await onSaved();
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

      <section className="max-w-4xl border border-border bg-card p-6">
        <h2 className="mb-2 text-2xl uppercase">Logo</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Envie versões clara e escura (ou outras). A primeira da lista aparece no presskit e na
          home; o download entrega todos os arquivos em um ZIP.
        </p>
        <div className="mb-4 flex flex-wrap gap-4">
          {logoUrls.length === 0 ? (
            <img
              src={resolveSiteLogoUrl(null)}
              alt="Logo padrão"
              className="h-28 w-auto object-contain bg-black p-3"
            />
          ) : (
            logoUrls.map((url, i) => (
              <div key={url} className="relative">
                <img src={url} alt="" className="h-28 w-auto max-w-[200px] object-contain bg-black p-3" />
                {i === 0 && (
                  <span className="absolute left-0 top-0 bg-primary px-1.5 py-0.5 font-mono text-[9px] uppercase text-primary-foreground">
                    Principal
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -right-2 -top-2 size-8 bg-background"
                  onClick={() => setLogoUrls((prev) => prev.filter((u) => u !== url))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
        </div>
        <Input
          className="mb-3"
          type="file"
          accept="image/png,image/webp,image/jpeg,image/svg+xml"
          multiple
          disabled={logoUploading}
          onChange={(e) => {
            const files = e.target.files;
            e.target.value = "";
            if (files?.length) void uploadLogos(files);
          }}
        />
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