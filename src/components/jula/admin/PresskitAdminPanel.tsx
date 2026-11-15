import { useServerFn } from "@tanstack/react-start";
import { Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { savePresskitContent, setPresskitPassword } from "@/lib/admin.functions";
import { uploadFailureHint } from "@/lib/media-budget";
import { parsePresskitRider, riderLinesFromText, riderTextFromLines } from "@/lib/presskit-rider";
import { resolveSiteLogoUrl } from "@/lib/site-logo";
import { uploadPreparedSiteFile } from "@/lib/upload-prepared";

type SettingsRow = {
  release_title: string;
  release_body: string;
  logo_url: string | null;
  presskit_rider?: unknown;
};

export function PresskitAdminPanel({
  settings,
  onSaved,
}: {
  settings: SettingsRow;
  onSaved: () => Promise<void>;
}) {
  const savePresskit = useServerFn(savePresskitContent);
  const savePass = useServerFn(setPresskitPassword);
  const [releaseBody, setReleaseBody] = useState(settings.release_body);
  const [riderText, setRiderText] = useState(() =>
    riderTextFromLines(parsePresskitRider(settings.presskit_rider)),
  );
  const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? "");
  const [logoUploading, setLogoUploading] = useState(false);
  const [presskitPass, setPresskitPass] = useState("");
  const [presskitPass2, setPresskitPass2] = useState("");
  const [busy, setBusy] = useState(false);

  async function uploadLogo(file: File) {
    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `brand/logo-${Date.now()}.${ext}`;
      await uploadPreparedSiteFile(file, path);
      const url = supabase.storage.from("site-media").getPublicUrl(path).data.publicUrl;
      setLogoUrl(url);
      toast.success("Logo enviada. Salve o presskit para publicar.");
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      toast.error(uploadFailureHint(raw) || "Não foi possível enviar a logo.");
    } finally {
      setLogoUploading(false);
    }
  }

  async function saveAll() {
    setBusy(true);
    try {
      await savePresskit({
        data: {
          release_body: releaseBody,
          logo_url: logoUrl.trim() || null,
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

  const logoPreview = resolveSiteLogoUrl(logoUrl || null);

  return (
    <div className="space-y-6">
      <section className="max-w-4xl border border-border bg-card p-6">
        <h2 className="mb-2 text-2xl uppercase">Release</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Texto ao lado do rider técnico na página do presskit. Fotos e vídeos vêm da aba Mídia
          (flag Presskit).
        </p>
        <Textarea className="min-h-56" value={releaseBody} onChange={(e) => setReleaseBody(e.target.value)} />
        <Button className="mt-6" disabled={busy} onClick={() => void saveAll()}>
          <Save /> Salvar presskit
        </Button>
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
          Usada no download do presskit e no triângulo da home. Padrão: marca Tulio em{" "}
          <span className="font-mono text-xs">/brand/tulio-mark.png</span>.
        </p>
        <img src={logoPreview} alt="Logo do site" className="mb-4 h-28 w-auto object-contain bg-black p-3" />
        <Input
          className="mb-3"
          type="file"
          accept="image/png,image/webp,image/jpeg,image/svg+xml"
          disabled={logoUploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void uploadLogo(file);
          }}
        />
        <Input
          placeholder="URL da logo (opcional)"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
        />
      </section>

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