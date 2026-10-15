// Minimal GitHub OAuth server for local Supabase Auth (see docs/oauth-testing.md). Run with `node`.
// The identity comes from the `mock_identity` cookie, JSON `{ email, verified }` or `{ deny: true }`;
// code and access token are that JSON in base64url, so the server keeps no state.
import { createHash } from "node:crypto";
import { createServer } from "node:http";

const identityFrom = (cookie: string | undefined) => {
  const raw = /(?:^|;\s*)mock_identity=([^;]*)/.exec(cookie ?? "")?.[1];
  return raw ? JSON.parse(decodeURIComponent(raw)) : null;
};
const decode = (token: string) => JSON.parse(Buffer.from(token, "base64url").toString());
const idOf = (email: string) =>
  parseInt(createHash("sha256").update(email).digest("hex").slice(0, 10), 16);

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://mock");
  const json = (body: unknown) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(body));
  };
  const bearer = () => (req.headers.authorization ?? "").replace(/^\S+\s+/, "");

  if (url.pathname === "/login/oauth/authorize") {
    const identity = identityFrom(req.headers.cookie);
    const back = new URL(url.searchParams.get("redirect_uri") ?? "");
    back.searchParams.set("state", url.searchParams.get("state") ?? "");
    if (!identity || identity.deny) back.searchParams.set("error", "access_denied");
    else back.searchParams.set("code", Buffer.from(JSON.stringify(identity)).toString("base64url"));
    res.writeHead(302, { location: back.toString() }).end();
  } else if (url.pathname === "/login/oauth/access_token") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const code = new URLSearchParams(body).get("code") ?? "";
      json({ access_token: code, token_type: "bearer", scope: "user:email" });
    });
  } else if (url.pathname === "/api/v3/user") {
    const { email } = decode(bearer());
    json({ id: idOf(email), login: email.split("@")[0], name: "Mock User" });
  } else if (url.pathname === "/api/v3/user/emails") {
    const { email, verified } = decode(bearer());
    json([{ email, primary: true, verified }]);
  } else {
    res.writeHead(404).end();
  }
}).listen(54399, "0.0.0.0");
