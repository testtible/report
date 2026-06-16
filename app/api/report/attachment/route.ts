import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  const idParam = request.nextUrl.searchParams.get("id");
  if (!idParam || !/^\d+$/.test(idParam)) {
    return NextResponse.json(
      { error: "유효한 보고 ID가 필요합니다." },
      { status: 400 },
    );
  }

  const id = BigInt(idParam);
  const rows = await prisma.$queryRaw<
    {
      attachment_name: string | null;
      attachment_mime_type: string | null;
      attachment_data: Buffer | null;
    }[]
  >`
    SELECT attachment_name, attachment_mime_type, attachment_data
    FROM content
    WHERE id = ${id}
    LIMIT 1
  `;

  const report = rows[0];
  if (
    !report?.attachment_name ||
    !report.attachment_data ||
    report.attachment_data.length === 0
  ) {
    return NextResponse.json(
      { error: "첨부파일을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const inline = request.nextUrl.searchParams.get("inline") === "true";
  const encodedName = encodeURIComponent(report.attachment_name);
  return new NextResponse(new Uint8Array(report.attachment_data), {
    headers: {
      "Content-Type": report.attachment_mime_type ?? "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodedName}`,
      "Content-Length": String(report.attachment_data.length),
    },
  });
}
