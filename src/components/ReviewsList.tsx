import React, { useEffect, useState } from "react";
import ReviewCard from "./ReviewCard";
import { createBrowserClient } from "@supabase/ssr";

export default function ReviewsList({ userId }: { userId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase
      .from("reviews")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setReviews(data || []));
  }, [userId]);
  if (reviews.length === 0) return <div className="text-gray-400 text-center my-8">Sin reseñas aún.</div>;
  return (
    <div className="my-8">
      <h3 className="font-bold text-lg mb-2">Reseñas</h3>
      <div className="flex flex-col gap-4">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}
