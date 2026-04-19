import AuthPanel from "@/components/AuthPanel";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 flex flex-col items-center justify-center">
      <AuthPanel mode="signup" />
    </main>
  );
}
