import { describe, it, expect } from "vitest";
import { normalizeMetadata } from "../src/lib/metadata-normalizer";
import type { RawMetadata } from "../src/lib/metadata-parser";

describe("normalizeMetadata", () => {
  const baseRaw: RawMetadata = {
    title: "Test Title",
    description: "A description of the page.",
    image: "https://example.com/img.png",
    siteName: "Example",
    favicon: "https://example.com/favicon.ico",
  };

  it("normalizes complete metadata", () => {
    const result = normalizeMetadata(baseRaw, "https://example.com");
    expect(result.title).toBe("Test Title");
    expect(result.description).toBe("A description of the page.");
    expect(result.image).toBe("https://example.com/img.png");
    expect(result.siteName).toBe("Example");
    expect(result.isFallback).toBe(false);
    expect(result.fetchedAt).toBeTruthy();
    expect(result.expiresAt).toBeTruthy();
  });

  it("uses domain when title is missing", () => {
    const raw: RawMetadata = { ...baseRaw, title: null };
    const result = normalizeMetadata(raw, "https://www.example.com/path");
    expect(result.title).toBe("example.com");
  });

  it("uses domain when siteName is missing", () => {
    const raw: RawMetadata = { ...baseRaw, siteName: null };
    const result = normalizeMetadata(raw, "https://example.com");
    expect(result.siteName).toBe("example.com");
  });

  it("truncates long descriptions", () => {
    const longDesc = "A".repeat(500);
    const raw: RawMetadata = { ...baseRaw, description: longDesc };
    const result = normalizeMetadata(raw, "https://example.com");
    expect(result.description!.length).toBeLessThanOrEqual(300);
  });

  it("sets null for missing optional fields", () => {
    const raw: RawMetadata = {
      title: "Title",
      description: null,
      image: null,
      siteName: null,
      favicon: null,
    };
    const result = normalizeMetadata(raw, "https://example.com");
    expect(result.description).toBeNull();
    expect(result.image).toBeNull();
    expect(result.favicon).toBeNull();
  });

  it("marks fallback previews correctly", () => {
    const result = normalizeMetadata(baseRaw, "https://example.com", true);
    expect(result.isFallback).toBe(true);
  });

  it("sets expiresAt to 1 hour after fetchedAt", () => {
    const result = normalizeMetadata(baseRaw, "https://example.com");
    const fetched = new Date(result.fetchedAt).getTime();
    const expires = new Date(result.expiresAt!).getTime();
    expect(expires - fetched).toBe(60 * 60 * 1000);
  });

  it("collapses whitespace in title", () => {
    const raw: RawMetadata = { ...baseRaw, title: "  Hello   World  " };
    const result = normalizeMetadata(raw, "https://example.com");
    expect(result.title).toBe("Hello World");
  });
});
