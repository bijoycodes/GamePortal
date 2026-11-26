import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthenticated.", code: "UNAUTHENTICATED" }, { status: 401 });
  }
  return NextResponse.json(user);
}
