"use client";

import { Loader2 } from "lucide-react";

export default function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      {label && (
        <p className="mt-3 text-sm text-gray-400 animate-pulse">{label}</p>
      )}
    </div>
  );
}
