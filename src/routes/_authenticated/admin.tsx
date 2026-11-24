import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, LoaderCircle, LogOut, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteAdminItem,
  dissolvePartyGroup,
  getAdminData,
  saveAdminItem,
  saveSetsShuffle,
  saveSocialLinks,
  saveSetsDescription,
  saveTulioHome,
  setPanelPassword,
} from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { uploadFailureHint } from "@/lib/media-budget";
import { uploadPreparedSiteFile } from "@/lib/upload-prepared";
import { LinkSetEditor } from "@/components/jula/admin/LinkSetEditor";
import { UpcomingDatesAdmin } from "@/components/jula/admin/UpcomingDatesAdmin";
import { MediaLibrary } from "@/components/jula/admin/MediaLibrary";
import { ReleaseEditor } from "@/components/jula/admin/ReleaseEditor";
import { PresskitAdminPanel } from "@/components/jula/admin/PresskitAdminPanel";
import { coercePresskitAdminSettings } from "@/lib/presskit-admin-settings";
import { siteParties } from "@/lib/site-photos";
import {
  isSavedPartyId,
  linkParties,
  partiesListedInAdmin,
  type GalleryParty,
} from "@/lib/gallery-groups";
import {
  moveSocialKey,
  normalizeSocialOrder,
  SOCIAL_PLATFORMS,
  type SocialKey,
} from "@/lib/social-order";
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel — TULIO" },
      { name: "description", content: "Gerenciamento de conteúdo do site de Tulio." },
      { property: "og:title", content: "Painel — TULIO" },
      { property: "og:description", content: "Área administrativa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});
/** Built-in gallery parties plus the ones saved in the panel. */
function tulioParties(saved: GalleryParty[]): GalleryParty[] {
  return [...siteParties.map(({ id, name, happened_at }) => ({ id, name, happened_at })), ...saved];
}

function Admin() {
  const fn = useServerFn(getAdminData);
  const save = useServerFn(saveAdminItem);
  const remove = useServerFn(deleteAdminItem);
  const saveSocial = useServerFn(saveSocialLinks);
  const saveSetsDesc = useServerFn(saveSetsDescription);
  const [setsDescription, setSetsDescription] = useState("");
  const saveHome = useServerFn(saveTulioHome);
  const query = useQueryClient();
  const nav = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-content"], queryFn: fn });
  const [setsShuffle, setSetsShuffle] = useState(false);
  const saveSetsShuffleFn = useServerFn(saveSetsShuffle);
  const [party, setParty] = useState({ name: "", happened_at: "" });
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);
  const [partyEdit, setPartyEdit] = useState({ name: "", happened_at: "" });
  const dissolveParty = useServerFn(dissolvePartyGroup);
  const emptyHome = {
    section1_image_url: "/brand/tulio-session.jpg",
    section1_right_image_url: "/brand/tulio-booth.jpg",
    section1_image_alt: "Tulio no set",
    booking_email: "soniccdrivebookings@gmail.com",
    facebook_url: "",
    x_url: "",
    tiktok_url: "",
    youtube_url: "",
    soundcloud_url: "",
    bandcamp_url: "",
    instagram_url: "",
    spotify_url: "",
    beatport_url: "",
    social_order: normalizeSocialOrder(null),
  };
  const [home, setHome] = useState(emptyHome);
  const [homeUploading, setHomeUploading] = useState(false);
  const [heroTitle, setHeroTitle] = useState("Trajetória");
  const [heroBody, setHeroBody] = useState("");
  const [heroImage, setHeroImage] = useState("/brand/tulio-n26.jpg");
  const [heroUploading, setHeroUploading] = useState(false);
  const savePanel = useServerFn(setPanelPassword);
  const [panelPass, setPanelPass] = useState("");
  const [panelPass2, setPanelPass2] = useState("");
  useEffect(() => {
    if (data?.settings) {
      setSetsShuffle(data.settings.sets_shuffle ?? false);
      setSetsDescription(
        (data.settings as { sets_description?: string | null }).sets_description ?? "",
      );
    }
    if (data?.home) {
      const row = data.home;
      setHome({
        section1_image_url: row.section1_image_url ?? "",
        section1_right_image_url: row.section1_right_image_url || "/brand/tulio-booth.jpg",
        section1_image_alt: row.section1_image_alt ?? "",
        booking_email: row.booking_email ?? "",
        facebook_url: row.facebook_url ?? "",
        x_url: row.x_url ?? "",
        tiktok_url: row.tiktok_url ?? "",
        youtube_url: row.youtube_url ?? "",
        soundcloud_url: row.soundcloud_url ?? "",
        bandcamp_url: row.bandcamp_url ?? "",
        instagram_url: row.instagram_url ?? "",
        spotify_url: row.spotify_url ?? "",
        beatport_url: row.beatport_url ?? "",
        social_order: normalizeSocialOrder(row.social_order),
      });
      setHeroTitle(row.hero_title?.trim() || "Trajetória");
      setHeroBody(row.hero_body ?? "");
      setHeroImage(row.hero_image_url || "/brand/tulio-n26.jpg");
    }
  }, [data]);
  function moveIcon(key: SocialKey, delta: -1 | 1) {
    setHome((v) => ({ ...v, social_order: moveSocialKey(v.social_order, key, delta) }));
  }
  async function refresh() {
    await query.invalidateQueries({ queryKey: ["admin-content"] });
  }
  async function savePartyDraft() {
    try {
      await save({
        data: {
          table: "parties",
          item: { name: party.name, happened_at: party.happened_at || null, sort_order: 0 },
        },
      });
      setParty({ name: "", happened_at: "" });
      await refresh();
      toast.success("Festa criada.");
    } catch {
      toast.error("Não foi possível salvar.");
    }
  }
  function startEditParty(p: GalleryParty) {
    setEditingPartyId(p.id);
    setPartyEdit({ name: p.name, happened_at: p.happened_at ?? "" });
  }
  async function savePartyEdit(partyId: string) {
    const name = partyEdit.name.trim();
    if (!name) {
      toast.error("Informe o nome da festa.");
      return;
    }
    try {
      await save({
        data: {
          table: "parties",
          item: {
            id: partyId,
            name,
            happened_at: partyEdit.happened_at || null,
            sort_order: 0,
          },
        },
      });
      setEditingPartyId(null);
      await refresh();
      toast.success("Festa atualizada.");
    } catch {
      toast.error("Não foi possível salvar.");
    }
  }
  async function removePartyGroup(
    p: GalleryParty,
    countForParty: (partyId: string) => number,
  ) {
    const count = countForParty(p.id);
    const label = count
      ? `Remover a festa “${p.name}”? ${count} mídia(s) ficam sem festa (podem ir para Outros registros na galeria).`
      : `Remover a festa “${p.name}”?`;
    if (!window.confirm(label)) return;
    try {
      await dissolveParty({ data: { party_id: p.id } });
      setEditingPartyId(null);
      await refresh();
      toast.success("Festa removida.");
    } catch {
      toast.error("Não foi possível remover.");
    }
  }
  async function setMediaParty(item: any, value: string) {
    await save({ data: { table: "media", item: { ...item, party_id: value || null } } });
    await refresh();
  }
  async function toggleMedia(
    item: any,
    key: "visible" | "presskit_enabled" | "downloadable" | "homepage_enabled",
    value: boolean,
  ) {
    await save({ data: { table: "media", item: { ...item, [key]: value } } });
    await refresh();
  }
  async function saveMediaTitle(item: any, title: string) {
    await save({ data: { table: "media", item: { ...item, title } } });
    await refresh();
    toast.success("Nome atualizado.");
  }
  async function changePanelPassword() {
    if (panelPass.length < 4 || panelPass !== panelPass2) {
      toast.error("As senhas precisam ter 4+ caracteres e ser iguais.");
      return;
    }
    try {
      await savePanel({ data: { password: panelPass } });
      setPanelPass("");
      setPanelPass2("");
      toast.success("Senha do painel atualizada.");
    } catch {
      toast.error("Não foi possível atualizar a senha.");
    }
  }
  async function logout() {
    await query.cancelQueries();
    query.clear();
    await supabase.auth.signOut();
    await nav({ to: "/auth", replace: true });
  }
  if (isLoading)
    return (
      <main className="grid min-h-screen place-items-center">
        <LoaderCircle className="animate-spin text-primary" />
      </main>
    );
  if (error || !data)
    return <main className="grid min-h-screen place-items-center">Acesso indisponível.</main>;
  const { parties: linkedParties, partyIdOf } = linkParties(tulioParties(data.parties), data.media);
  const photoCount = (partyId: string) =>
    data.media.filter((m) => partyIdOf(m.party_id) === partyId).length;
  const savedIds = new Set(data.parties.map((p) => p.id));
  const listedParties = partiesListedInAdmin(linkedParties, savedIds, photoCount);
  return (
    <main className="min-h-screen px-5 py-8 md:px-10">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">Tulio CMS</p>
          <h1 className="mt-2 text-4xl uppercase">Painel administrativo</h1>
        </div>
        <Button variant="outline" onClick={logout}>
          <LogOut /> Sair
        </Button>
      </header>
      <Tabs defaultValue="site" className="mt-8">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="site">Site</TabsTrigger>
          <TabsTrigger value="sets">Sets</TabsTrigger>
          <TabsTrigger value="live_sets">Live Sets</TabsTrigger>
          <TabsTrigger value="releases">Releases</TabsTrigger>
          <TabsTrigger value="presskit">Presskit</TabsTrigger>
          <TabsTrigger value="media">Mídia</TabsTrigger>
          <TabsTrigger value="redes">Sessão 1</TabsTrigger>
          <TabsTrigger value="acesso">Acesso</TabsTrigger>
          <TabsTrigger value="parties">Festas</TabsTrigger>
          <TabsTrigger value="datas">Próximas datas</TabsTrigger>
        </TabsList>
        <TabsContent value="site">
          <Panel title="Texto da home">
            <p className="-mt-3 mb-5 text-sm text-muted-foreground">
              O texto e a foto que aparecem juntos na home.
            </p>
            {heroImage && (
              <img src={heroImage} alt="" className="mb-4 aspect-[4/5] w-40 object-cover" />
            )}
            <label className="block text-xs uppercase tracking-[.15em] text-muted-foreground">
              Foto ao lado do texto
              <Input
                className="mt-1"
                type="file"
                accept="image/*"
                disabled={heroUploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setHeroUploading(true);
                  try {
                    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
                    const path = `home/hero-${Date.now()}.${ext}`;
                    await uploadPreparedSiteFile(file, path);
                    const url = supabase.storage.from("site-media").getPublicUrl(path).data.publicUrl;
                    setHeroImage(url);
                    toast.success("Foto enviada. Salve para publicar.");
                  } catch (error) {
                    const raw = error instanceof Error ? error.message : "";
                    toast.error(uploadFailureHint(raw) || "Não foi possível enviar a foto.");
                  } finally {
                    setHeroUploading(false);
                  }
                }}
              />
            </label>
            <label className="mt-4 block text-xs uppercase tracking-[.15em] text-muted-foreground">
              Trajetória
              <Input
                className="mt-1"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder="Trajetória"
              />
            </label>
            <Textarea
              className="mt-4 min-h-72"
              value={heroBody}
              onChange={(e) => setHeroBody(e.target.value)}
            />
            <Button
              className="mt-6"
              disabled={heroUploading}
              onClick={async () => {
                await saveHome({
                  data: {
                    ...home,
                    hero_title: heroTitle,
                    hero_body: heroBody,
                    hero_image_url: heroImage,
                  },
                });
                toast.success("Site atualizado.");
              }}
            >
              <Save /> Salvar alterações
            </Button>
          </Panel>
        </TabsContent>
        <TabsContent value="sets">
          <Panel title="Texto da página Sets">
            <Textarea
              value={setsDescription}
              placeholder="Sets de techno, secos e noturnos, feitos para a pista."
              onChange={(e) => setSetsDescription(e.target.value)}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Em branco = texto padrão (traduzido automaticamente nos outros idiomas).
            </p>
            <Button
              className="mt-4"
              onClick={async () => {
                try {
                  await saveSetsDesc({ data: { sets_description: setsDescription } });
                  await refresh();
                  toast.success("Texto da página Sets atualizado.");
                } catch {
                  toast.error("Não foi possível salvar o texto.");
                }
              }}
            >
              <Save /> Salvar texto
            </Button>
          </Panel>
          <LinkSetEditor
            kind="sets"
            items={data.sets}
            onChanged={refresh}
            shuffle={setsShuffle}
            onShuffle={async (enabled) => {
              setSetsShuffle(enabled);
              await saveSetsShuffleFn({ data: { sets_shuffle: enabled } });
              await refresh();
              toast.success(enabled ? "Modo aleatório ativado." : "Sequência ativada.");
            }}
          />
        </TabsContent>
        <TabsContent value="live_sets">
          <LinkSetEditor kind="live_sets" items={data.live_sets} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="releases">
          <ReleaseEditor items={data.releases} links={data.release_links} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="presskit">
          <PresskitAdminPanel
            settings={coercePresskitAdminSettings(data.settings)}
            bookingEmail={typeof data.home?.booking_email === "string" ? data.home.booking_email : ""}
            onSaved={refresh}
          />
        </TabsContent>
        <TabsContent value="media">
          <MediaLibrary
            library="tulio"
            media={data.media}
            parties={tulioParties(data.parties)}
            onChanged={refresh}
          />
        </TabsContent>
        <TabsContent value="redes">
          <Panel title="Sessão 1">
            <p className="-mt-3 mb-5 text-sm text-muted-foreground">
              As duas fotos da abertura, o texto da foto da esquerda e os links dos ícones. No
              celular, o e-mail de bookings fica na faixa preta abaixo do carrossel.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              {(
                [
                  ["section1_image_url", "Foto da esquerda", "left"],
                  ["section1_right_image_url", "Foto da direita", "right"],
                ] as const
              ).map(([key, label, slot]) => (
                <div key={key}>
                  {home[key] && (
                    <img src={home[key]} alt="" className="mb-4 aspect-[4/5] w-40 object-cover" />
                  )}
                  <label className="block text-xs uppercase tracking-[.15em] text-muted-foreground">
                    {label}
                    <Input
                      className="mt-1"
                      type="file"
                      accept="image/*"
                      disabled={homeUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        setHomeUploading(true);
                        try {
                          const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
                          const path = `home/section1-${slot}-${Date.now()}.${ext}`;
                          await uploadPreparedSiteFile(file, path);
                          const url = supabase.storage.from("site-media").getPublicUrl(path).data.publicUrl;
                          setHome((current) => ({ ...current, [key]: url }));
                          toast.success("Foto enviada. Salve para publicar.");
                        } catch (error) {
                          const raw = error instanceof Error ? error.message : "";
                          toast.error(uploadFailureHint(raw) || "Não foi possível enviar a foto.");
                        } finally {
                          setHomeUploading(false);
                        }
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
            <label className="mt-3 block text-xs uppercase tracking-[.15em] text-muted-foreground">
              Texto da foto da esquerda
              <Input
                className="mt-1"
                value={home.section1_image_alt}
                onChange={(e) => setHome((v) => ({ ...v, section1_image_alt: e.target.value }))}
              />
            </label>
            <label className="mt-3 block text-xs uppercase tracking-[.15em] text-muted-foreground">
              E-mail de bookings
              <Input
                className="mt-1"
                value={home.booking_email}
                onChange={(e) => setHome((v) => ({ ...v, booking_email: e.target.value }))}
              />
            </label>
            <p className="mt-6 text-sm text-muted-foreground">
              Ícones: só aparecem os que têm link. A ordem da lista é a do site — o primeiro de cima
              fica à esquerda.
            </p>
            <div className="mt-3 space-y-3">
              {home.social_order.map((key, index) => (
                <div key={key} className="flex items-end gap-2">
                  <label className="block flex-1 text-xs uppercase tracking-[.15em] text-muted-foreground">
                    {SOCIAL_PLATFORMS.find((p) => p.key === key)!.label}
                    <Input
                      className="mt-1"
                      placeholder="https://"
                      value={home[key]}
                      onChange={(e) => setHome((v) => ({ ...v, [key]: e.target.value }))}
                    />
                  </label>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => moveIcon(key, -1)}
                    aria-label="Subir"
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={index === home.social_order.length - 1}
                    onClick={() => moveIcon(key, 1)}
                    aria-label="Descer"
                  >
                    <ArrowDown />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              className="mt-6"
              disabled={homeUploading}
              onClick={async () => {
                try {
                  const result = await saveHome({ data: home });
                  await refresh();
                  if (result.orderSaved) toast.success("Sessão 1 atualizada.");
                  else
                    toast.warning("Links salvos, mas a ordem dos ícones ainda não pôde ser salva.");
                } catch {
                  toast.error("Verifique a foto, o texto e os links (use https://).");
                }
              }}
            >
              <Save /> Salvar sessão 1
            </Button>
          </Panel>
        </TabsContent>
        <TabsContent value="datas">
          <UpcomingDatesAdmin />
        </TabsContent>
        <TabsContent value="parties">
          <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
            <Panel title="Nova festa">
              <div className="space-y-3">
                <Input
                  placeholder="Nome da festa"
                  value={party.name}
                  onChange={(e) => setParty((v) => ({ ...v, name: e.target.value }))}
                />
                <Input
                  type="date"
                  value={party.happened_at}
                  onChange={(e) => setParty((v) => ({ ...v, happened_at: e.target.value }))}
                />
                <Button className="w-full" onClick={savePartyDraft} disabled={!party.name}>
                  <Plus />
                  Adicionar
                </Button>
              </div>
            </Panel>
            <section className="mt-7">
              <h2 className="mb-6 text-2xl uppercase">Festas cadastradas</h2>
              {listedParties.length === 0 ? (
                <p className="border-y border-border py-10 text-sm text-muted-foreground">
                  Nenhuma festa cadastrada.
                </p>
              ) : (
                listedParties.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-4"
                  >
                    {editingPartyId === p.id && isSavedPartyId(p.id) ? (
                      <div className="flex w-full flex-wrap items-end gap-2 sm:flex-nowrap">
                        <Input
                          className="min-w-[12rem] flex-1"
                          value={partyEdit.name}
                          onChange={(e) => setPartyEdit((v) => ({ ...v, name: e.target.value }))}
                          placeholder="Nome da festa"
                        />
                        <Input
                          className="w-40"
                          type="date"
                          value={partyEdit.happened_at}
                          onChange={(e) =>
                            setPartyEdit((v) => ({ ...v, happened_at: e.target.value }))
                          }
                        />
                        <Button onClick={() => void savePartyEdit(p.id)}>
                          <Save /> Salvar
                        </Button>
                        <Button variant="ghost" onClick={() => setEditingPartyId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="font-medium uppercase">{p.name}</p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">
                            {p.happened_at ?? "Sem data"} · {photoCount(p.id)} fotos
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {isSavedPartyId(p.id) ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditParty(p)}
                              aria-label={`Editar ${p.name}`}
                            >
                              <Pencil />
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void removePartyGroup(p, photoCount)}
                            aria-label={`Excluir ${p.name}`}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </section>
          </div>
        </TabsContent>
        <TabsContent value="acesso">
          <div className="space-y-6">
            <Panel title="Senha do painel">
              <p className="text-sm text-muted-foreground">
                Altera a senha usada para entrar neste painel.
              </p>
              <div className="mt-5 max-w-sm space-y-3">
                <Input
                  type="password"
                  placeholder="Nova senha"
                  value={panelPass}
                  onChange={(e) => setPanelPass(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Repita a nova senha"
                  value={panelPass2}
                  onChange={(e) => setPanelPass2(e.target.value)}
                />
                <Button onClick={changePanelPassword} disabled={!panelPass}>
                  <Save /> Atualizar senha do painel
                </Button>
              </div>
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 max-w-4xl border border-border bg-card p-6">
      <h2 className="mb-6 text-2xl uppercase">{title}</h2>
      {children}
    </section>
  );
}
