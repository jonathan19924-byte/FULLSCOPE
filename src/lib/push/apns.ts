import "server-only";
import { createSign, createPrivateKey } from "crypto";
import http2 from "http2";

const APNS_HOST = "api.push.apple.com";
// Apple caps provider-token generation frequency; a token is valid up to an
// hour, so this module-scope cache reuses one across warm serverless
// invocations instead of minting a fresh JWT on every push.
let cachedToken: { jwt: string; expiresAt: number } | null = null;

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function getProviderToken(): string {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.jwt;
  }

  const keyId = process.env.APNS_KEY_ID!;
  const teamId = process.env.APNS_TEAM_ID!;
  const privateKeyPem = process.env.APNS_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const privateKey = createPrivateKey(privateKeyPem);

  const header = { alg: "ES256", kid: keyId };
  const payload = { iss: teamId, iat: now };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

  const sign = createSign("SHA256");
  sign.update(signingInput);
  sign.end();
  const signature = sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });

  const jwt = `${signingInput}.${base64url(signature)}`;
  cachedToken = { jwt, expiresAt: now + 3000 }; // Apple allows up to 1hr; refresh well before that
  return jwt;
}

export type ApnsSendResult = { ok: true } | { ok: false; status: number; shouldRemoveToken: boolean };

/** Sends a single alert push via APNs' HTTP/2 provider API. node:http2 is
 * used directly (rather than fetch) since APNs requires HTTP/2 and Vercel's
 * Node.js serverless runtime supports the built-in http2 client. */
export async function sendApnsPush(
  deviceToken: string,
  payload: { title: string; body: string; url?: string },
): Promise<ApnsSendResult> {
  const bundleId = process.env.APNS_BUNDLE_ID!;
  const jwt = getProviderToken();

  return new Promise((resolve) => {
    const client = http2.connect(`https://${APNS_HOST}`);

    client.on("error", () => {
      resolve({ ok: false, status: 0, shouldRemoveToken: false });
    });

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
    });

    req.setEncoding("utf8");
    let responseBody = "";
    let status = 0;

    req.on("response", (headers) => {
      status = Number(headers[":status"]);
    });
    req.on("data", (chunk) => {
      responseBody += chunk;
    });
    req.on("end", () => {
      client.close();
      if (status === 200) {
        resolve({ ok: true });
        return;
      }
      const reason = (() => {
        try {
          return JSON.parse(responseBody).reason as string;
        } catch {
          return undefined;
        }
      })();
      const shouldRemoveToken = reason === "BadDeviceToken" || reason === "Unregistered";
      resolve({ ok: false, status, shouldRemoveToken });
    });

    req.end(
      JSON.stringify({
        aps: {
          alert: { title: payload.title, body: payload.body },
          sound: "default",
        },
        url: payload.url,
      }),
    );
  });
}
