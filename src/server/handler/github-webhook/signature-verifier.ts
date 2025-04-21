import type { RequestHandlerError } from "@notifier/server/handler/types";
import { type Result, err, ok } from "neverthrow";

const encoder = new TextEncoder();

export async function verifySignature(props: {
  payload: string;
  signature: string;
  webhookSecret: string;
}): Promise<Result<unknown, RequestHandlerError>> {
  const { payload, signature, webhookSecret } = props;

  try {
    const computedSignature = await computeSignature(payload, webhookSecret);
    const providedSignature = signature.replace("sha256=", "");
    if (computedSignature !== providedSignature) {
      return err({
        status: 401,
        message: "Invalid signature",
      });
    }
  } catch (error) {
    return err({
      status: 500,
      message: `Error verifying signature: ${String(error)}`,
    });
  }

  return ok();
}

async function computeSignature(payload: string, secret: string) {
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

  const payloadData = encoder.encode(payload);
  const signatureData = await crypto.subtle.sign("HMAC", key, payloadData);

  const signatureArray = Array.from(new Uint8Array(signatureData));
  return signatureArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
