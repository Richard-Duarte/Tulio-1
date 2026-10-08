import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, Pencil, Plus, Save, Trash2, Wand2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { deleteAdminItem, saveAdminItem } from "@/lib/admin.functions";
import { getPageMetadata } from "@/lib/link-metadata.functions";

type Release = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  released_at: string | null;
  published: boolean;
  download_enabled: boolean;
  download_url: string | null;
  sort_order: number;
};
type Link = { id: string; release_id: string; platform: string; url: string; sort_order: number };

const PLATFORMS = [
  ["bandcamp", "Bandcamp", "https://bandcamp.com/…"],
  ["spotify", "Spotify", "https://open.spotify.com/…"],
  ["youtube", "YouTube", "https://youtube.com/…"],
] as const;

function detectPlatform(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("bandcamp")) return "bandcamp";
    if (host.includes("spotify")) return "spotify";
    if (host.includes("youtu")) return "youtube";
  } catch {
    /* ignore */
  }
  return "link";
}

export function ReleaseEditor({
  items,
  links,
  onChanged,
}: {
  items: Release[];
  links: Link[];
  onChanged: () => Promise<void>;
}) {
  const save = useServerFn(saveAdminItem);
  const remove = useServerFn(deleteAdminItem);
  const preview = useServerFn(getPageMetadata);
  const [id, setId] = useState<string | undefined>();
  const [source, setSource] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState("");
  const [date, setDate] = useState("");
  const [published, setPublished] = useState(true);
  const [platforms, setPlatforms] = useState({ bandcamp: "", spotify: "", youtube: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastFetched = useRef("");

  function reset() {
    setId(undefined);
    setSource("");
    setTitle("");
    setDescription("");
    setCover("");
    setDate("");
    setPublished(true);
    setPlatforms({ bandcamp: "", spotify: "", youtube: "" });
    lastFetched.current = "";
  }

  async function autofill(raw: string) {
    const url = raw.trim();
    if (!/^https?:\/\/\S+\.\S+/i.test(url) || url === lastFetched.current) return;
    lastFetched.current = url;
    setLoading(true);
    try {
      const meta = await preview({ data: { url } });
      setTitle(meta.title || title);
      setCover(meta.image || cover);
      setDate(meta.date || date);
      setDescription(meta.description || description);
      const platform = detectPlatform(meta.finalUrl || url);
      if (platform === "bandcamp" || platform === "spotify" || platform === "youtube") {
        setPlatforms((current) => ({ ...current, [platform]: meta.finalUrl || url }));
      }
      toast.success("Nome, capa e data carregados do link.");
    } catch (e) {
      lastFetched.current = "";
      toast.error(e instanceof Error ? e.message : "Não foi possível ler o link.");
    } finally {
      setLoading(false);
    }
  }

  function edit(item: Release) {
    const own = links.filter((link) => link.release_id === item.id);
    setId(item.id);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setCover(item.cover_url ?? "");
    setDate(item.released_at ?? "");
    setPublished(item.published);
    setSource(own[0]?.url ?? "");
    setPlatforms({
      bandcamp: own.find((link) => link.platform === "bandcamp")?.url ?? "",
      spotify: own.find((link) => link.platform === "spotify")?.url ?? "",
      youtube: own.find((link) => link.platform === "youtube")?.url ?? "",
    });
    lastFetched.current = own[0]?.url ?? "";
  }

  async function submit() {
    if (!title.trim()) {
      toast.error("Informe o nome do release.");
      return;
    }
    setSaving(true);
    try {
      const saved = (await save({
        data: {
          table: "releases",
          item: {
            ...(id ? { id } : {}),
            title: title.trim(),
            description: description.trim() || null,
            cover_url: cover.trim() || null,
            released_at: date || null,
            published,
            sort_order: id
              ? (items.find((item) => item.id === id)?.sort_order ?? items.length)
              : items.length,
          },
        },
      })) as Release;
      const releaseId = saved.id;
      const previous = links.filter((link) => link.release_id === releaseId);
      for (const link of previous) await remove({ data: { table: "release_links", id: link.id } });
      const next = PLATFORMS.map(([key], index) => ({
        platform: key,
        url: platforms[key].trim(),
        sort_order: index,
      })).filter((link) => /^https?:\/\//i.test(link.url));
      for (const link of next) {
        await save({ data: { table: "release_links", item: { release_id: releaseId, ...link } } });
      }
      reset();
      await onChanged();
      toast.success("Release salvo.");
    } catch {
      toast.error("Não foi possível salvar. Use links https://.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      <section className="mt-7 border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl uppercase">{id ? "Editar release" : "Novo release"}</h2>
          {id && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X /> Cancelar
            </Button>
          )}
        </div>
        <div className="mt-6 space-y-3">
          <label className="block text-xs uppercase tracking-[.15em] text-muted-foreground">
            Link
            <div className="mt-1 flex gap-2">
              <Input
                placeholder="https://…"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                onBlur={(e) => void autofill(e.target.value)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  if (text) window.setTimeout(() => void autofill(text), 0);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={loading || !source}
                onClick={() => void autofill(source)}
                aria-label="Buscar dados do link"
              >
                {loading ? <LoaderCircle className="animate-spin" /> : <Wand2 />}
              </Button>
            </div>
          </label>
          <Input placeholder="Nome" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            placeholder="URL da capa"
            value={cover}
            onChange={(e) => setCover(e.target.value)}
          />
          {cover && <img src={cover} alt="" className="aspect-square w-full object-cover" />}
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Textarea
            placeholder="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {PLATFORMS.map(([key, label, placeholder]) => (
            <label
              key={key}
              className="block text-xs uppercase tracking-[.15em] text-muted-foreground"
            >
              {label}
              <Input
                className="mt-1"
                placeholder={placeholder}
                value={platforms[key]}
                onChange={(e) => setPlatforms((v) => ({ ...v, [key]: e.target.value }))}
              />
            </label>
          ))}
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={published} onCheckedChange={setPublished} /> Publicado
          </label>
          <Button className="w-full" onClick={() => void submit()} disabled={saving}>
            {saving ? <LoaderCircle className="animate-spin" /> : id ? <Save /> : <Plus />}
            {id ? "Salvar" : "Adicionar"}
          </Button>
        </div>
      </section>
      <section className="mt-7">
        <h2 className="mb-6 text-2xl uppercase">Cadastrados</h2>
        {items.length === 0 ? (
          <p className="border-y border-border py-10 text-sm text-muted-foreground">
            Nenhum release cadastrado.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 border-t border-border py-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium uppercase">{item.title}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">
                  {item.released_at ?? "Sem data"} · {item.published ? "Visível" : "Rascunho"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Editar ${item.title}`}
                onClick={() => edit(item)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Excluir ${item.title}`}
                onClick={async () => {
                  await remove({ data: { table: "releases", id: item.id } });
                  if (id === item.id) reset();
                  await onChanged();
                  toast.success("Release removido.");
                }}
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
