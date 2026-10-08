import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, LogOut, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteAdminItem,
  getAdminData,
  saveAdminItem,
  saveSettings,
  saveSocialLinks,
  setPanelPassword,
  setPresskitPassword,
} from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { LinkSetEditor } from "@/components/jula/admin/LinkSetEditor";
import { UpcomingDatesAdmin } from "@/components/jula/admin/UpcomingDatesAdmin";
import { MediaLibrary } from "@/components/jula/admin/MediaLibrary";
import { ReleaseEditor } from "@/components/jula/admin/ReleaseEditor";
import { ReleaseSectionsEditor } from "@/components/jula/admin/ReleaseSectionsEditor";
import { TrackEditor } from "@/components/jula/admin/TrackEditor";
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel — JULA" },
      { name: "description", content: "Gerenciamento de conteúdo do site de Tulio." },
      { property: "og:title", content: "Painel — JULA" },
      { property: "og:description", content: "Área administrativa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});
function Admin() {
  const fn = useServerFn(getAdminData);
  const save = useServerFn(saveAdminItem);
  const remove = useServerFn(deleteAdminItem);
  const saveSite = useServerFn(saveSettings);
  const saveSocial = useServerFn(saveSocialLinks);
  const query = useQueryClient();
  const nav = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-content"], queryFn: fn });
  const [releaseTitle, setReleaseTitle] = useState("");
  const [releaseBody, setReleaseBody] = useState("");
  const [playerEnabled, setPlayerEnabled] = useState(true);
  const [playerShuffle, setPlayerShuffle] = useState(false);
  const [setsShuffle, setSetsShuffle] = useState(false);
  const [party, setParty] = useState({ name: "", happened_at: "" });
  const [social, setSocial] = useState({
    instagram_url: "",
    soundcloud_url: "",
    spotify_url: "",
    youtube_url: "",
    bandcamp_url: "",
  });
  const savePass = useServerFn(setPresskitPassword);
  const savePanel = useServerFn(setPanelPassword);
  const [presskitPass, setPresskitPass] = useState("");
  const [presskitPass2, setPresskitPass2] = useState("");
  const [panelPass, setPanelPass] = useState("");
  const [panelPass2, setPanelPass2] = useState("");
  useEffect(() => {
    if (data?.settings) {
      setSocial({
        instagram_url: data.settings.instagram_url ?? "",
        soundcloud_url: data.settings.soundcloud_url ?? "",
        spotify_url: data.settings.spotify_url ?? "",
        youtube_url: data.settings.youtube_url ?? "",
        bandcamp_url: data.settings.bandcamp_url ?? "",
      });
      setReleaseTitle(data.settings.release_title);
      setReleaseBody(data.settings.release_body);
      setPlayerEnabled(data.settings.player_enabled);
      setPlayerShuffle(data.settings.player_shuffle);
      setSetsShuffle(data.settings.sets_shuffle ?? false);
    }
  }, [data]);
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
  async function delParty(id: string) {
    await remove({ data: { table: "parties", id } });
    await refresh();
    toast.success("Festa removida.");
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
  async function changePresskitPassword() {
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
          <TabsTrigger value="tracks">Player</TabsTrigger>
          <TabsTrigger value="release">Release</TabsTrigger>
          <TabsTrigger value="media">Mídia</TabsTrigger>
          <TabsTrigger value="redes">Redes</TabsTrigger>
          <TabsTrigger value="acesso">Acesso</TabsTrigger>
          <TabsTrigger value="parties">Festas</TabsTrigger>
          <TabsTrigger value="datas">Próximas datas</TabsTrigger>
        </TabsList>
        <TabsContent value="site">
          <Panel title="Texto da Home">
            <Input value={releaseTitle} onChange={(e) => setReleaseTitle(e.target.value)} />
            <Textarea
              className="mt-3 min-h-72"
              value={releaseBody}
              onChange={(e) => setReleaseBody(e.target.value)}
            />
            <label className="mt-5 flex items-center gap-3 text-sm">
              <Switch checked={playerEnabled} onCheckedChange={setPlayerEnabled} /> Exibir player
            </label>
            <Button
              className="mt-6"
              onClick={async () => {
                await saveSite({
                  data: {
                    release_title: releaseTitle,
                    release_body: releaseBody,
                    player_enabled: playerEnabled,
                    player_shuffle: playerShuffle,
                    sets_shuffle: setsShuffle,
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
          <LinkSetEditor
            kind="sets"
            items={data.sets}
            onChanged={refresh}
            shuffle={setsShuffle}
            onShuffle={async (enabled) => {
              setSetsShuffle(enabled);
              await saveSite({
                data: {
                  release_title: releaseTitle,
                  release_body: releaseBody,
                  player_enabled: playerEnabled,
                  player_shuffle: playerShuffle,
                  sets_shuffle: enabled,
                },
              });
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
        <TabsContent value="tracks">
          <TrackEditor
            items={data.tracks}
            shuffle={playerShuffle}
            onChanged={refresh}
            onShuffle={async (enabled) => {
              setPlayerShuffle(enabled);
              await saveSite({
                data: {
                  release_title: releaseTitle,
                  release_body: releaseBody,
                  player_enabled: playerEnabled,
                  player_shuffle: enabled,
                  sets_shuffle: setsShuffle,
                },
              });
              await refresh();
              toast.success(enabled ? "Modo aleatório ativado." : "Sequência ativada.");
            }}
          />
        </TabsContent>
        <TabsContent value="media">
          <MediaLibrary media={data.media} parties={data.parties} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="redes">
          <Panel title="Links das redes">
            <p className="-mt-3 mb-5 text-sm text-muted-foreground">
              Os ícones aparecem na abertura na ordem Instagram, SoundCloud, Spotify, YouTube e
              Bandcamp. Deixe em branco para esconder.
            </p>
            <div className="space-y-3">
              {(
                [
                  ["instagram_url", "Instagram"],
                  ["soundcloud_url", "SoundCloud"],
                  ["spotify_url", "Spotify"],
                  ["youtube_url", "YouTube"],
                  ["bandcamp_url", "Bandcamp"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="block text-xs uppercase tracking-[.15em] text-muted-foreground"
                >
                  {label}
                  <Input
                    className="mt-1"
                    placeholder="https://"
                    value={social[key]}
                    onChange={(e) => setSocial((v) => ({ ...v, [key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            <Button
              className="mt-6"
              onClick={async () => {
                try {
                  await saveSocial({ data: social });
                  await refresh();
                  toast.success("Links atualizados.");
                } catch {
                  toast.error("Verifique os links (use https://).");
                }
              }}
            >
              <Save /> Salvar links
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
              {data.parties.length === 0 ? (
                <p className="border-y border-border py-10 text-sm text-muted-foreground">
                  Nenhuma festa cadastrada.
                </p>
              ) : (
                data.parties.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border-t border-border py-4"
                  >
                    <div>
                      <p className="font-medium uppercase">{p.name}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">
                        {p.happened_at ?? "Sem data"} ·{" "}
                        {data.media.filter((m: any) => m.party_id === p.id).length} fotos
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => delParty(p.id)}
                      aria-label={`Excluir ${p.name}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))
              )}
            </section>
          </div>
        </TabsContent>
        <TabsContent value="release">
          <ReleaseSectionsEditor items={data.release_sections ?? []} onChanged={refresh} />
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
            <Panel title="Senha do presskit">
              <p className="text-sm text-muted-foreground">
                Defina a senha que os contratantes usam para abrir o presskit.
              </p>
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
                <Button onClick={changePresskitPassword} disabled={!presskitPass}>
                  <Save /> Atualizar senha
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
