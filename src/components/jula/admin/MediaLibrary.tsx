import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { deleteAdminItem, saveAdminItem } from "@/lib/admin.functions";
import { transcodeSiteMediaVideo } from "@/lib/media-video.functions";
import { uploadSiteMediaFile } from "@/lib/storage-upload";
import {
  BROWSER_TRANSCODE_MAX_BYTES,
  fileExtension,
  isVideoFile,
  needsVideoTranscode,
} from "@/lib/video-web";

type Party = { id: string; name: string; happened_at: string | null };
type MediaItem = {
  id: string;
  kind: string;
  title: string;
  alt_text: string;
  public_url: string | null;
  storage_bucket: string;
  storage_path: string;
  party_id: string | null;
  homepage_enabled: boolean;
  visible: boolean;
  presskit_enabled: boolean;
  downloadable: boolean;
  captured_at: string | null;
  sort_order: number;
};

const BUCKET = "site-media";
const MAX_IMAGE = 15 * 1024 * 1024;
const MAX_VIDEO = 2 * 1024 * 1024 * 1024;

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error)
    return String((error as { message: unknown }).message);
  return "Erro desconhecido";
}

export function MediaLibrary({
  media,
  parties,
  onChanged,
}: {
  media: MediaItem[];
  parties: Party[];
  onChanged: () => Promise<void>;
}) {
  const save = useServerFn(saveAdminItem);
  const remove = useServerFn(deleteAdminItem);
  const transcodeOnServer = useServerFn(transcodeSiteMediaVideo);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<File[]>([]);
  const [partyId, setPartyId] = useState("");
  const [newParty, setNewParty] = useState("");
  const [date, setDate] = useState("");
  const [home, setHome] = useState(false);
  const [gallery, setGallery] = useState(true);
  const [presskit, setPresskit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    name: string;
    phase: "convert" | "upload";
    ratio: number;
  } | null>(null);

  function toggle(id: string) {
    setSelected((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function queueFiles(list: FileList | null) {
    const files = [...(list ?? [])].filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
    );
    if (!files.length) {
      toast.error("Envie fotos ou vídeos.");
      return;
    }
    const tooBig = files.find(
      (file) => file.size > (file.type.startsWith("video/") ? MAX_VIDEO : MAX_IMAGE),
    );
    if (tooBig) {
      toast.error("Fotos até 15 MB e vídeos até 2 GB.");
      return;
    }
    setPending(files);
    setPartyId("");
    setNewParty("");
    setDate("");
    setHome(false);
    setGallery(true);
    setPresskit(false);
  }

  async function confirmUpload() {
    const partyName = newParty.trim();
    if (!partyId && !partyName) {
      toast.error("Escolha ou crie a festa das mídias.");
      return;
    }
    const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
    if (sessionError || !sessionData.session) {
      toast.error("Sessão expirada. Saia e entre de novo no painel.");
      return;
    }
    setBusy(true);
    try {
      let linkedParty = partyId;
      if (partyName) {
        const created = (await save({
          data: {
            table: "parties",
            item: { name: partyName, happened_at: date || null, sort_order: 0 },
          },
        })) as Party;
        linkedParty = created.id;
      } else if (date) {
        const current = parties.find((party) => party.id === partyId);
        if (current) {
          await save({
            data: {
              table: "parties",
              item: { id: current.id, name: current.name, happened_at: date, sort_order: 0 },
            },
          });
        }
      }
      const base = media.reduce((max, item) => Math.max(max, item.sort_order), 0);
      for (const [index, file] of pending.entries()) {
        const mediaId = crypto.randomUUID();
        let path: string;
        if (isVideoFile(file)) {
          path = `library/${mediaId}.mp4`;
          if (file.size > BROWSER_TRANSCODE_MAX_BYTES) {
            const ext = fileExtension(file.name) || "bin";
            const stagingPath = `staging/${mediaId}/source.${ext}`;
            setUploadProgress({ name: file.name, phase: "upload", ratio: 0 });
            await uploadSiteMediaFile(file, stagingPath, (ratio) =>
              setUploadProgress({ name: file.name, phase: "upload", ratio: ratio * 0.45 }),
            );
            setUploadProgress({ name: file.name, phase: "convert", ratio: 0.45 });
            await transcodeOnServer({ data: { sourcePath: stagingPath, destPath: path } });
            setUploadProgress({ name: file.name, phase: "convert", ratio: 1 });
          } else {
            let uploadFile = file;
            if (needsVideoTranscode(file)) {
              setUploadProgress({ name: file.name, phase: "convert", ratio: 0 });
              const { transcodeVideoInBrowser } = await import("@/lib/video-transcode-browser");
              uploadFile = await transcodeVideoInBrowser(file, (ratio) =>
                setUploadProgress({ name: file.name, phase: "convert", ratio: ratio * 0.55 }),
              );
            }
            setUploadProgress({ name: file.name, phase: "upload", ratio: needsVideoTranscode(file) ? 0.55 : 0 });
            await uploadSiteMediaFile(uploadFile, path, (ratio) =>
              setUploadProgress({
                name: file.name,
                phase: "upload",
                ratio: (needsVideoTranscode(file) ? 0.55 : 0) + ratio * (needsVideoTranscode(file) ? 0.45 : 1),
              }),
            );
          }
        } else {
          const ext = fileExtension(file.name) || "bin";
          path = `library/${mediaId}.${ext}`;
          setUploadProgress({ name: file.name, phase: "upload", ratio: 0 });
          await uploadSiteMediaFile(file, path, (ratio) =>
            setUploadProgress({ name: file.name, phase: "upload", ratio }),
          );
        }
        const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        const title = file.name.replace(/\.[^.]+$/, "");
        await save({
          data: {
            table: "media",
            item: {
              kind: isVideoFile(file) ? "video" : "image",
              title,
              alt_text: title,
              storage_bucket: BUCKET,
              storage_path: path,
              public_url: publicUrl,
              sort_order: base + index + 1,
              visible: gallery,
              homepage_enabled: home,
              presskit_enabled: presskit,
              downloadable: presskit || gallery,
              party_id: linkedParty || null,
              captured_at: date || null,
            },
          },
        });
      }
      setPending([]);
      if (fileRef.current) fileRef.current.value = "";
      setUploadProgress(null);
      await onChanged();
      toast.success("Mídias salvas.");
    } catch (error) {
      toast.error(`Não foi possível salvar as mídias. ${errorMessage(error)}`);
    } finally {
      setUploadProgress(null);
      setBusy(false);
    }
  }

  async function removeSelected() {
    if (!selected.length || !window.confirm(`Excluir ${selected.length} mídia(s)?`)) return;
    setBusy(true);
    try {
      const doomed = media.filter((item) => selected.includes(item.id));
      for (const item of doomed) {
        if (item.storage_path) {
          await supabase.storage.from(item.storage_bucket || BUCKET).remove([item.storage_path]);
        }
        await remove({ data: { table: "media", id: item.id } });
      }
      setSelected([]);
      await onChanged();
      toast.success("Mídias excluídas.");
    } catch {
      toast.error("Não foi possível excluir.");
    } finally {
      setBusy(false);
    }
  }

  async function patch(item: MediaItem, changes: Partial<MediaItem>) {
    await save({ data: { table: "media", item: { ...item, ...changes } } });
    await onChanged();
  }

  return (
    <section className="mt-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl uppercase">Biblioteca de mídia</h2>
          <p className="mt-2 text-muted-foreground">
            {media.length} itens no acervo. Envie arquivos do celular ou do computador — não use link
            externo.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => queueFiles(e.target.files)}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload /> Enviar do dispositivo
          </Button>
          <Button
            variant="outline"
            onClick={() => void removeSelected()}
            disabled={busy || !selected.length}
          >
            <Trash2 /> Excluir selecionadas
          </Button>
        </div>
      </div>
      <label className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[.14em] text-muted-foreground">
        <Checkbox
          checked={media.length > 0 && selected.length === media.length}
          onCheckedChange={(checked) => setSelected(checked ? media.map((item) => item.id) : [])}
        />
        Selecionar todas
      </label>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {media.map((item) => (
          <article key={item.id} className="flex gap-4 border border-border bg-card p-3">
            <Checkbox
              checked={selected.includes(item.id)}
              onCheckedChange={() => toggle(item.id)}
              aria-label={`Selecionar ${item.title}`}
            />
            {item.kind === "image" ? (
              <img
                src={item.public_url ?? ""}
                alt={item.alt_text}
                className="h-24 w-20 object-cover"
              />
            ) : (
              <video
                src={item.public_url ?? ""}
                className="h-24 w-20 bg-muted object-cover"
                controls
                playsInline
                preload="metadata"
              />
            )}
            <div className="min-w-0 flex-1">
              <Input
                defaultValue={item.title}
                aria-label="Nome da mídia"
                className="h-8 text-xs uppercase"
                onBlur={(e) => {
                  const title = e.target.value.trim();
                  if (title && title !== item.title) void patch(item, { title });
                }}
              />
              <label className="mt-3 block text-xs text-muted-foreground">
                Festa
                <select
                  value={item.party_id ?? ""}
                  onChange={(e) => void patch(item, { party_id: e.target.value || null })}
                  className="mt-1 w-full border border-border bg-background px-2 py-1 text-xs text-foreground"
                >
                  <option value="">Sem festa</option>
                  {parties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                Sessão 1{" "}
                <Switch
                  checked={item.homepage_enabled}
                  onCheckedChange={(v) => void patch(item, { homepage_enabled: v })}
                />
              </label>
              <label className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                Galeria{" "}
                <Switch
                  checked={item.visible}
                  onCheckedChange={(v) => void patch(item, { visible: v })}
                />
              </label>
              <label className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                Presskit{" "}
                <Switch
                  checked={item.presskit_enabled}
                  onCheckedChange={(v) => void patch(item, { presskit_enabled: v })}
                />
              </label>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={pending.length > 0} onOpenChange={(open) => !open && !busy && setPending([])}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="uppercase">Vincular mídias</DialogTitle>
            <DialogDescription>
              {pending.length} arquivo(s) do seu dispositivo serão copiados para o site. Vídeos
              (MOV, MKV, etc.) viram MP4 com som compatível automaticamente. Escolha a festa, onde
              aparecem e a data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-[.15em] text-muted-foreground">
              Festa
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="mt-1 w-full border border-border bg-background px-2 py-2 text-sm text-foreground"
              >
                <option value="">Nova festa</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name}
                  </option>
                ))}
              </select>
            </label>
            {!partyId && (
              <Input
                placeholder="Nome da nova festa"
                value={newParty}
                onChange={(e) => setNewParty(e.target.value)}
              />
            )}
            <label className="block text-xs uppercase tracking-[.15em] text-muted-foreground">
              Data
              <Input
                className="mt-1"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              Sessão 1 (Home) <Switch checked={home} onCheckedChange={setHome} />
            </label>
            <label className="flex items-center justify-between text-sm">
              Galeria <Switch checked={gallery} onCheckedChange={setGallery} />
            </label>
            <label className="flex items-center justify-between text-sm">
              Presskit <Switch checked={presskit} onCheckedChange={setPresskit} />
            </label>
          </div>
          <DialogFooter className="flex-col items-stretch gap-3 sm:flex-col sm:items-stretch">
            {uploadProgress && (
              <div className="space-y-1">
                <p className="truncate font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">
                  {uploadProgress.phase === "convert" ? "Convertendo" : "Enviando"}{" "}
                  {uploadProgress.name}…{" "}
                  {Math.round(uploadProgress.ratio * 100).toString().padStart(2, "0")}%
                </p>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-[width] duration-200"
                    style={{ width: `${Math.round(uploadProgress.ratio * 100)}%` }}
                  />
                </div>
              </div>
            )}
            <Button onClick={() => void confirmUpload()} disabled={busy}>
              {busy ? <LoaderCircle className="animate-spin" /> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
