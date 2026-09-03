import { describe, expect, test, vi } from "vitest";
import { sendMessage } from "../src/services/ai-service.js";

describe("AI Service Error Handling", () => {
  test("should handle network errors gracefully", async () => {
    // Мокаем fetch для симуляции сетевой ошибки
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await sendMessage({
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("NO_API_KEY"); // no built-in defaults
    expect(result.error).toContain("Network error");
  });

  test("should handle HTTP errors", async () => {
    // Мокаем fetch для симуляции HTTP ошибки
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });

    const result = await sendMessage({
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("NO_API_KEY"); // no built-in defaults
    expect(result.error).toBe("HTTP 500");
  });

  test("should handle invalid JSON response", async () => {
    // Мокаем fetch для симуляции невалидного JSON
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error("Invalid JSON")),
    });

    const result = await sendMessage({
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("NO_API_KEY"); // no built-in defaults
    expect(result.error).toContain("Invalid JSON");
  });

  test("should handle empty AI response", async () => {
    // Мокаем fetch для симуляции пустого ответа
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [],
        }),
    });

    const result = await sendMessage({
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("NO_API_KEY"); // no built-in defaults
  });
});
