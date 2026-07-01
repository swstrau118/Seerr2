import { NextResponse } from "next/server";
import { removeItem } from "@/lib/library";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const itemId = Number(id);
  if (!itemId) {
    return NextResponse.json({ ok: false, reason: "Invalid id" }, { status: 400 });
  }
  try {
    await removeItem(itemId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
