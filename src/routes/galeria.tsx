import { createFileRoute } from "@tanstack/react-router";
import { MediaGrid } from "@/components/jula/MediaGrid";
import { PageIntro } from "@/components/jula/PageIntro";
import { getParties, getPublicMedia } from "@/lib/public.functions";
import { useI18n } from "@/lib/i18n";
export const Route=createFileRoute("/galeria")({loader:async()=>{const [media,parties]=await Promise.all([getPublicMedia(),getParties()]);return {media,parties}},head:()=>({meta:[{title:"Galeria — TULIO"},{name:"description",content:"Fotos e vídeos da trajetória de Tulio em clubes e festivais."},{property:"og:title",content:"Galeria — TULIO"},{property:"og:description",content:"Arquivo visual oficial de Tulio."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}),component:Gallery,errorComponent:()=>null,notFoundComponent:()=>null});
function Gallery(){const {t}=useI18n();const {media,parties}=Route.useLoaderData();return <main className="nc-page bg-black"><PageIntro eyebrow={t("galleryEyebrow")} title={t("gallery")} description={t("galleryDescription")}/><div className="px-5 pb-20 md:px-10 lg:px-14"><MediaGrid items={media} parties={parties} phoneGrid/></div></main>}
