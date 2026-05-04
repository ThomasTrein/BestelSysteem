import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-800 to-green-600 text-white p-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">🍺 KSA Bestelapp</h1>
          <p className="text-green-100 text-lg">Scan de QR-code aan je tafel om te bestellen</p>
        </div>
        <div className="grid gap-4 mt-8">
          <Link
            href="/bar"
            className="bg-white text-green-800 font-semibold py-4 px-6 rounded-xl hover:bg-green-50 transition-colors shadow-lg"
          >
            🍹 Barscherm
          </Link>
          <Link
            href="/admin"
            className="bg-green-700 text-white font-semibold py-4 px-6 rounded-xl hover:bg-green-600 transition-colors shadow-lg border border-green-500"
          >
            ⚙️ Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
