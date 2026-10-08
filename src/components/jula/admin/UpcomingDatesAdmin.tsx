import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImageUp, LoaderCircle, Pencil, Plus, Save, Trash2, Wand2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/jula-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getPageMetadata } from "@/lib/link-metadata.functions";
import {
  deleteUpcomingDate,
  getAdminUpcomingDates,
  saveUpcomingDate,
} from "@/lib/upcoming-dates.functions";

type Form = {
  id?: string;
  name: string;
  event_date: string;
  event_time: string;
  venue: string;
  city: string;
  ticket_url: string;
  ticket_image_url: string;
  image_url: string;
  description: string;
  published: boolean;
};
const EMPTY: Form = {
  name: "",
  event_date: "",
  event_time: "",
  venue: "",
  city: "",
  ticket_url: "",
  ticket_image_url: "",
  image_url: "",
  description: "",
  published: true,
};
const BUCKET = "site-media";
const MAX_UPLOAD = 8 * 1024 * 1024;

const todaySP = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

function formatDate(date: string, time: string | null) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}${time ? ` · ${time.slice(0, 5)}` : ""}`;
}

const label = "block text-xs uppercase tracking-[.15em] text-muted-foreground";

export function UpcomingDatesAdmin() {
  const list = useServerFn(getAdminUpcomingDates);
  const save = useServerFn(saveUpcomingDate);
  const remove = useServerFn(deleteUpcomingDate);
  const preview = useServerFn(getPageMetadata);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-upcoming-dates"],
    queryFn: () => list(),
  });
  const [form, setForm] = useState<Form>(EMPTY);
  const [fetching, setFetching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastFetched = useRef("");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-upcoming-dates"] }),
      queryClient.invalidateQueries({ queryKey: ["upcoming-dates"] }),
    ]);
  }

  async function autofill(url: string, force = false) {
    const clean = url.trim();
    if (!/^https?:\/\/\S+\.\S+/i.test(clean) || (!force && clean === lastFetched.current)) return;
    lastFetched.current = clean;
    setFetching(true);
    try {
      const meta = await preview({ data: { url: clean } });
      // The link image is always refreshed; other fields are only filled if empty.
      setForm((f) => ({
        ...f,
        ticket_image_url: meta.image ?? "",
        name: meta.title || f.name,
        description: meta.description ?? "",
        event_date: meta.date || f.event_date,
        event_time: meta.time || f.event_time,
        venue: meta.venue || f.venue,
        city: meta.city || f.city,
      }));
      toast.success(
        meta.image ? "Dados do link carregados." : "Página lida, mas sem imagem de prévia.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ler o link.");
    } finally {
      setFetching(false);
    }
  }

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Envie um arquivo de imagem.");
      return;
    }
    if (file.size > MAX_UPLOAD) {
      toast.error("A imagem precisa ter até 8 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `upcoming-dates/${crypto.randomUUID()}.${ext || "jpg"}`;
      const { error: upError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (upError) throw upError;
      set("image_url", supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
      toast.success("Imagem enviada. Salve a data para aplicar.");
    } catch {
      toast.error("Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit() {
    if (!form.name.trim() || !form.event_date) {
      toast.error("Preencha nome e data.");
      return;
    }
    setSaving(true);
    try {
      await save({ data: { ...form, event_time: form.event_time || null } });
      setForm(EMPTY);
      lastFetched.current = "";
      await refresh();
      toast.success("Data salva.");
    } catch {
      toast.error("Não foi possível salvar. Verifique os links (https://).");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!window.confirm("Excluir esta data?")) return;
    try {
      await remove({ data: { id } });
      if (form.id === id) setForm(EMPTY);
      await refresh();
      toast.success("Data removida.");
    } catch {
      toast.error("Não foi possível remover.");
    }
  }

  const shown = form.image_url || form.ticket_image_url;
  const today = todaySP();

  return (
    <div className="mt-7 grid gap-8 lg:grid-cols-[460px_1fr]">
      <section className="border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl uppercase">{form.id ? "Editar data" : "Nova data"}</h2>
          {form.id && (
            <Button variant="ghost" size="sm" onClick={() => setForm(EMPTY)}>
              <X /> Cancelar
            </Button>
          )}
        </div>
        <div className="mt-6 space-y-4">
          <label className={label}>
            Link dos ingressos
            <div className="mt-1 flex gap-2">
              <Input
                placeholder="https://…"
                value={form.ticket_url}
                onChange={(e) => set("ticket_url", e.target.value)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  if (text) window.setTimeout(() => void autofill(text), 0);
                }}
                onBlur={(e) => void autofill(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void autofill(form.ticket_url, true)}
                disabled={fetching || !form.ticket_url}
                aria-label="Buscar dados do link"
                title="Buscar imagem e dados do link"
              >
                {fetching ? <LoaderCircle className="animate-spin" /> : <Wand2 />}
              </Button>
            </div>
            <span className="mt-1 block normal-case tracking-normal">
              Ao colocar o link, a foto, a descrição e a data são puxadas da página de ingressos.
            </span>
          </label>
          <label className={label}>
            Nome
            <Input
              className="mt-1"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </label>
          <label className={label}>
            Descrição
            <Textarea
              className="mt-1 min-h-24"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <label className={label}>
              Data
              <Input
                className="mt-1"
                type="date"
                value={form.event_date}
                onChange={(e) => set("event_date", e.target.value)}
              />
            </label>
            <label className={label}>
              Horário
              <Input
                className="mt-1"
                type="time"
                value={form.event_time}
                onChange={(e) => set("event_time", e.target.value)}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>
              Local (opcional)
              <Input
                className="mt-1"
                value={form.venue}
                onChange={(e) => set("venue", e.target.value)}
              />
            </label>
            <label className={label}>
              Cidade (opcional)
              <Input
                className="mt-1"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </label>
          </div>

          <div>
            <p className={label}>Imagem</p>
            <div className="mt-2 flex gap-4">
              <div className="h-32 w-28 shrink-0 overflow-hidden rounded-[4px] border border-border bg-background">
                {shown ? (
                  <img src={shown} alt="" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center bg-gradient-to-br from-primary/40 to-background">
                    <img src={logo.url} alt="" className="w-2/3 opacity-80" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2 text-xs text-muted-foreground">
                <p>
                  {form.image_url
                    ? "Usando a imagem enviada (tem prioridade sobre a do link)."
                    : form.ticket_image_url
                      ? "Usando a imagem do link dos ingressos."
                      : "Sem imagem: será exibida a arte padrão."}
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file);
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <LoaderCircle className="animate-spin" /> : <ImageUp />}
                    {form.image_url ? "Trocar imagem" : "Enviar imagem"}
                  </Button>
                  {form.image_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => set("image_url", "")}
                    >
                      <X /> Remover enviada
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <label className={`${label} mt-3`}>
              Imagem do link (automática)
              <Input
                className="mt-1"
                placeholder="https://…"
                value={form.ticket_image_url}
                onChange={(e) => set("ticket_image_url", e.target.value)}
              />
            </label>
          </div>

          <label className="flex items-center gap-3 text-sm">
            <Switch checked={form.published} onCheckedChange={(v) => set("published", v)} />
            Publicado
          </label>
          <Button className="w-full" onClick={() => void submit()} disabled={saving || uploading}>
            {saving ? <LoaderCircle className="animate-spin" /> : form.id ? <Save /> : <Plus />}
            {form.id ? "Salvar alterações" : "Adicionar data"}
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl uppercase">Datas cadastradas</h2>
        {isLoading ? (
          <LoaderCircle className="animate-spin text-primary" />
        ) : error ? (
          <p className="border-y border-border py-10 text-sm text-muted-foreground">
            Não foi possível carregar as datas. A tabela pode ainda não ter sido criada.
          </p>
        ) : !data?.length ? (
          <p className="border-y border-border py-10 text-sm text-muted-foreground">
            Nenhuma data cadastrada.
          </p>
        ) : (
          data.map((item) => {
            const img = item.image_url || item.ticket_image_url;
            const past = item.event_date < today;
            return (
              <div key={item.id} className="flex items-center gap-4 border-t border-border py-4">
                <div className="h-16 w-14 shrink-0 overflow-hidden rounded-[4px] bg-background">
                  {img && <img src={img} alt="" className="size-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium uppercase">{item.name}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">
                    {formatDate(item.event_date, item.event_time)}
                    {[item.venue, item.city].filter(Boolean).length > 0 &&
                      ` · ${[item.venue, item.city].filter(Boolean).join(" · ")}`}
                    {" · "}
                    {past ? "Encerrada" : item.published ? "Publicada" : "Rascunho"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Editar ${item.name}`}
                  onClick={() => {
                    lastFetched.current = item.ticket_url ?? "";
                    setForm({
                      id: item.id,
                      name: item.name,
                      event_date: item.event_date,
                      event_time: item.event_time?.slice(0, 5) ?? "",
                      venue: item.venue ?? "",
                      city: item.city ?? "",
                      ticket_url: item.ticket_url ?? "",
                      ticket_image_url: item.ticket_image_url ?? "",
                      image_url: item.image_url ?? "",
                      description: item.description ?? "",
                      published: item.published,
                    });
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Excluir ${item.name}`}
                  onClick={() => void del(item.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
