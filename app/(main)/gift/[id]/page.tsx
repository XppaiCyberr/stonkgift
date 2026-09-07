"use client";

import { GiftCard } from "@/components/GiftCard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";

export default function GiftDetailsPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || "1";

  return (
    <div className="space-y-6">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-zinc-800/60"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Create Gift
        </Link>
        <span className="text-xs text-zinc-500 font-mono">Gift #{id}</span>
      </div>

      <GiftCard giftId={id} />
    </div>
  );
}
