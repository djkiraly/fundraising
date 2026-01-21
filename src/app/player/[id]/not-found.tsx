import Link from 'next/link';
import { UserX } from 'lucide-react';
import { Navbar } from '@/components/ui/navbar';

export default function PlayerNotFound() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <UserX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Player Not Found</h1>
          <p className="text-gray-600 mb-6">
            This player doesn't exist or their fundraiser is no longer active.
          </p>
          <Link href="/" className="btn-primary inline-block">
            View All Players
          </Link>
        </div>
      </div>
    </>
  );
}
