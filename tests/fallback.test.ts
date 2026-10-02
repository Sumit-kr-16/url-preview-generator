import { describe, it, expect } from "vitest";
import { createFallbackPreview } from "../src/lib/fallback";

describe("createFallbackPreview", () => {
  it("creates a preview with domain as title", () => {
    const preview = createFallbackPreview("https://example.com/page");
    expect(preview.title).toBe("example.com");
    expect(preview.isFallback).toBe(true);
    expect(preview.url).toBe("https://example.com/page");
  });

  it("strips www from domain", () => {
    const preview = createFallbackPreview("https://www.example.com");
    expect(preview.title).toBe("example.com");
    expect(preview.siteName).toBe("example.com");
  });

  it("includes a fallback description", () => {
    const preview = createFallbackPreview("https://example.com");
    expect(preview.description).toBeTruthy();
    expect(preview.description).toContain("could not be loaded");
  });

  it("generates a Google favicon URL", () => {
    const preview = createFallbackPreview("https://example.com");
    expect(preview.favicon).toContain("google.com/s2/favicons");
    expect(preview.favicon).toContain("example.com");
  });

  it("sets a short cache TTL", () => {
    const preview = createFallbackPreview("https://example.com");
    const fetchedAt = new Date(preview.fetchedAt).getTime();
    const expiresAt = new Date(preview.expiresAt!).getTime();
    const ttlMinutes = (expiresAt - fetchedAt) / 1000 / 60;
    expect(ttlMinutes).toBe(5);
  });

  it("sets image to null", () => {
    const preview = createFallbackPreview("https://example.com");
    expect(preview.image).toBeNull();
  });
});
