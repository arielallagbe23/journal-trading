"use client";
import { useEffect } from "react";

type Props = { message: string; onClear: () => void };

export default function Toast({ message, onClear }: Props) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClear, 4000);
    return () => clearTimeout(t);
  }, [message, onClear]);

  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-800 border border-gray-700 px-4 py-3 shadow-lg text-sm text-gray-100">
        <span>{message}</span>
        <button onClick={onClear} className="text-gray-400 hover:text-gray-200 shrink-0">✕</button>
      </div>
    </div>
  );
}
