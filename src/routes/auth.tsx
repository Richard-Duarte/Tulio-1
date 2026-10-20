import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { TulioWordmark } from "@/components/tulio/TulioWordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminLogin } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin — TULIO" },
      { name: "description", content: "Acesso restrito ao painel de conteúdo de Tulio." },
      { property: "og:title", content: "Admin — TULIO" },
      { property: "og:description", content: "Acesso restrito." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const login = useServerFn(adminLogin);
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await login({ data: { password } });
      if (!result.ok) {
        setError("Senha incorreta.");
        return;
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });
      if (sessionError) throw sessionError;
      await nav({ to: "/admin" });
    } catch {
      setError("Não foi possível entrar agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm border border-border bg-card p-7">
        <TulioWordmark className="text-4xl text-foreground" />
        <LockKeyhole className="mt-14 text-primary" />
        <h1 className="mt-5 text-4xl uppercase">Painel</h1>
        <p className="mt-2 text-sm text-muted-foreground">Acesso restrito à equipe.</p>
        <Input
          className="mt-8"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          autoComplete="current-password"
          autoFocus
          aria-label="Senha do painel"
        />
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <Button className="mt-5 w-full" disabled={loading}>
          {loading ? <LoaderCircle className="animate-spin" /> : "Entrar"}
        </Button>
      </form>
    </main>
  );
}
