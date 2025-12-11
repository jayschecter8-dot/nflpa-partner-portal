'use client';

import { signOut } from 'next-auth/react';

interface HeaderProps {
  userName: string;
  badge: {
    text: string;
    type: 'admin' | 'partner';
  };
}

export default function Header({ userName, badge }: HeaderProps) {
  return (
    <header className="bg-navy-900 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <span className="text-white text-lg font-bold">NFLPA Partner Portal</span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            badge.type === 'admin'
              ? 'bg-primary text-white'
              : 'bg-blue-500 text-white'
          }`}
        >
          {badge.text}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-slate-400 text-sm">{userName}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="px-4 py-2 text-sm text-slate-400 border border-slate-600 rounded-md hover:bg-slate-800 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
