import { useServerFn } from "@tanstack/react-start";
import { GripVertical, LoaderCircle, Pencil, Plus, Save, Trash2, Wand2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { deleteAdminItem, saveAdminItem } from "@/lib/admin.functions";
import { getPageMetadata, getSoundcloudMetadata } from "@/lib/link-metadata.functions";

type Track = {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string;
  sort_order: number;
  active: boolean;
};

const empty = {
  id: undefined as string | undefined,
  url: "",
  title: "",
  artist: "Tulio",
  cover: "",
  active: true,
};

function soundcloudLink(value: string) {
  try {
    return /(^|\.)soundcloud\.com$/i.test(new URL(value).hostname);
  } catch {
    return false;
  }
}

function titleFromUrl(value: string) {
  try {
    return decodeURIComponent(new URL(value).pathname.split("/").filter(Boolean).at(-1) ?? "")
      .replace(/\.[a-z0-9]{2,5}$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

export function TrackEditor({
  items,
  shuffle,
  onShuffle,
  onChanged,
}: {
  items: Track[];
  shuffle: boolean;
  onShuffle: (enabled: boolean) => Promise<void>;
  onChanged: () => Promise<void>;
}) {
  const save = useServerFn(saveAdminItem);
  const remove = useServerFn(deleteAdminItem);
  const pageMetadata = useServerFn(getPageMetadata);
  const soundcloudMetadata = useServerFn(getSoundcloudMetadata);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const lastFetched = useRef("");

  function reset() {
    setForm(empty);
    lastFetched.current = "";
  }

  async function autofill(raw: string, force = false) {
    const url = raw.trim();
    if (!/^https?:\/\//i.test(url) || (!force && url === lastFetched.current)) return;
    lastFetched.current = url;
    setLoading(true);
    try {
      if (soundcloudLink(url)) {
        const meta = await soundcloudMetadata({ data: { url } });
        setForm((current) => ({
          ...current,
          url: meta.url,
          title: meta.title || current.title,
          cover: meta.coverUrl || current.cover,
        }));
      } else {
        try {
          const meta = await pageMetadata({ data: { url } });
          setForm((current) => ({
            ...current,
            url: meta.finalUrl,
            title: meta.title || titleFromUrl(url) || current.title,
            cover: meta.image || current.cover,
          }));
        } catch {
          setForm((current) => ({
            ...current,
            title: current.title || titleFromUrl(url),
          }));
        }
      }
      toast.success("Dados da faixa carregados.");
    } catch (error) {
      lastFetched.current = "";
      toast.error(error instanceof Error ? error.message : "Não foi possível ler o link.");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!form.url || !form.title.trim()) {
      toast.error("Informe o link e o nome da faixa.");
      return;
    }
    setSaving(true);
    try {
      const previous = form.id ? items.find((item) => item.id === form.id) : undefined;
      await save({
        data: {
          table: "tracks",
          item: {
            ...(form.id ? { id: form.id } : {}),
            title: form.title.trim(),
            artist: form.artist.trim() || "Tulio",
            cover_url: form.cover.trim() || null,
            audio_url: form.url.trim(),
            active: form.active,
            sort_order: previous?.sort_order ?? items.length,
          },
        },
      });
      reset();
      await onChanged();
      toast.success("Faixa salva.");
    } catch {
      toast.error("Não foi possível salvar a faixa.");
    } finally {
      setSaving(false);
    }
  }

  async function reorder(targetId: string) {
    if (!dragged || dragged === targetId) return setDragged(null);
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
          save({ data: { table: "tracks", item: { ...item, sort_order } } }),
        ),
      );
      await onChanged();
      toast.success("Ordem das faixas atualizada.");
    } catch {
      toast.error("Não foi possível alterar a ordem.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      <section className="mt-7 border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl uppercase">{form.id ? "Editar faixa" : "Nova faixa"}</h2>
          {form.id && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X /> Cancelar
            </Button>
          )}
        </div>
        <div className="mt-6 space-y-3">
          <label className="block text-xs uppercase tracking-[.15em] text-muted-foreground">
            Link da faixa
            <div className="mt-1 flex gap-2">
              <Input
                placeholder="SoundCloud ou link direto do áudio"
                value={form.url}
                onChange={(event) =>
                  setForm((current) => ({ ...current, url: event.target.value }))
                }
                onBlur={(event) => void autofill(event.target.value)}
                onPaste={(event) => {
                  const text = event.clipboardData.getData("text");
                  if (text) window.setTimeout(() => void autofill(text), 0);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void autofill(form.url, true)}
                disabled={loading || !form.url}
                aria-label="Buscar dados da faixa"
              >
                {loading ? <LoaderCircle className="animate-spin" /> : <Wand2 />}
              </Button>
            </div>
          </label>
          <Input
            placeholder="Nome"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
          <Input
            placeholder="Artista"
            value={form.artist}
            onChange={(event) => setForm((current) => ({ ...current, artist: event.target.value }))}
          />
          <Input
            placeholder="URL da capa"
            value={form.cover}
            onChange={(event) => setForm((current) => ({ ...current, cover: event.target.value }))}
          />
          {form.cover && (
            <img src={form.cover} alt="" className="aspect-square w-full object-cover" />
          )}
          <label className="flex items-center gap-3 text-sm">
            <Switch
              checked={form.active}
              onCheckedChange={(active) => setForm((current) => ({ ...current, active }))}
            />{" "}
            Ativa
          </label>
          <Button className="w-full" onClick={() => void submit()} disabled={saving}>
            {saving ? <LoaderCircle className="animate-spin" /> : form.id ? <Save /> : <Plus />}
            {form.id ? "Salvar alterações" : "Adicionar"}
          </Button>
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl uppercase">Sequência das faixas</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Clique e arraste pelo ícone para mudar a sequência.
            </p>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={shuffle} onCheckedChange={(value) => void onShuffle(value)} />
            Modo aleatório
          </label>
        </div>
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => setDragged(item.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => void reorder(item.id)}
            className={`flex items-center gap-3 border-t border-border py-3 ${
              dragged === item.id ? "opacity-40" : ""
            }`}
          >
            <GripVertical className="cursor-grab text-muted-foreground" aria-hidden="true" />
            <span className="w-7 font-mono text-[10px] text-primary">
              {String(index + 1).padStart(2, "0")}
            </span>
            {item.cover_url ? (
              <img src={item.cover_url} alt="" className="size-11 rounded object-cover" />
            ) : (
              <div className="size-11 rounded bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm uppercase">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{item.artist}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setForm({
                  id: item.id,
                  url: item.audio_url,
                  title: item.title,
                  artist: item.artist,
                  cover: item.cover_url ?? "",
                  active: item.active,
                })
              }
              aria-label={`Editar ${item.title}`}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await remove({ data: { table: "tracks", id: item.id } });
                await onChanged();
                toast.success("Faixa removida.");
              }}
              aria-label={`Excluir ${item.title}`}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}
