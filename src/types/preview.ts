export interface UrlPreview {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
  fetchedAt: string;
  expiresAt: string | null;
  isFallback: boolean;
}

export interface PreviewResponse {
  success: true;
  data: UrlPreview;
}

export interface PreviewErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse = PreviewResponse | PreviewErrorResponse;
