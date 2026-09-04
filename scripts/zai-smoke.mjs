/**
 * Live smoke test for the public Z.ai endpoint (issue #11).
 * Reads ZAI_API_KEY from env, POSTs a tiny chat completion,
 * prints HTTP status + response body. DO NOT COMMIT keys.
 *
 * Run: ZAI_API_KEY=... node scripts/zai-smoke.mjs
 */
const apiKey = process.env.ZAI_API_KEY;
if (!apiKey) {
  console.error("ZAI_API_KEY is not set. Refusing to run.");
  process.exit(2);
}

const resp = await fetch("https://api.z.ai/api/paas/v4/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
  body: JSON.stringify({
    model: "glm-4.5",
    messages: [{ role: "user", content: "Скажи ок" }],
    temperature: 0.1,
    max_tokens: 10,
    stream: false,
  }),
});

console.log("status:", resp.status);
const text = await resp.text();
console.log("body:", text.slice(0, 2000));
