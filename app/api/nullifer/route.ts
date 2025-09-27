import { readHash } from "@/utils/helper";
import { NextResponse } from "next/server";


// Handle GET request → return the hash
export async function GET() {
  const nullifer = readHash();
  return NextResponse.json({ nullifer });
}