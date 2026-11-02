export const dynamic = "force-dynamic";

export async function GET() {
  return new Response("OK", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
    },
  });
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
  });
}
