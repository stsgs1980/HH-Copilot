import { proxyPost } from "@/lib/fastapi-proxy";

export async function POST(request: Request) {
  const body = await request.json();
  // Frontend sends "text", API expects "captcha_text"
  const apiBody = {
    captcha_text: body.text || body.captcha_text
  };
  const result = await proxyPost("/api/auth/solve-captcha", apiBody);
  return Response.json(result);
}
