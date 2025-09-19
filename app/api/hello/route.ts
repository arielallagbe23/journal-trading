export const runtime = "nodejs";
// app/api/hello/route.ts
export async function GET() {
  return Response.json({ message: "Hello depuis le backend 👋" });
}
