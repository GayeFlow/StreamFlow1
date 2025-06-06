'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { ImageUpload } from '@/components/admin/image-upload';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Film, 
  Info, 
  Image as ImageIcon, 
  Save, 
  ArrowLeft,
  Plus,
  X
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useEffect } from 'react';

type CastMember = {
  name: string;
  role: string;
  photo: string | null;
  file: File | null;
  preview: string | null;
};

export default function AdminAddFilmPage() {
  const router = useRouter();
  const { toast } = useToast();

  // TMDB Search State
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const tmdbInputRef = useRef<HTMLInputElement>(null);

  // États pour le formulaire
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [description, setDescription] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [duration, setDuration] = useState<number>(90);
  const [director, setDirector] = useState('');
  const [availableGenres, setAvailableGenres] = useState<{id: string, name: string}[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isVIP, setIsVIP] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState('');
  const [cast, setCast] = useState<CastMember[]>([
    { name: '', role: '', photo: null, file: null, preview: null }
  ]);

  // États pour les catégories d’accueil (sections homepage)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  // États pour les médias
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [backdropFile, setBackdropFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [backdropPreview, setBackdropPreview] = useState<string | null>(null);

  // Gérer les catégories d’accueil
  const handleCategoryChange = (categoryKey: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, categoryKey]);
    } else {
      setSelectedCategories(selectedCategories.filter((key) => key !== categoryKey));
    }
  };

  // État de soumission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les genres disponibles
  useEffect(() => {
    const loadGenres = async () => {
      try {
        const { data, error } = await supabase.from('genres').select('id, name');
        if (error) throw error;
        setAvailableGenres(data || []);
      } catch (error) {
        console.error('Erreur lors du chargement des genres:', error);
      }
    };

    loadGenres();
  }, []);

  // TMDB: Recherche live avec debounce + bouton
  const fetchTmdbResults = async (query: string) => {
    if (!query.trim()) {
      setTmdbResults([]);
      setTmdbError(null);
      setTmdbLoading(false);
      return;
    }
    setTmdbLoading(true);
    setTmdbError(null);
    try {
      const res = await fetch(`/api/tmdb/movie-search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTmdbResults(data.results || []);
    } catch (err: any) {
      setTmdbError(err.message || "Erreur lors de la recherche TMDB.");
    } finally {
      setTmdbLoading(false);
    }
  };

  // Live search (debounce)
  useEffect(() => {
    if (!tmdbQuery.trim()) {
      setTmdbResults([]);
      setTmdbError(null);
      setTmdbLoading(false);
      return;
    }
    const timeout = setTimeout(() => {
      fetchTmdbResults(tmdbQuery);
    }, 400);
    return () => clearTimeout(timeout);
  }, [tmdbQuery]);

  // Recherche manuelle (bouton)
  const handleTmdbSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchTmdbResults(tmdbQuery);
  };

  // TMDB: Sélectionner un film et remplir le formulaire (auto-fill avancé)
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [videoUploadLoading, setVideoUploadLoading] = useState(false);

  const handleSelectTmdbMovie = async (movie: any) => {
    setTitle(movie.title || '');
    setOriginalTitle(movie.original_title || '');
    setDescription(movie.overview || '');
    setYear(movie.release_date ? parseInt(movie.release_date.split('-')[0]) : new Date().getFullYear());
    setPosterPreview(
      movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null
    );
    setBackdropPreview(
      movie.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`
        : null
    );

    // Détail TMDB avancé
    if (movie.id) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=fr-FR&append_to_response=credits,videos`
        );
        const details = await res.json();
        // Durée
        if (details.runtime) setDuration(details.runtime);
        // Réalisateur
        if (details.credits && Array.isArray(details.credits.crew)) {
          const director = details.credits.crew.find((c: any) => c.job === "Director");
          setDirector(director?.name || '');
        }
        // Genres
        if (Array.isArray(details.genres)) {
          const genreNames = details.genres.map((g: any) => g.name);
          const localGenreIds = availableGenres
            .filter(g => genreNames.includes(g.name))
            .map(g => g.id);
          setSelectedGenres(localGenreIds);
        }
        // Bande-annonce (YouTube)
        if (details.videos && Array.isArray(details.videos.results)) {
          const trailer = details.videos.results.find(
            (v: any) => v.type === "Trailer" && v.site === "YouTube"
          );
          setTrailerUrl(trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '');
          // Vidéo principale (type "Clip" ou "Featurette", ou la première non-trailer)
          const mainVideo = details.videos.results.find(
            (v: any) => v.type !== "Trailer" && v.site === "YouTube"
          );
          setVideoUrl(mainVideo ? `https://www.youtube.com/watch?v=${mainVideo.key}` : '');
        }
        // Casting (nom, rôle, photo)
        if (
          details.credits &&
          Array.isArray(details.credits.cast) &&
          details.credits.cast.length > 0
        ) {
          const castArr = details.credits.cast.slice(0, 10).map((actor: any) => ({
            name: actor.name,
            role: actor.character || '',
            photo: actor.profile_path
              ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
              : null,
            file: null, // fichier image si uploadé manuellement
            preview: actor.profile_path
              ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
              : null,
          }));
          setCast(castArr);
        }
        // Catégories accueil auto (modifiables)
        const autoCategories: string[] = [];
        // "Nouveautés" si année récente
        const currentYear = new Date().getFullYear();
        if (movie.release_date && parseInt(movie.release_date.slice(0, 4)) >= currentYear - 1) autoCategories.push("new");
        // "Top" si populaire (>1000 votes ou popularité > 100)
        if ((movie.vote_count && movie.vote_count > 1000) || (movie.popularity && movie.popularity > 100)) autoCategories.push("top");
        // "VIP" si flag TMDB ou genre spécifique (à adapter selon ta logique)
        if (details.adult) autoCategories.push("vip");
        // "À la une" si poster et backdrop présents
        if (movie.poster_path && movie.backdrop_path) autoCategories.push("featured");
        setSelectedCategories(autoCategories);
      } catch (err) {
        // fallback : pas de détail
      }
    }

    setTmdbResults([]);
    setTmdbQuery('');
    setTimeout(() => {
      tmdbInputRef.current?.focus();
    }, 100);
    toast({
      title: "Champs remplis automatiquement",
      description: "Tous les champs peuvent être édités avant l’enregistrement.",
    });
  };
  
  // Gérer les genres
  const handleGenreChange = (genreId: string, checked: boolean) => {
    if (checked) {
      setSelectedGenres([...selectedGenres, genreId]);
    } else {
      setSelectedGenres(selectedGenres.filter(id => id !== genreId));
    }
  };
  
  // Gérer le casting avec photo
  const addCastMember = () => {
    setCast([...cast, { name: '', role: '', photo: null, file: null, preview: null }]);
  };

  const removeCastMember = (index: number) => {
    setCast(cast.filter((_, i) => i !== index));
  };

  const updateCastMember = (index: number, field: 'name' | 'role', value: string) => {
    const updatedCast = [...cast];
    updatedCast[index][field] = value;
    setCast(updatedCast);
  };

  const updateCastPhoto = (index: number, file: File | null, preview: string | null) => {
    const updatedCast = [...cast];
    updatedCast[index].file = file;
    updatedCast[index].preview = preview;
    // On efface l'URL TMDB si upload local
    if (file) updatedCast[index].photo = null;
    setCast(updatedCast);
  };

  const removeCastPhoto = (index: number) => {
    const updatedCast = [...cast];
    updatedCast[index].file = null;
    updatedCast[index].preview = null;
    updatedCast[index].photo = null;
    setCast(updatedCast);
  };
  
  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation de base
    if (!title) {
      toast({
        title: 'Erreur',
        description: 'Le titre du film est requis.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedGenres.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins un genre.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload des photos du casting si besoin
      const formattedCast = await Promise.all(
        cast
          .filter(member => member.name.trim() !== '')
          .map(async (member, idx) => {
            let photoUrl = member.photo || null;
            if (member.file) {
              console.log(`[UPLOAD] Photo acteur ${member.name}...`);
              const { data, error } = await supabase.storage
                .from('actor-photos')
                .upload(
                  `actors/${Date.now()}_${idx}_${member.file.name}`,
                  member.file,
                  { cacheControl: '3600', upsert: false }
                );
              if (error) {
                console.error(`[ERREUR UPLOAD acteur]`, error);
                toast({
                  title: 'Erreur upload photo acteur',
                  description: error.message || String(error),
                  variant: 'destructive',
                });
                throw error;
              }
              const { data: urlData } = supabase.storage.from('actor-photos').getPublicUrl(data.path);
              photoUrl = urlData?.publicUrl || null;
              console.log(`[SUCCESS] URL photo acteur:`, photoUrl);
            }
            return {
              name: member.name,
              role: member.role,
              photo: photoUrl,
            };
          })
      );

      // Upload des images si présentes
      let posterUrl = '';
      let backdropUrl = '';

      if (posterFile) {
        console.log("[UPLOAD] Poster...");
        const { data, error } = await supabase.storage
          .from('film-posters')
          .upload(`posters/${Date.now()}-${posterFile.name}`, posterFile, { cacheControl: '3600', upsert: false });
        if (error) {
          console.error("[ERREUR UPLOAD poster]", error);
          toast({
            title: "Erreur upload affiche",
            description: error.message || String(error),
            variant: "destructive",
          });
          throw error;
        }
        const { data: urlData } = supabase.storage.from('film-posters').getPublicUrl(data.path);
        posterUrl = urlData?.publicUrl || '';
        console.log("[SUCCESS] URL poster:", posterUrl);
      } else if (posterPreview) {
        posterUrl = posterPreview;
      }

      if (backdropFile) {
        console.log("[UPLOAD] Backdrop...");
        const { data, error } = await supabase.storage
          .from('film-backdrops')
          .upload(`backdrops/${Date.now()}-${backdropFile.name}`, backdropFile, { cacheControl: '3600', upsert: false });
        if (error) {
          console.error("[ERREUR UPLOAD backdrop]", error);
          toast({
            title: "Erreur upload image de fond",
            description: error.message || String(error),
            variant: "destructive",
          });
          throw error;
        }
        const { data: urlData } = supabase.storage.from('film-backdrops').getPublicUrl(data.path);
        backdropUrl = urlData?.publicUrl || '';
        console.log("[SUCCESS] URL backdrop:", backdropUrl);
      } else if (backdropPreview) {
        backdropUrl = backdropPreview;
      }

      // Upload vidéo si nécessaire
      let finalVideoUrl = videoUrl;
      if (videoFile) {
        try {
          setVideoUploadLoading(true);
          const { data, error } = await supabase.storage
            .from('film-videos')
            .upload(
              `videos/${Date.now()}-${videoFile.name}`,
              videoFile,
              { cacheControl: '3600', upsert: false }
            );
          if (error) {
            console.error("[ERREUR UPLOAD vidéo]", error);
            toast({
              title: "Erreur upload vidéo",
              description: error.message || String(error),
              variant: "destructive",
            });
            throw error;
          }
          const { data: urlData } = supabase.storage.from('film-videos').getPublicUrl(data.path);
          finalVideoUrl = urlData?.publicUrl || '';
          setVideoUploadLoading(false);
        } catch (videoErr) {
          setVideoUploadLoading(false);
          throw videoErr;
        }
      }

      // Vérification préalable pour éviter les doublons (titre + année)
      const { data: existingFilm, error: checkErr } = await supabase
        .from('films')
        .select('id')
        .eq('title', title)
        .eq('year', year)
        .maybeSingle();

      if (existingFilm) {
        toast({
          title: "Doublon détecté",
          description: "Un film avec ce titre et cette année existe déjà.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Insertion du film dans la table 'films'
      console.log("[INSERT] Enregistrement du film dans la table films...");
      const { data: insertData, error: insertError } = await supabase
        .from('films')
        .insert([{
          title,
          original_title: originalTitle || null,
          description,
          year,
          duration,
          director: director || null,
          genre: selectedGenres.map(
            id => availableGenres.find(g => g.id === id)?.name
          ).filter(Boolean).join(',') || null,
          trailer_url: trailerUrl || null,
          video_url: finalVideoUrl || null,
          isvip: isVIP,
          published: isPublished,
          poster: posterUrl || null,
          backdrop: backdropUrl || null,
          cast: formattedCast,
          homepage_categories: selectedCategories, // à adapter selon la colonne/table pivot de ta base
        }])
        .select()
        .single();

      if (insertError || !insertData) {
        // Gestion des erreurs d'unicité SQL
        if (
          insertError?.code === "23505" ||
          (typeof insertError?.message === "string" && insertError.message.toLowerCase().includes("unique"))
        ) {
          toast({
            title: "Doublon détecté",
            description: "Un film avec ce titre et cette année existe déjà.",
            variant: "destructive",
          });
        } else {
          console.error("[ERREUR INSERT films]", insertError);
          toast({
            title: "Erreur",
            description: insertError?.message || "Impossible d'ajouter le film.",
            variant: "destructive",
          });
        }
        setIsSubmitting(false);
        return;
      }
      console.log("[SUCCESS] Film inséré:", insertData);

      // Log admin_logs
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('admin_logs').insert([{
            admin_id: user.id,
            action: 'ADD_FILM',
            details: { film_id: insertData.id, film_title: title },
          }]);
        }
      } catch (logErr) {
        console.warn("[LOG WARNING] admin_logs:", logErr);
      }

      toast({
        title: 'Film ajouté',
        description: `Le film "${title}" a été ajouté avec succès.`,
      });

      router.push('/admin/films');
    } catch (error) {
      console.error('Erreur lors de l\'ajout du film:', error);
      toast({
        title: 'Erreur',
        description:
          (typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof (error as any).message === "string"
              ? (error as any).message
              : String(error)
          ) || "Impossible d'ajouter le film.",
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div>
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/films')}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
        <h1 className="text-3xl font-bold">Ajouter un film</h1>
      </div>

      {/* TMDB Search */}
      {/* TMDB Live Search + bouton */}
      <div className="mb-6" role="search" aria-label="Recherche TMDB">
        <form onSubmit={handleTmdbSearch} className="mb-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <label htmlFor="tmdb-search" className="font-medium text-gray-200 mr-2">Recherche TMDB :</label>
            <Input
              id="tmdb-search"
              ref={tmdbInputRef}
              type="text"
              autoComplete="off"
              placeholder="Titre du film (TMDB)"
              value={tmdbQuery}
              onChange={e => setTmdbQuery(e.target.value)}
              className="sm:w-80"
              aria-label="Titre du film à rechercher sur TMDB"
            />
            <Button type="submit" disabled={tmdbLoading || !tmdbQuery.trim()}>
              {tmdbLoading ? "Recherche..." : "Rechercher"}
            </Button>
          </div>
        </form>
        {tmdbError && <div className="mt-2 text-sm text-red-500">{tmdbError}</div>}
        {(tmdbResults.length > 0 && tmdbQuery.trim()) && (
          <ul
            className="mt-4 bg-gray-800 rounded shadow max-h-80 overflow-y-auto ring-1 ring-gray-700"
            tabIndex={0}
            aria-label="Résultats TMDB"
          >
            {tmdbResults.map((movie, idx) => (
              <li
                key={movie.id}
                tabIndex={0}
                className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-purple-900/20 focus:bg-purple-900/30 outline-none"
                onClick={() => handleSelectTmdbMovie(movie)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleSelectTmdbMovie(movie);
                  }
                }}
                aria-label={`Sélectionner ${movie.title} (${movie.release_date ? movie.release_date.slice(0, 4) : ''})`}
              >
                {movie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                    alt={movie.title}
                    className="h-12 w-8 object-cover rounded"
                  />
                ) : (
                  <div className="h-12 w-8 bg-gray-700 rounded flex items-center justify-center">
                    <Film className="h-5 w-5 text-gray-500" />
                  </div>
                )}
                <div>
                  <span className="font-medium text-white">{movie.title}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {movie.release_date ? `(${movie.release_date.slice(0, 4)})` : ''}
                  </span>
                </div>
                {movie.original_title && movie.original_title !== movie.title && (
                  <span className="ml-2 text-xs text-gray-400 italic">{movie.original_title}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Formulaire principal d'ajout */}
      <form onSubmit={handleSubmit} className="w-full max-w-full">
        <Tabs defaultValue="general" className="bg-gray-800 rounded-lg shadow-lg">
          <TabsList className="bg-gray-700 rounded-t-lg p-0 border-b border-gray-600">
            <TabsTrigger value="general" className="rounded-tl-lg rounded-bl-none rounded-tr-none px-5 py-3">
              <Info className="h-4 w-4 mr-2" />
              Informations générales
            </TabsTrigger>
            <TabsTrigger value="media" className="rounded-none px-5 py-3">
              <ImageIcon className="h-4 w-4 mr-2" />
              Médias
            </TabsTrigger>
            <TabsTrigger value="details" className="rounded-tr-lg rounded-bl-none rounded-tl-none px-5 py-3">
              <Film className="h-4 w-4 mr-2" />
              Détails supplémentaires
            </TabsTrigger>
          </TabsList>
          
          {/* Informations générales */}
          <TabsContent value="general" className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre <span className="text-red-500">*</span></Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="originalTitle">Titre original</Label>
                  <Input
                    id="originalTitle"
                    value={originalTitle}
                    onChange={(e) => setOriginalTitle(e.target.value)}
                    placeholder="Titre dans la langue d'origine"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="year">Année de sortie</Label>
                  <Input
                    id="year"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 5}
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration">Durée (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 90)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="director">Réalisateur</Label>
                  <Input
                    id="director"
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Genres <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {availableGenres.map((genre) => (
                    <div key={genre.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`genre-${genre.id}`}
                        checked={selectedGenres.includes(genre.id)}
                        onCheckedChange={(checked) => 
                          handleGenreChange(genre.id, checked === true)
                        }
                      />
                      <Label 
                        htmlFor={`genre-${genre.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {genre.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catégories d’accueil */}
              <div className="space-y-2 mt-5">
                <Label>Catégories d’accueil</Label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { key: "featured", label: "À la une" },
                    { key: "new", label: "Nouveautés" },
                    { key: "top", label: "Top" },
                    { key: "vip", label: "VIP" }
                  ].map(category => (
                    <div key={category.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.key}`}
                        checked={selectedCategories.includes(category.key)}
                        onCheckedChange={(checked) => handleCategoryChange(category.key, checked === true)}
                        aria-checked={selectedCategories.includes(category.key)}
                        aria-label={category.label}
                      />
                      <Label
                        htmlFor={`category-${category.key}`}
                        className="text-sm cursor-pointer"
                      >
                        {category.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  Cochez une ou plusieurs sections où ce film apparaîtra sur la page d’accueil.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isVIP">Contenu VIP</Label>
                    <Switch
                      id="isVIP"
                      checked={isVIP}
                      onCheckedChange={setIsVIP}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Activer pour rendre ce film disponible uniquement pour les utilisateurs VIP.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isPublished">Publier maintenant</Label>
                    <Switch
                      id="isPublished"
                      checked={isPublished}
                      onCheckedChange={setIsPublished}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Activer pour rendre ce film visible sur le site.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Médias */}
          <TabsContent value="media" className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="poster">Affiche du film</Label>
                  <div className="mb-2">
                    {posterPreview && (
                      <img
                        src={posterPreview}
                        alt="Affiche du film sélectionnée"
                        className="rounded shadow h-40 object-cover mb-2"
                        aria-label="Affiche sélectionnée"
                      />
                    )}
                  </div>
                  <ImageUpload
                    onImageSelected={(file) => {
                      setPosterFile(file);
                      setPosterPreview(URL.createObjectURL(file));
                    }}
                    aspectRatio="2:3"
                    label={posterPreview ? "Remplacer l'affiche" : "Ajouter une affiche"}
                  />
                  {posterPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPosterFile(null);
                        setPosterPreview(null);
                      }}
                      className="mt-2"
                    >
                      Supprimer l’affiche
                    </Button>
                  )}
                  <p className="text-xs text-gray-400">
                    Format recommandé: 600x900 pixels (ratio 2:3), JPG ou PNG.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="backdrop">Image de fond</Label>
                  <div className="mb-2">
                    {backdropPreview && (
                      <img
                        src={backdropPreview}
                        alt="Image de fond sélectionnée"
                        className="rounded shadow h-32 object-cover mb-2"
                        aria-label="Image de fond sélectionnée"
                      />
                    )}
                  </div>
                  <ImageUpload
                    onImageSelected={(file) => {
                      setBackdropFile(file);
                      setBackdropPreview(URL.createObjectURL(file));
                    }}
                    aspectRatio="16:9"
                    label={backdropPreview ? "Remplacer l'image de fond" : "Ajouter une image de fond"}
                  />
                  {backdropPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBackdropFile(null);
                        setBackdropPreview(null);
                      }}
                      className="mt-2"
                    >
                      Supprimer l’image de fond
                    </Button>
                  )}
                  <p className="text-xs text-gray-400">
                    Format recommandé: 1920x1080 pixels (ratio 16:9), JPG ou PNG.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="trailerUrl">URL de la bande-annonce</Label>
                <Input
                  id="trailerUrl"
                  value={trailerUrl}
                  onChange={(e) => setTrailerUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-xs text-gray-400">
                  URL YouTube de la bande-annonce.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoUrl">Vidéo du film</Label>
                <Input
                  id="videoUrl"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://… (YouTube, mp4, etc.)"
                  disabled={!!videoFile}
                />
                <p className="text-xs text-gray-400 mb-2">
                  Collez l’URL complète de la vidéo principale du film (YouTube, mp4, etc.), ou uploadez un fichier vidéo ci-dessous.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <label htmlFor="video-upload" className="sr-only">
                    Uploader une vidéo du film
                  </label>
                  <input
                    type="file"
                    accept="video/mp4,video/mkv,video/webm,video/quicktime,video/x-matroska,video/x-msvideo,video/x-ms-wmv"
                    id="video-upload"
                    className="hidden"
                    title="Uploader une vidéo du film"
                    placeholder="Sélectionner un fichier vidéo"
                    onChange={e => {
                      const file = e.target.files && e.target.files[0];
                      if (file) {
                        setVideoFile(file);
                        setVideoFileName(file.name);
                        // On désactive le champ URL
                        setVideoUrl('');
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('video-upload')?.click()}
                    disabled={videoUploadLoading}
                  >
                    {videoFileName ? "Remplacer la vidéo" : "Uploader une vidéo"}
                  </Button>
                  {videoFileName && (
                    <span className="text-sm text-gray-300 ml-2">{videoFileName}</span>
                  )}
                  {videoFileName && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setVideoFile(null);
                        setVideoFileName(null);
                      }}
                      className="ml-2"
                      disabled={videoUploadLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {videoUploadLoading && (
                    <span className="ml-2 text-indigo-400 animate-spin">
                      <Film className="h-5 w-5" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Formats supportés : mp4, mkv, webm, mov, avi, wmv.<br />
                  Si tu uploades une vidéo, l’URL publique sera utilisée dans la fiche du film.
                </p>
              </div>
            </div>
          </TabsContent>
          
          {/* Détails supplémentaires */}
          <TabsContent value="details" className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Casting</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCastMember}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                <div className="space-y-3">
                  {cast.map((member, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="flex-1">
                        <Input
                          value={member.name}
                          onChange={(e) => updateCastMember(index, 'name', e.target.value)}
                          placeholder="Nom de l'acteur"
                          className="mb-2"
                        />
                        <Input
                          value={member.role}
                          onChange={(e) => updateCastMember(index, 'role', e.target.value)}
                          placeholder="Rôle (optionnel)"
                        />
                        <div className="flex items-center mt-2">
                          {member.preview || member.photo ? (
                            <img
                              src={member.preview || member.photo || undefined}
                              alt={member.name}
                              className="h-14 w-10 object-cover rounded border mr-3"
                            />
                          ) : (
                            <div className="h-14 w-10 bg-gray-800 rounded border mr-3 flex items-center justify-center">
                              <Film className="h-5 w-5 text-gray-500" />
                            </div>
                          )}
                          <ImageUpload
                            onImageSelected={(file) => {
                              if (file) {
                                updateCastPhoto(index, file, URL.createObjectURL(file));
                              }
                            }}
                            aspectRatio="2:3"
                            label={member.preview || member.photo ? "Remplacer la photo" : "Ajouter une photo"}
                          />
                          {(member.preview || member.photo) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCastPhoto(index)}
                              className="ml-2"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCastMember(index)}
                        className="mt-2"
                        aria-label="Supprimer cet acteur"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/films')}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}