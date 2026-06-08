import { proxyPost } from "@/lib/fastapi-proxy";

export async function POST() {
  const result = await proxyPost("/api/auth/verify-session");
  return Response.json(result);
}
