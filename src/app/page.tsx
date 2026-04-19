import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-black text-gray-900 mb-4">Bopp</h1>
      <p className="text-gray-500 mb-8">Descubrí música con amigos.</p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-2 bg-white border border-gray-200 rounded-full font-bold text-gray-900 shadow-sm hover:bg-gray-50"
        >
          Iniciar Sesión
        </Link>
        <Link
          href="/register"
          className="px-6 py-2 bg-blue-600 rounded-full font-bold text-white hover:bg-blue-700"
        >
          Crear Cuenta
        </Link>
      </div>
    </div>
  );
}