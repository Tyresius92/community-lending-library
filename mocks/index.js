const http = require("http");

const { http: mswHttp, HttpResponse, passthrough } = require("msw");
const { setupServer } = require("msw/node");

// put one-off handlers that don't really need an entire file to themselves here
const miscHandlers = [
  mswHttp.post(`${process.env.REMIX_DEV_HTTP_ORIGIN}/ping`, () =>
    passthrough(),
  ),
];

// Captured outbound "emails" sent via Resend during tests, most recent last.
const sentEmails = [];

const resendHandler = mswHttp.post(
  "https://api.resend.com/emails",
  async ({ request }) => {
    const body = await request.json();
    sentEmails.push(body);
    return HttpResponse.json({ id: "mock_email_id" });
  },
);

const server = setupServer(...miscHandlers, resendHandler);

server.listen({ onUnhandledRequest: "bypass" });
console.info("🔶 Mock server running");

// Tiny inspection server so Cypress can retrieve the magic-link URL from the
// most recently "sent" email, since real emails never reach an inbox in tests.
const inspectionPort = Number(process.env.PORT ?? 8811) + 2;

const inspectionServer = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${inspectionPort}`);

  if (url.pathname !== "/__mocks/magic_link") {
    res.writeHead(404).end();
    return;
  }

  const email = url.searchParams.get("email");
  const match = [...sentEmails]
    .reverse()
    .find((sent) => sent.to === email || sent.to?.[0] === email);

  const urlMatch = match?.html?.match(/https?:\/\/[^\s"]+\/magic_link\?[^\s"]+/);

  res.setHeader("Content-Type", "application/json");
  if (urlMatch) {
    res.writeHead(200).end(JSON.stringify({ url: urlMatch[0] }));
  } else {
    res.writeHead(404).end(JSON.stringify({ url: null }));
  }
});

inspectionServer.listen(inspectionPort);

process.once("SIGINT", () => {
  server.close();
  inspectionServer.close();
});
process.once("SIGTERM", () => {
  server.close();
  inspectionServer.close();
});
