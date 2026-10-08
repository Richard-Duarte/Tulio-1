import { useServerFn } from "@tanstack/react-start";
import { GripVertical, LoaderCircle, Pencil, Plus, Save, Trash2, Wand2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { deleteAdminItem, saveAdminItem } from "@/lib/admin.functions";
import { formatDuration, formatSetDate } from "@/lib/format";
import { getSoundcloudMetadata, getYoutubeMetadata } from "@/lib/link-metadata.functions";
import type { DateSource, LinkMetadata } from "@/lib/link-metadata";
import { normalizeSoundcloudUrl, parseYoutubeId } from "@/lib/link-metadata";

type Kind = "sets" | "live_sets";
type Form = {
  id?: string | undefined;
  url: string;
  youtube_id?: string | undefined;
  title: string;
  cover_url: string;
  date: string;
  description: string;
  duration_seconds: number | null;
  published: boolean;
};
type Item = {
  id: string;
  title: string;
  cover_url?: string | null;
  description?: string | null;
  duration_seconds?: number | null;
  published?: boolean;
  external_url?: string | null;
  soundcloud_url?: string | null;
  played_at?: string | null;
  youtube_url?: string;
  youtube_id?: string;
  set_date?: string | null;
  sort_order?: number;
};

const blank: Form = {
  url: "",
  title: "",
  cover_url: "",
  date: "",
  description: "",
  duration_seconds: null,
  published: true,
};

const config = {
  sets: {
    label: "set",
    platform: "SoundCloud",
    placeholder: "https://soundcloud.com/…",
    urlKey: "soundcloud_url",
    dateKey: "played_at",
  },
  live_sets: {
    label: "live set",
    platform: "YouTube",
    placeholder: "https://www.youtube.com/watch?v=… ou https://youtu.be/…",
    urlKey: "youtube_url",
    dateKey: "set_date",
  },
} as const;

const sourceLabel: Record<DateSource, string> = {
  title: "data escrita no título",
  release_date: "data de lançamento no SoundCloud",
  display_date: "data exibida no SoundCloud",
  created_at: "data de upload no SoundCloud",
  publish_date: "data de publicação no YouTube",
  upload_date: "data de upload no YouTube",
};

/** Client-side check before hitting the server (the server validates again). */
function checkUrl(kind: Kind, url: string): string | null {
  if (kind === "live_sets") return parseYoutubeId(url) ? null : "Use um link de vídeo do YouTube.";
  try {
    normalizeSoundcloudUrl(url);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

/**
 * Admin editor for link-based sets (SoundCloud sets / YouTube live sets): pasting a link autofills
 * title, cover, date, duration and description; everything stays editable before saving.
 */
export function LinkSetEditor({
  kind,
  items,
  onChanged,
  shuffle,
  onShuffle,
}: {
  kind: Kind;
  items: Item[];
  onChanged: () => Promise<void>;
  shuffle?: boolean;
  onShuffle?: (enabled: boolean) => Promise<void>;
}) {
  const cfg = config[kind];
  const save = useServerFn(saveAdminItem);
  const remove = useServerFn(deleteAdminItem);
  const soundcloud = useServerFn(getSoundcloudMetadata);
  const youtube = useServerFn(getYoutubeMetadata);
  const [form, setForm] = useState<Form>(blank);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState<LinkMetadata | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const lastFetched = useRef("");
  const manualOrder = kind === "sets";
  const update = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function autofill(raw: string) {
    const url = raw.trim();
    if (!url || url === lastFetched.current) return;
    const invalid = checkUrl(kind, url);
    if (invalid) {
      setError(invalid);
      return;
    }
    lastFetched.current = url;
    setLoading(true);
    setError(null);
    try {
      const meta =
        kind === "sets" ? await soundcloud({ data: { url } }) : await youtube({ data: { url } });
      setFetched(meta);
      setForm((f) => ({
        ...f,
        url: meta.url,
        youtube_id: "youtubeId" in meta ? (meta as { youtubeId: string }).youtubeId : f.youtube_id,
        title: meta.title,
        cover_url: meta.coverUrl ?? f.cover_url,
        date: meta.date ?? f.date,
        description: f.description || meta.description || "",
        duration_seconds: meta.durationSeconds ?? f.duration_seconds,
      }));
    } catch (e) {
      lastFetched.current = "";
      setError(e instanceof Error ? e.message : "Não foi possível buscar os dados do link.");
    } finally {
      setLoading(false);
    }
  }

  function edit(item: Item) {
    setForm({
      id: item.id,
      url: item[cfg.urlKey] ?? item.external_url ?? "",
      youtube_id: item.youtube_id,
      title: item.title,
      cover_url: item.cover_url ?? "",
      date: item[cfg.dateKey] ?? "",
      description: item.description ?? "",
      duration_seconds: item.duration_seconds ?? null,
      published: Boolean(item.published),
    });
    lastFetched.current = item[cfg.urlKey] ?? "";
    setFetched(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setForm(blank);
    setFetched(null);
    setError(null);
    lastFetched.current = "";
  }

  async function submit() {
    const url = form.url.trim();
    const invalid = url
      ? checkUrl(kind, url)
      : kind === "live_sets"
        ? "Informe o link do YouTube."
        : null;
    if (invalid) {
      setError(invalid);
      return;
    }
    const previous = form.id ? items.find((row) => row.id === form.id) : undefined;
    const common = {
      ...(form.id ? { id: form.id } : {}),
      title: form.title.trim(),
      cover_url: form.cover_url.trim() || null,
      description: form.description.trim() || null,
      duration_seconds: form.duration_seconds,
      published: form.published,
      [cfg.dateKey]: form.date || null,
      ...(manualOrder
        ? { sort_order: previous?.sort_order ?? items.length }
        : {}),
    };
    const item =
      kind === "sets"
        ? { ...common, soundcloud_url: url ? normalizeSoundcloudUrl(url) : null }
        : {
            ...common,
            youtube_url: `https://www.youtube.com/watch?v=${parseYoutubeId(url)}`,
            youtube_id: parseYoutubeId(url),
          };
    setSaving(true);
    try {
      await save({ data: { table: kind, item } });
      await onChanged();
      toast.success(form.id ? "Alterações salvas." : "Conteúdo salvo.");
      reset();
    } catch {
      toast.error("Não foi possível salvar (link repetido?).");
    } finally {
      setSaving(false);
    }
  }

  async function del(item: Item) {
    if (!window.confirm(`Excluir "${item.title}"?`)) return;
    await remove({ data: { table: kind, id: item.id } });
    if (form.id === item.id) reset();
    await onChanged();
    toast.success("Item removido.");
  }

  async function reorder(targetId: string) {
    if (!manualOrder || !dragged || dragged === targetId) return setDragged(null);
    const next = [...items];
    const from = next.findIndex((item) => item.id === dragged);
    const to = next.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return setDragged(null);
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setDragged(null);
    try {
      await Promise.all(
        next.map((item, sort_order) =>
          save({ data: { table: kind, item: { ...item, sort_order } } }),
        ),
      );
      await onChanged();
      toast.success("Ordem dos sets atualizada.");
    } catch {
      toast.error("Não foi possível alterar a ordem.");
    }
  }

  const dateHint =
    fetched?.dateSource &&
    `Preenchida com a ${sourceLabel[fetched.dateSource]}${
      fetched.dateSource === "title" &&
      fetched.platformDate &&
      fetched.platformDate !== fetched.date
        ? ` (publicado em ${formatSetDate(fetched.platformDate)})`
        : ""
    }.`;

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      <section className="mt-7 max-w-4xl border border-border bg-card p-6">
        <h2 className="mb-6 text-2xl uppercase">
          {form.id ? `Editar ${cfg.label}` : `Novo ${cfg.label}`}
        </h2>
        <div className="space-y-3">
          <label className="block text-xs uppercase tracking-[.15em] text-muted-foreground">
            Link do {cfg.platform}
            <div className="mt-1 flex gap-2">
              <Input
                placeholder={cfg.placeholder}
                value={form.url}
                inputMode="url"
                onChange={(e) => {
                  update("url", e.target.value);
                  setError(null);
                }}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  if (text) setTimeout(() => autofill(text), 0);
                }}
                onBlur={(e) => autofill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    lastFetched.current = "";
                    autofill(form.url);
                  }
                }}
                aria-invalid={Boolean(error)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!form.url || loading}
                onClick={() => {
                  lastFetched.current = "";
                  autofill(form.url);
                }}
                aria-label="Buscar dados do link"
                title="Buscar dados do link"
              >
                {loading ? <LoaderCircle className="animate-spin" /> : <Wand2 />}
              </Button>
            </div>
          </label>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {loading ? (
              "Buscando nome, capa e data…"
            ) : error ? (
              <span className="text-destructive">{error}</span>
            ) : (
              `Cole o link: nome, capa e data são preenchidos automaticamente e continuam editáveis.`
            )}
          </p>
          <Input
            placeholder="Título"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
          <div className="flex items-center gap-3">
            {form.cover_url && (
              <img
                src={form.cover_url}
                alt=""
                className={`${kind === "live_sets" ? "aspect-video w-24" : "aspect-square w-14"} shrink-0 object-cover`}
              />
            )}
            <Input
              placeholder="URL da capa"
              value={form.cover_url}
              onChange={(e) => update("cover_url", e.target.value)}
            />
          </div>
          <label className="block text-xs uppercase tracking-[.15em] text-muted-foreground">
            Data do set
            <Input
              type="date"
              className="mt-1"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
            />
          </label>
          {dateHint && <p className="-mt-1 text-xs text-muted-foreground">{dateHint}</p>}
          <Textarea
            placeholder="Descrição (opcional)"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
          {form.duration_seconds ? (
            <p className="font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">
              Duração: {formatDuration(form.duration_seconds)}
            </p>
          ) : null}
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={form.published} onCheckedChange={(v) => update("published", v)} />{" "}
            Publicado
          </label>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={submit}
              disabled={!form.title.trim() || saving || loading}
            >
              {saving ? <LoaderCircle className="animate-spin" /> : form.id ? <Save /> : <Plus />}
              {form.id ? "Salvar alterações" : "Adicionar"}
            </Button>
            {(form.id || form.url) && (
              <Button variant="outline" onClick={reset} aria-label="Cancelar">
                <X />
              </Button>
            )}
          </div>
        </div>
      </section>
      <section className="mt-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl uppercase">Cadastrados</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {manualOrder
                ? "Clique e arraste pelo ícone para mudar a sequência no site e no player."
                : "Ordem no site: do mais antigo para o mais novo (pela data do set)."}
            </p>
          </div>
          {manualOrder && onShuffle != null && shuffle != null && (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={shuffle} onCheckedChange={(value) => void onShuffle(value)} />
              Modo aleatório
            </label>
          )}
        </div>
        {items.length === 0 ? (
          <p className="border-y border-border py-10 text-sm text-muted-foreground">
            Nenhum item cadastrado.
          </p>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              draggable={manualOrder}
              onDragStart={manualOrder ? () => setDragged(item.id) : undefined}
              onDragOver={manualOrder ? (event) => event.preventDefault() : undefined}
              onDrop={manualOrder ? () => void reorder(item.id) : undefined}
              className={`flex items-center gap-4 border-t border-border py-4 ${
                dragged === item.id ? "opacity-40" : ""
              }`}
            >
              {manualOrder && (
                <>
                  <GripVertical className="cursor-grab text-muted-foreground" aria-hidden="true" />
                  <span className="w-7 font-mono text-[10px] text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </>
              )}
              {item.cover_url ? (
                <img
                  src={item.cover_url}
                  alt=""
                  className={`${kind === "live_sets" ? "aspect-video w-20" : "aspect-square w-12"} shrink-0 object-cover`}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium uppercase">{item.title}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">
                  {formatSetDate(item[cfg.dateKey]) ?? "Sem data"} ·{" "}
                  {item.published ? "Visível" : "Rascunho"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => edit(item)}
                aria-label={`Editar ${item.title}`}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => del(item)}
                aria-label={`Excluir ${item.title}`}
              >
                <Trash2 />
              </Button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
