"use client";

import { useRef, useState } from "react";
import ReviewModal from "./ReviewModal";
import QuickRateCard from "./QuickRateCard";

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

export type QuickRateItem = {
  id: string;
  title: string;
  artist: string;
  image: string;
  spotifyUrl?: string;
  type: "album" | "track";
};


type Props = {
  items: QuickRateItem[];
};

export default function QuickRateCarousel({ items }: Props) {
  const [modal, setModal] = useState<{ open: boolean; item?: QuickRateItem; rating?: number }>({ open: false });
  const [modalRating, setModalRating] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleOpenModal = (item: QuickRateItem, rating: number) => {
    setModal({ open: true, item, rating });
    setModalRating(rating);
  };

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  };
  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  };

  return (
    <div className="relative w-full">
      <button
        className="absolute top-1/2 -translate-y-1/2 left-0 bg-white/90 shadow-md rounded-full p-2 text-gray-800 z-10"
        onClick={scrollLeft}
        aria-label="Scroll left"
        type="button"
      >
        <FaChevronLeft size={24} />
      </button>
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth gap-4 px-2"
      >
        <div className="w-[10vw] shrink-0" />
        {items.map((item) => (
          <QuickRateCard key={item.id} item={item} onOpenModal={handleOpenModal} />
        ))}
        <div className="w-[10vw] shrink-0" />
        {modal.open && modal.item && (
          <ReviewModal
            isOpen={modal.open}
            onClose={() => setModal({ open: false })}
            type={modal.item.type === 'track' ? 'song' : modal.item.type}
            title={modal.item.title}
            artist={modal.item.artist}
            rating={modalRating}
            setRating={setModalRating}
            spotifyId={modal.item.id}
          />
        )}
      </div>
      <button
        className="absolute top-1/2 -translate-y-1/2 right-0 bg-white/90 shadow-md rounded-full p-2 text-gray-800 z-10"
        onClick={scrollRight}
        aria-label="Scroll right"
        type="button"
      >
        <FaChevronRight size={24} />
      </button>
    </div>
  );
}


