import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPreview } from "@/lib/preview-service";
import type { ApiResponse } from "@/types/preview";

const requestSchema = z.object({
  url: z.string().min(1, "URL is required"),
});

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const preview = await getPreview(parsed.data.url);
    return NextResponse.json({ success: true, data: preview });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    // Validation errors → 400, everything else → 500
    const status = message.includes("Invalid") || message.includes("required")
      ? 400
      : 500;

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
