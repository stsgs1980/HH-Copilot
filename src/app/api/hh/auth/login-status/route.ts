import { proxyGet } from "@/lib/fastapi-proxy";

export async function GET() {
  const result = await proxyGet("/api/auth/login-status");
  return Response.json(result);
}
