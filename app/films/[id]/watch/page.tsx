"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { VideoPlayer } from "@/components/video-player";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LoadingScreen from "@/components/loading-screen";
import FilmInfo from "@/components/FilmInfo";
import SimilarMoviesGrid from "@/components/SimilarMoviesGrid";
import { supabase } from "@/lib/supabaseClient";
import { getTMDBImageUrl } from "@/lib/tmdb";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/footer";

function normalizeBackdropUrl(raw: string | undefined) {
  if (typeof raw === "string" && raw.trim().length > 0) {
    if (/^https?:\/\//.test(raw)) return raw.trim();
    return getTMDBImageUrl(raw, "original");
  }
  return "/placeholder-backdrop.jpg";
}

type Movie = {
  id: string;
  title: string;
  year?: number;
  genre?: string;
  is_vip?: boolean;
  duration?: number;
  rating?: number;
  description?: string;
  backdrop?: string;
  poster?: string;
  video_url?: string;
  tmdb_id?: string;
  backdropUrl?: string;
  posterUrl?: string;
};

export default function WatchFilmPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMovie() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: movieError } = await supabase
          .from("films")
          .select("*")
          .eq("id", id)
          .single();

        if (movieError || !data) {
          setError("Film non trouvé.");
        } else {
          setMovie({
            ...data,
            backdropUrl: normalizeBackdropUrl(data.backdrop),
            posterUrl: data.poster
              ? /^https?:\/\//.test(data.poster)
                ? data.poster
                : getTMDBImageUrl(data.poster, "w300")
              : "/placeholder-poster.png",
          });
        }
      } catch {
        setError("Impossible de charger le film.");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchMovie();
  }, [id]);

  if (loading) return <LoadingScreen />;
  if (error || !movie) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black/90 px-4">
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-6 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-2">Erreur</h2>
          <p className="text-gray-300">{error || "Film non trouvé"}</p>
          <Button onClick={() => router.push(`/films/${id}`)} className="mt-4 rounded-2xl text-lg px-6 py-3">
            <ArrowLeft className="h-5 w-5 mr-2" /> Retour à la fiche film
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col justify-center items-center overflow-x-hidden">
      {/* Backdrop */}
      {movie.backdropUrl && (
        <div className="fixed inset-0 z-0 w-full h-full">
          <img
            src={movie.backdropUrl}
            alt={`Backdrop de ${movie.title}`}
            className="w-full h-full object-cover object-center blur-md brightness-50 scale-105 transition-all duration-500"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto pt-24 pb-10 px-2 sm:px-6 flex flex-col items-center">
        {/* Retour bouton flottant */}
        <Button
          variant="secondary"
          className="absolute top-6 left-2 sm:left-6 rounded-full shadow-lg bg-black/70 text-lg px-5 py-3 hover:scale-105 hover:bg-black/90 transition-all"
          onClick={() => router.push(`/films/${id}`)}
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Retour à la fiche film
        </Button>

        {/* Player */}
        <div className="w-full max-w-3xl aspect-video rounded-2xl shadow-2xl overflow-hidden bg-black mt-8 animate-fadeInUp">
          <VideoPlayer
            src={movie.video_url || ""}
            poster={movie.posterUrl}
            title={movie.title}
            autoPlay
          />
        </div>

        {/* Metadata */}
        <section className="w-full max-w-3xl mx-auto mt-8 bg-gray-900/80 backdrop-blur-lg rounded-2xl shadow-lg px-6 py-6 flex flex-col gap-2 animate-fadeInUp">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mr-3">
              {movie.title}
            </h1>
            {movie.year && (
              <span className="text-base px-3 py-1 rounded-xl bg-gray-800/50 text-gray-200 font-medium">
                {movie.year}
              </span>
            )}
            {movie.genre && (
              <span className="text-base px-3 py-1 rounded-xl bg-primary/20 text-primary font-medium">
                {movie.genre}
              </span>
            )}
            {movie.is_vip && (
              <Badge
                variant="secondary"
                className="text-amber-400 bg-amber-900/60 border-amber-800/80 px-4 py-1 text-lg ml-1"
              >
                VIP
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-gray-300 text-sm mb-2">
            {movie.duration && (
              <span>
                <b>Durée :</b> {movie.duration} min
              </span>
            )}
            {movie.rating && (
              <span>
                <b>Note :</b> <span className="text-yellow-400">★ {movie.rating.toFixed(1)}</span>
              </span>
            )}
          </div>
          <p className="text-gray-200 text-base whitespace-pre-line mt-1">{movie.description}</p>
        </section>

        {/* Films similaires */}
        <section className="w-full max-w-6xl mx-auto mt-10 animate-fadeInUp">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold">Films similaires</h2>
              <p className="text-gray-400 text-sm mt-1">Découvrez d'autres œuvres que vous pourriez aimer&nbsp;!</p>
            </div>
            {/* Optionnel : bouton voir tout vers la catégorie/genre du film */}
            {movie.genre && (
              <Link
                href={`/films?genre=${encodeURIComponent(movie.genre)}`}
                className={`
                  text-sm flex items-center font-medium
                  bg-gradient-to-r from-fuchsia-400 via-pink-400 to-violet-500
                  bg-clip-text text-transparent
                  underline underline-offset-4
                  transition-all duration-300
                  hover:bg-none hover:text-violet-400 hover:scale-105
                  focus:outline-none
                `}
                style={{
                  WebkitTextFillColor: 'transparent',
                  background: 'linear-gradient(90deg, #e879f9, #ec4899, #a78bfa)',
                  WebkitBackgroundClip: 'text',
                  padding: 0,
                  border: "none"
                }}
              >
                <span className="underline underline-offset-4">Voir tout</span>
              </Link>
            )}
          </div>
          <SimilarMoviesGrid tmdbId={movie.tmdb_id || ""} />
        </section>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(24px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s cubic-bezier(.23,1.02,.25,1) both;
        }
      `}</style>
    {/* Footer */}
        <div className="w-full mt-8">
          <Footer />
        </div>
    </div>
  );
}