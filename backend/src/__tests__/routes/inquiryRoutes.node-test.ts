// Run with: npm run test:inquiry   (node:test via tsx)
// The mail provider is MOCKED here (an injected send function); no real email is sent.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import { createInquiryRouter, type SendInquiryMail } from "../../routes/inquiryRoutes.js";
import { validateInquiry, renderInquiry } from "../../utils/inquiry.js";

let server: Server;
let base = "";
let sent: Parameters<SendInquiryMail>[0][] = [];
let sendImpl: SendInquiryMail = async (m) => {
  sent.push(m);
};
let ip = 0;

before(() => {
  const app = express();
  app.set("trust proxy", true);
  app.use("/api", createInquiryRouter((m) => sendImpl(m)));
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());
beforeEach(() => {
  sent = [];
  sendImpl = async (m) => {
    sent.push(m);
  };
  process.env.SUPPORT_EMAIL = "support@example.test";
});

async function post(path: string, body: unknown) {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": `10.1.0.${++ip}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json().catch(() => null)) as any };
}

const partnership = {
  name: "Asha Rao",
  email: "asha@temple.example",
  phone: "+91 98765 43210",
  organisation: "Sri Test Temple",
  city: "Pune",
  message: "We would like to stream our daily aarti.",
};

test("partnership: valid submission is emailed to SUPPORT_EMAIL with reply-to", async () => {
  const r = await post("/api/partnership", partnership);
  assert.equal(r.status, 200);
  assert.equal(r.data.success, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "support@example.test");
  assert.equal(sent[0].replyTo, "asha@temple.example");
  assert.match(sent[0].subject, /Sri Test Temple/);
  assert.match(sent[0].text, /stream our daily aarti/);
});

test("partnership: invalid email/phone/missing fields -> 400 with field errors, nothing sent", async () => {
  const r = await post("/api/partnership", { ...partnership, email: "not-an-email", phone: "123", organisation: "" });
  assert.equal(r.status, 400);
  assert.ok(r.data.fields.email && r.data.fields.phone && r.data.fields.organisation);
  assert.equal(sent.length, 0);
});

test("partnership: provider failure -> 502, never reports success", async () => {
  sendImpl = async () => {
    throw Object.assign(new Error("boom"), { code: "PROVIDER" });
  };
  const r = await post("/api/partnership", partnership);
  assert.equal(r.status, 502);
  assert.equal(r.data.success, false);
  assert.ok(!JSON.stringify(r.data).includes("boom"));
});

test("partnership: mail not configured -> 503, never reports success", async () => {
  sendImpl = async () => {
    throw Object.assign(new Error("x"), { code: "NOT_CONFIGURED" });
  };
  assert.equal((await post("/api/partnership", partnership)).status, 503);
});

test("SUPPORT_EMAIL missing -> 503 and no send attempt", async () => {
  delete process.env.SUPPORT_EMAIL;
  assert.equal((await post("/api/partnership", partnership)).status, 503);
  assert.equal(sent.length, 0);
});

test("honeypot: filled hidden field is accepted silently but never emailed", async () => {
  const r = await post("/api/partnership", { ...partnership, website: "http://spam.example" });
  assert.equal(r.status, 200);
  assert.equal(sent.length, 0);
});

test("contact: requires subject and message; valid message is delivered", async () => {
  assert.equal((await post("/api/contact/send", { name: "Ravi", email: "r@x.example", subject: "", message: "short" })).status, 400);
  const r = await post("/api/contact/send", { name: "Ravi", email: "r@x.example", subject: "Question", message: "How do I book a puja?" });
  assert.equal(r.status, 200);
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /Question/);
});

test("rate limit: more than 5 submissions per minute from one IP -> 429", async () => {
  const fixed = "10.9.9.9";
  let last = 0;
  for (let i = 0; i < 7; i++) {
    const res = await fetch(base + "/api/partnership", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": fixed },
      body: JSON.stringify(partnership),
    });
    last = res.status;
  }
  assert.equal(last, 429);
});

test("rendering escapes HTML and strips newlines from the subject (no injection)", () => {
  const v = validateInquiry("partnership", { ...partnership, organisation: "<script>alert(1)</script>\r\nBcc: evil@x.example", message: "<img src=x onerror=1> hello there" });
  assert.ok(v.ok);
  if (v.ok) {
    const out = renderInquiry("partnership", v.value);
    assert.ok(!out.html.includes("<script>") && !out.html.includes("<img"));
    assert.ok(!/[\r\n]/.test(out.subject));
  }
});

test("newsletter: valid email is delivered, invalid email is rejected", async () => {
  const bad = await post("/api/newsletter/subscribe", { email: "nope" });
  assert.equal(bad.status, 400);
  assert.equal(sent.length, 0);
  const ok = await post("/api/newsletter/subscribe", { email: "reader@example.com" });
  assert.equal(ok.status, 200);
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /reader@example.com/);
});

test("newsletter: provider failure -> 502, not a false success", async () => {
  sendImpl = async () => {
    throw Object.assign(new Error("down"), { code: "PROVIDER" });
  };
  const r = await post("/api/newsletter/subscribe", { email: "reader@example.com" });
  assert.equal(r.status, 502);
  assert.equal(r.data.success, false);
});
