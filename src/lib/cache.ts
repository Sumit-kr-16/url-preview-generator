import { getDb } from "./db";
import type { UrlPreview } from "@/types/preview";

interface DbRow {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  site_name: string | null;
  favicon: string | null;
  is_fallback: number;
  fetched_at: string;
  expires_at: string;
}

export function getCachedPreview(url: string): UrlPreview | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM url_previews WHERE url = ?")
    .get(url) as DbRow | undefined;

  if (!row) return null;

  // Check if cache has expired
  if (new Date(row.expires_at) < new Date()) {
    db.prepare("DELETE FROM url_previews WHERE url = ?").run(url);
    return null;
  }

  return {
    url: row.url,
    title: row.title,
    description: row.description,
    image: row.image,
    siteName: row.site_name,
    favicon: row.favicon,
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at,
    isFallback: row.is_fallback === 1,
  };
}

export function setCachedPreview(preview: UrlPreview): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO url_previews (url, title, description, image, site_name, favicon, is_fallback, fetched_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(url) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      image = excluded.image,
      site_name = excluded.site_name,
      favicon = excluded.favicon,
      is_fallback = excluded.is_fallback,
      fetched_at = excluded.fetched_at,
      expires_at = excluded.expires_at
  `).run(
    preview.url,
    preview.title,
    preview.description,
    preview.image,
    preview.siteName,
    preview.favicon,
    preview.isFallback ? 1 : 0,
    preview.fetchedAt,
    preview.expiresAt,
  );
}
