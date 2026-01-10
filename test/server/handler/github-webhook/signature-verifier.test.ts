import { describe, expect, it, vi } from "vitest";
import { verifySignature } from "@notifier/server/handler/github-webhook/signature-verifier";

describe("verifySignature", () => {
  it("署名が正しい場合、okを返す", async () => {
    const payload = '{"test":"data"}';
    const secret = "my-secret";
    // Pre-computed HMAC SHA-256 signature for the above payload and secret
    const validSignature = "sha256=e01e4c76d0f2d0de3b6e2c6e8f0f0b0e0f0e0f0e0f0e0f0e0f0e0f0e0f0e0f0";

    // Compute the actual signature to get the correct value
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const payloadData = encoder.encode(payload);
    const signatureData = await crypto.subtle.sign("HMAC", key, payloadData);
    const signatureArray = Array.from(new Uint8Array(signatureData));
    const computedSignature = signatureArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");

    const result = await verifySignature({
      payload,
      signature: `sha256=${computedSignature}`,
      webhookSecret: secret,
    });

    expect(result.isOk()).toBe(true);
  });

  it("sha256=接頭辞を署名から除去する", async () => {
    const payload = '{"test":"data"}';
    const secret = "my-secret";

    // Compute the actual signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const payloadData = encoder.encode(payload);
    const signatureData = await crypto.subtle.sign("HMAC", key, payloadData);
    const signatureArray = Array.from(new Uint8Array(signatureData));
    const computedSignature = signatureArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");

    // Test with sha256= prefix
    const result = await verifySignature({
      payload,
      signature: `sha256=${computedSignature}`,
      webhookSecret: secret,
    });

    expect(result.isOk()).toBe(true);
  });

  it("署名が無効な場合、401エラーを返す", async () => {
    const payload = '{"test":"data"}';
    const secret = "my-secret";
    const invalidSignature = "sha256=invalid";

    const result = await verifySignature({
      payload,
      signature: invalidSignature,
      webhookSecret: secret,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.status).toBe(401);
      expect(result.error.message).toBe("Invalid signature");
    }
  });

  it("crypto操作が失敗した場合、500エラーを返す", async () => {
    const payload = '{"test":"data"}';
    const secret = "my-secret";
    const signature = "sha256=somesignature";

    // Spy on crypto.subtle.importKey to force an error
    const importKeySpy = vi.spyOn(crypto.subtle, "importKey").mockRejectedValueOnce(new Error("Crypto error"));

    const result = await verifySignature({
      payload,
      signature,
      webhookSecret: secret,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.status).toBe(500);
      expect(result.error.message).toContain("Error verifying signature");
      expect(result.error.message).toContain("Crypto error");
    }

    // Restore the spy
    importKeySpy.mockRestore();
  });

  it("sign操作が失敗した場合、500エラーを返す", async () => {
    const payload = '{"test":"data"}';
    const secret = "my-secret";
    const signature = "sha256=somesignature";

    // Spy on crypto.subtle.sign to force an error
    const signSpy = vi.spyOn(crypto.subtle, "sign").mockRejectedValueOnce(new Error("Sign operation failed"));

    const result = await verifySignature({
      payload,
      signature,
      webhookSecret: secret,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.status).toBe(500);
      expect(result.error.message).toContain("Error verifying signature");
      expect(result.error.message).toContain("Sign operation failed");
    }

    // Restore the spy
    signSpy.mockRestore();
  });
});
