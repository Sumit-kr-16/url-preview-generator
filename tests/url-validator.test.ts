import { describe, it, expect } from "vitest";
import { validateAndNormalizeUrl } from "../src/lib/url-validator";

describe("validateAndNormalizeUrl", () => {
  it("accepts a valid HTTPS URL", () => {
    const result = validateAndNormalizeUrl("https://example.com");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.url).toBe("https://example.com");
    }
  });

  it("accepts a valid HTTP URL", () => {
    const result = validateAndNormalizeUrl("http://example.com");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.url).toBe("http://example.com");
    }
  });

  it("adds https:// when protocol is missing", () => {
    const result = validateAndNormalizeUrl("example.com");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.url).toBe("https://example.com");
    }
  });

  it("adds https:// to www URLs", () => {
    const result = validateAndNormalizeUrl("www.example.com");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.url).toBe("https://www.example.com");
    }
  });

  it("trims whitespace", () => {
    const result = validateAndNormalizeUrl("  https://example.com  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.url).toBe("https://example.com");
    }
  });

  it("rejects empty string", () => {
    const result = validateAndNormalizeUrl("");
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only string", () => {
    const result = validateAndNormalizeUrl("   ");
    expect(result.success).toBe(false);
  });

  it("rejects invalid URL format", () => {
    const result = validateAndNormalizeUrl("not a url at all");
    expect(result.success).toBe(false);
  });

  it("preserves path and query params", () => {
    const result = validateAndNormalizeUrl("https://example.com/path?q=hello");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.url).toBe("https://example.com/path?q=hello");
    }
  });
});
