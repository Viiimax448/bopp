import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import OnboardingWizard from "@/components/OnboardingWizard";

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const emailLocalPart = (user.email ?? "").split("@")[0] ?? "";
  const suggestedFromEmail = emailLocalPart
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  // Si el backend autogenera username desde el email, tratamos eso como "no completado".
  if (profile?.username && profile.username !== suggestedFromEmail) {
    redirect("/feed");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10 flex flex-col items-center">
      <OnboardingWizard />
    </main>
  );
}
