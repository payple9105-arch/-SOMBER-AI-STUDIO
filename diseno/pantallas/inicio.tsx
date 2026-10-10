import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Clapperboard,
  ImagePlus,
  Mic2,
  Music2,
  Sparkles,
  Subtitles,
  WandSparkles,
  FolderKanban,
} from "lucide-react";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { Mark } from "@/components/mark";

export const Route = createFileRoute("/")({ component: Home });

const TOOLS = [
  { title: "Texto a video", text: "Describe una escena y el estudio la convierte en un clip.", to: "/generar", icon: WandSparkles },
  { title: "Imagen a video", text: "Anima una imagen que ya generaste.", to: "/generar", icon: ImagePlus },
  { title: "Anime Studio", text: "Personajes, escenarios y escenas con estilo anime.", to: "/anime", icon: Sparkles },
  { title: "Voces IA", text: "Narra el guion con una voz sintética.", to: "/generar", icon: Mic2 },
  { title: "Música IA", text: "Todavía no hay un proveedor de música conectado. Puedes importar audio al editor.", to: "/editor", icon: Music2 },
  { title: "Editor", text: "Ordena clips, subtítulos y narración en una línea de tiempo.", to: "/editor", icon: Clapperboard },
  { title: "Subtítulos", text: "Coloca el texto del guion sobre la secuencia.", to: "/editor", icon: Subtitles },
  { title: "Mis proyectos", text: "Todo lo que generes queda guardado en tu cuenta.", to: "/proyectos", icon: FolderKanban },
] as const;

function Home() {
  return (
    <div className="min-h-screen text-fg">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 md:px-6">
        <Mark />
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/planes" className="hidden min-h-11 items-center px-3 text-muted sm:flex">
            Planes
          </Link>
          <SignedOut>
            <Link to="/login" search={{ alta: false }} className="inline-flex min-h-11 items-center rounded-full border border-line px-4">
              Entrar
            </Link>
            <Link
              to="/login"
              search={{ alta: true }}
              className="inline-flex min-h-11 items-center rounded-full bg-violet px-4 font-semibold text-bg"
            >
              Registrarse
            </Link>
          </SignedOut>
          <SignedIn>
            <Link to="/panel" className="inline-flex min-h-11 items-center rounded-full bg-violet px-4 font-semibold text-bg">
              Ir al panel
            </Link>
          </SignedIn>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <section className="grid items-center gap-8 py-8 md:grid-cols-2 md:py-14">
          <div>
            <p className="text-xs tracking-widest text-electric uppercase">Estudio de video con IA</p>
            <h1 className="font-display mt-3 text-4xl leading-tight font-extrabold md:text-6xl">
              Convierte tus ideas en videos increíbles
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
              Escribe una escena, elige el formato y genera. Anime, cine o vertical para redes.
              Tus proyectos viven en tu cuenta, no en el navegador de otra persona.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/generar"
                search={{ modo: "video" }}
                className="inline-flex min-h-12 items-center rounded-full bg-electric px-5 font-semibold text-bg"
              >
                Comenzar a crear
              </Link>
              <Link
                to="/anime"
                className="inline-flex min-h-12 items-center rounded-full border border-line px-5"
              >
                Abrir Anime Studio
              </Link>
            </div>
          </div>
          <figure className="overflow-hidden rounded-card border border-line bg-surface">
            <img
              src="/gallery/hero.jpg"
              alt="Personaje de espaldas frente a una ciudad violeta y meteoros azules"
              className="aspect-video w-full object-cover"
            />
          </figure>
        </section>

        <section className="mt-4">
          <h2 className="font-display text-2xl font-bold">Herramientas</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.title}
                  to={tool.to}
                  className="rounded-card border border-line bg-surface p-4 transition hover:border-electric"
                >
                  <Icon className="h-5 w-5 text-electric" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold">{tool.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{tool.text}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-12 grid gap-3 md:grid-cols-3">
          {[
            ["/gallery/neon.jpg", "Ciudad bajo la lluvia"],
            ["/gallery/mesa.jpg", "Carretera al atardecer"],
            ["/gallery/portrait.jpg", "Retrato de estudio"],
          ].map(([src, alt]) => (
            <img key={src} src={src} alt={alt} className="aspect-video w-full rounded-card object-cover" />
          ))}
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            ["1", "Describe", "Elige estilo, duración y formato vertical, horizontal o cuadrado."],
            ["2", "Genera", "El servidor llama al modelo. La clave nunca viaja al navegador."],
            ["3", "Edita", "Ordena los clips, añade la narración y guarda el proyecto."],
          ].map(([n, title, text]) => (
            <div key={n} className="rounded-card border border-line bg-surface-2 p-5">
              <p className="font-display text-electric">{n}</p>
              <h3 className="mt-2 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
