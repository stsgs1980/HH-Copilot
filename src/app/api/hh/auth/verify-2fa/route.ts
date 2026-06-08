import { proxyPost } from "@/lib/fastapi-proxy";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await proxyPost("/api/auth/verify-2fa", body);
  return Response.json(result);
}
