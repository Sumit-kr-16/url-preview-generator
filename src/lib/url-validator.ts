import { z } from "zod";

const urlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .transform((val) => {
    // Add protocol if missing
    if (!/^https?:\/\//i.test(val)) {
      return `https://${val}`;
    }
    return val;
  })
  .pipe(z.string().url("Invalid URL format"));

export function validateAndNormalizeUrl(input: string): {
  success: true;
  url: string;
} | {
  success: false;
  error: string;
} {
  const result = urlSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }
  return { success: true, url: result.data };
}
