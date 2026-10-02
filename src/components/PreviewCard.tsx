"use client";

import type { UrlPreview } from "@/types/preview";
import Image from "next/image";

interface PreviewCardProps {
  preview: UrlPreview;
}

export function PreviewCard({ preview }: PreviewCardProps) {
  const domain = getDomain(preview.url);

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
      {/* Preview image */}
      {preview.image && (
        <div className="relative h-52 w-full bg-gray-100 dark:bg-gray-700">
          <Image
            src={preview.image}
            alt={preview.title || "Preview"}
            fill
            className="object-cover"
            unoptimized
            onError={(e) => {
              // Hide broken images
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        {/* Site info row */}
        <div className="mb-2 flex items-center gap-2">
          {preview.favicon && (
            <Image
              src={preview.favicon}
              alt=""
              width={16}
              height={16}
              className="rounded-sm"
              unoptimized
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          )}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {preview.siteName || domain}
          </span>
          {preview.isFallback && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Limited preview
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="mb-1 text-lg font-semibold leading-snug text-gray-900 dark:text-gray-100">
          {preview.title}
        </h2>

        {/* Description */}
        {preview.description && (
          <p className="mb-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {preview.description}
          </p>
        )}

        {/* URL */}
        <a
          href={preview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block truncate text-sm text-blue-600 hover:underline dark:text-blue-400"
          style={{ maxWidth: "100%" }}
        >
          {preview.url}
        </a>
      </div>
    </div>
  );
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
