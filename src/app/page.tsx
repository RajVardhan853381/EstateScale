import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-white">
      <main className="flex flex-1 w-full max-w-4xl flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-8">
          Welcome to <span className="text-blue-600">EstateScale</span>
        </h1>
        <p className="mt-4 text-xl text-gray-600 max-w-2xl mb-10">
          The all-in-one CRM and automation platform designed specifically for modern real estate professionals. Manage leads, automate communications, and close more deals.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
          >
            Sign In
          </Link>
        </div>
      </main>
    </div>
  );
}
