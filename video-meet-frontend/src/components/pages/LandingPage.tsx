import Link from "next/link";

export default function LandingPage() {
    return (
        <main className="flex flex-col items-center justify-center min-h-screen text-center p-8">
            <h1 className="text-4xl font-bold mb-4">Welcome to VideoMeet</h1>
            <p className="text-gray-600 mb-6 max-w-md">
                High-quality, real-time video meetings in your browser. Connect with your team from anywhere.
            </p>
            <div className="flex gap-4">
                <Link
                    href="/login"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                    Login
                </Link>
                <Link
                    href="/register"
                    className="border border-blue-600 text-blue-600 px-4 py-2 rounded hover:bg-blue-50 transition"
                >
                    Register
                </Link>
            </div>
        </main>
    );
}
