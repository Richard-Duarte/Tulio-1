import { useServerFn } from "@tanstack/react-start";
import { ImageUp, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { deleteAdminItem, saveAdminItem } from "@/lib/admin.functions";

type Section = {
  id: string;
  body: string;
  image_url: string | null;
  sort_order: number;
};

const BUCKET = "site-media";
const MAX_IMAGE = 15 * 1024 * 1024;

async function uploadImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Selecione uma imagem.");
  if (file.size > MAX_IMAGE) throw new Error("A imagem precisa ter até 15 MB.");
  const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
  const path = `release-sections/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function ReleaseSectionsEditor({
  items,
  onChanged,
}: {
  items: Section[];
  onChanged: () => Promise<void>;
}) {
  const save = useServerFn(saveAdminItem);
  const remove = useServerFn(deleteAdminItem);
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);

  async function upload(file: File, apply: (url: string) => Promise<void> | void) {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      await apply(url);
      toast.success("Imagem enviada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function add() {
    if (!body.trim()) return;
    await save({
      data: {
        table: "release_sections",
        item: {
          body: body.trim(),
          image_url: image || null,
          sort_order: items.length + 1,
        },
      },
    });
    setBody("");
    setImage("");
    await onChanged();
    toast.success("Parágrafo adicionado.");
  }

  async function patch(item: Section, changes: Partial<Section>) {
    await save({ data: { table: "release_sections", item: { ...item, ...changes } } });
    await onChanged();
    toast.success("Parágrafo atualizado.");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      <section className="mt-7 border border-border bg-card p-6">
        <h2 className="mb-6 text-2xl uppercase">Novo parágrafo</h2>
        <Textarea
          placeholder="Texto do parágrafo"
          className="min-h-40"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file, setImage);
          }}
        />
        <Button
          className="mt-3 w-full"
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <LoaderCircle className="animate-spin" /> : <ImageUp />}
          {image ? "Trocar imagem" : "Enviar imagem"}
        </Button>
        {image && (
          <img src={image} alt="" className="mt-3 max-h-80 w-full rounded object-contain" />
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          A imagem se ajusta automaticamente sem ultrapassar o tamanho atual da seção.
        </p>
        <Button
          className="mt-4 w-full"
          onClick={() => void add()}
          disabled={!body.trim() || uploading}
        >
          <Plus /> Adicionar
        </Button>
      </section>

      <section className="mt-7 space-y-6">
        {items.map((item) => (
          <article key={item.id} className="border border-border bg-card p-4">
            <Textarea
              defaultValue={item.body}
              className="min-h-32"
              onBlur={(event) => {
                if (event.target.value !== item.body)
                  void patch(item, { body: event.target.value });
              }}
            />
            <div className="mt-3 flex items-center gap-3">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt=""
                  className="h-20 w-28 shrink-0 rounded object-contain"
                />
              )}
              <label className="flex-1">
                <span className="sr-only">Trocar imagem</span>
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload(file, (url) => patch(item, { image_url: url }));
                  }}
                />
              </label>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await remove({ data: { table: "release_sections", id: item.id } });
                  await onChanged();
                  toast.success("Parágrafo removido.");
                }}
                aria-label="Excluir parágrafo"
              >
                <Trash2 />
              </Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
