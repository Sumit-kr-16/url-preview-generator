import { describe, it, expect } from "vitest";
import { parseMetadata } from "../src/lib/metadata-parser";

const BASE_URL = "https://example.com/page";

describe("parseMetadata", () => {
  it("extracts Open Graph metadata", () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="OG Title" />
          <meta property="og:description" content="OG Description" />
          <meta property="og:image" content="https://example.com/image.png" />
          <meta property="og:site_name" content="Example Site" />
        </head>
        <body></body>
      </html>
    `;
    const result = parseMetadata(html, BASE_URL);
    expect(result.title).toBe("OG Title");
    expect(result.description).toBe("OG Description");
    expect(result.image).toBe("https://example.com/image.png");
    expect(result.siteName).toBe("Example Site");
  });

  it("extracts Twitter Card metadata", () => {
    const html = `
      <html>
        <head>
          <meta name="twitter:title" content="Twitter Title" />
          <meta name="twitter:description" content="Twitter Desc" />
          <meta name="twitter:image" content="https://example.com/tw.png" />
        </head>
        <body></body>
      </html>
    `;
    const result = parseMetadata(html, BASE_URL);
    expect(result.title).toBe("Twitter Title");
    expect(result.description).toBe("Twitter Desc");
    expect(result.image).toBe("https://example.com/tw.png");
  });

  it("falls back to <title> tag", () => {
    const html = `
      <html>
        <head><title>Page Title</title></head>
        <body></body>
      </html>
    `;
    const result = parseMetadata(html, BASE_URL);
    expect(result.title).toBe("Page Title");
  });

  it("falls back to <h1> tag when no title or meta", () => {
    const html = `
      <html>
        <head></head>
        <body><h1>Heading Title</h1></body>
      </html>
    `;
    const result = parseMetadata(html, BASE_URL);
    expect(result.title).toBe("Heading Title");
  });

  it("extracts meta description", () => {
    const html = `
      <html>
        <head>
          <meta name="description" content="Standard meta description" />
        </head>
        <body></body>
      </html>
    `;
    const result = parseMetadata(html, BASE_URL);
    expect(result.description).toBe("Standard meta description");
  });

  it("prioritizes OG over Twitter over standard meta", () => {
    const html = `
      <html>
        <head>
          <title>Title Tag</title>
          <meta name="description" content="Meta Desc" />
          <meta name="twitter:title" content="Twitter Title" />
          <meta name="twitter:description" content="Twitter Desc" />
          <meta property="og:title" content="OG Title" />
          <meta property="og:description" content="OG Desc" />
        </head>
        <body></body>
      </html>
    `;
    const result = parseMetadata(html, BASE_URL);
    expect(result.title).toBe("OG Title");
    expect(result.description).toBe("OG Desc");
  });

  it("resolves relative image URLs", () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="/images/photo.jpg" />
        </head>
        <body></body>
      </html>
    `;
    const result = parseMetadata(html, BASE_URL);
    expect(result.image).toBe("https://example.com/images/photo.jpg");
  });

  it("extracts favicon from link tag", () => {
    const html = `
      <html>
        <head>
          <link rel="icon" href="/favicon.png" />
        </head>
        <body></body>
      </html>
    `;
    const result = parseMetadata(html, BASE_URL);
    expect(result.favicon).toBe("https://example.com/favicon.png");
  });

  it("falls back to /favicon.ico when no link tag", () => {
    const html = `<html><head></head><body></body></html>`;
    const result = parseMetadata(html, BASE_URL);
    expect(result.favicon).toBe("https://example.com/favicon.ico");
  });

  it("returns null for missing fields", () => {
    const html = `<html><head></head><body></body></html>`;
    const result = parseMetadata(html, BASE_URL);
    expect(result.title).toBeNull();
    expect(result.description).toBeNull();
    expect(result.image).toBeNull();
    expect(result.siteName).toBeNull();
  });

  it("handles malformed HTML gracefully", () => {
    const html = `<div><meta property="og:title" content="Broken">unclosed`;
    const result = parseMetadata(html, BASE_URL);
    expect(result.title).toBe("Broken");
  });
});
