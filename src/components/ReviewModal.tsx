
"use client";
import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from '@supabase/ssr';
import StarRating from './StarRating';


interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "album" | "song";
  title: string;
  artist: string;
  rating: number;
  setRating: (val: number) => void;
  spotifyId: string;
  spotifyImageUrl?: string;
}

const STAR_COLOR = "#2563EB";
const BG_COLOR = "#F5F5F7";
const MAX_LENGTH = { album: 280, song: 100 };
const PLACEHOLDER = {
  album: "¿Qué te pareció este álbum? (Máx 280 caracteres)",
  song: "Deja tu Hot Take (Máx 100 caracteres)",
};

export default function ReviewModal({
  isOpen,
  onClose,
  type,
  title,
  artist,
  rating,
  setRating,
  spotifyId,
  spotifyImageUrl,
}: ReviewModalProps) {
  const [hover, setHover] = useState<number>(0);
  const [text, setText] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHover(0);
      setText("");
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);


  // Supabase client (browser)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Hot takes (solo para álbum, hack JSONB)
  const [hotTakes, setHotTakes] = useState<any[]>([]); // [{ track_id, track_name, take_text, rating }]

  if (!isOpen) return null;


  // Fallback to 'album' if type is invalid (should never happen, but prevents NaN)
  const charLimit = typeof MAX_LENGTH[type] === 'number' ? MAX_LENGTH[type] : MAX_LENGTH.album;
  const overLimit = text.length > charLimit;
  const canSubmit = rating > 0 && !overLimit && text.trim().length > 0 && !isSubmitting && !published;

  // Maneja el submit real a Supabase
  async function handleSubmit() {
    if (rating === 0) {
      alert('Debes seleccionar al menos una estrella');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        alert('Debes iniciar sesión para publicar una reseña.');
        setIsSubmitting(false);
        return;
      }
      const user_id = userData.user.id;
      let hot_takes = null;
      if (type === 'album' && hotTakes.length > 0) {
        // Solo incluir si hay al menos un hot take con texto
        const filtered = hotTakes.filter(ht => ht.take_text && ht.take_text.trim().length > 0);
        if (filtered.length > 0) hot_takes = filtered;
      }
      const payload = {
        user_id,
        spotify_id: spotifyId,
        type,
        rating,
        review_text: text,
        hot_takes,
        spotify_title: title,
        spotify_artist: artist,
        spotify_image_url: spotifyImageUrl || null,
      };
      const { error } = await supabase
        .from('reviews')
        .upsert([payload], { onConflict: 'user_id,spotify_id,type' });
      if (error) {
        console.error(error);
        alert('Ocurrió un error al publicar la reseña.');
      } else {
        setPublished(true);
        setText("");
        setRating(0);
        setHotTakes([]);
        setTimeout(() => {
          setPublished(false);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      alert('Error inesperado al publicar.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm transition-all"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md mx-auto animate-slide-up bg-[${BG_COLOR}] rounded-t-4xl pt-4 pb-28 px-6 shadow-xl min-h-[60vh] flex flex-col`}
        style={{ boxShadow: "0 -8px 32px rgba(0,0,0,0.12)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-3" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Reseñando a {artist}</span>
          <button
            aria-label="Cerrar"
            className="ml-auto text-2xl text-gray-400 hover:text-gray-600 transition"
            onClick={onClose}
            tabIndex={0}
          >
            ×
          </button>
        </div>
        <div className="flex justify-center mb-6">
          <StarRating
            rating={rating}
            onChange={setRating}
            starSize={40}
            className="text-blue-600"
          />
        </div>
        {/* Textarea */}
        <div className="flex-1 flex flex-col">
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent resize-none text-lg text-gray-900 placeholder-gray-400 outline-none focus:ring-0 border-0 min-h-30 max-h-50"
            placeholder={PLACEHOLDER[type]}
            maxLength={charLimit + 1}
            value={text}
            onChange={e => setText(e.target.value)}
            aria-label="Escribe tu reseña"
          />
          <div className="flex justify-end mt-1">
            <span className={`text-xs ${overLimit ? "text-blue-600" : "text-gray-400"}`}>
              {text.length}/{charLimit}
            </span>
          </div>
        </div>
        {/* Bottom Button */}
        <div className="fixed left-0 right-0 bottom-0 w-full max-w-md mx-auto px-6 pb-6 pointer-events-none">
          <button
            className={`w-full py-4 rounded-2xl text-lg font-bold shadow-lg pointer-events-auto transition disabled:opacity-50 disabled:cursor-not-allowed
              ${published ? 'bg-green-500 text-white' : canSubmit ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            style={{ boxShadow: "0 4px 24px rgba(37,99,235,0.12)" }}
            disabled={!canSubmit && !published}
            onClick={canSubmit ? handleSubmit : undefined}
          >
            {isSubmitting ? 'Publicando...' : published ? 'Reseña publicada' : 'Publicar Reseña'}
          </button>
        </div>
        <style>{`
          .animate-slide-up {
            animation: slideUp .3s cubic-bezier(.4,0,.2,1);
          }
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
