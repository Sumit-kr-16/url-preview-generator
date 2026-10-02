"use client";

import { useState } from "react";
import { UrlInput } from "@/components/UrlInput";
import { PreviewCard } from "@/components/PreviewCard";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import type { UrlPreview, ApiResponse } from "@/types/preview";

export default function Home() {
  const [preview, setPreview] = useState<UrlPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState("");

  async function handleSubmit(url: string) {
    setIsLoading(true);
    setError(null);
    setPreview(null);
    setLastUrl(url);

    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data: ApiResponse = await response.json();

      if (!data.success) {
        setError(data.error);
        return;
      }

      setPreview(data.data);
    } catch {
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleRetry() {
    if (lastUrl) {
      handleSubmit(lastUrl);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-16 dark:bg-gray-950">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          URL Preview Generator
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Paste any URL to generate a rich preview card
        </p>
      </div>

      {/* Input */}
      <UrlInput onSubmit={handleSubmit} isLoading={isLoading} />

      {/* Results */}
      <div className="mt-10 w-full flex justify-center">
        {isLoading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={handleRetry} />}
        {preview && !isLoading && !error && <PreviewCard preview={preview} />}
      </div>
    </main>
  );
}
