import { GiftCard } from "@/components/GiftCard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: {
    id: string;
  };
}

export default function GiftDetailsPage({ params }: PageProps) {
  const { id } = params;

  return (
    <div className="space-y-6">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-gray-800/60"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Create Gift
        </Link>
        <span className="text-xs text-gray-500 font-mono">Gift #{id}</span>
      </div>

      <GiftCard giftId={id} />
    </div>
  );
}
