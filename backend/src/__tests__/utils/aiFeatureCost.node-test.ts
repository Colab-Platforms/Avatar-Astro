// Run with: npx tsx --test src/__tests__/utils/aiFeatureCost.node-test.ts
// Pure calculations only: no database, no network, no provider call.
import { test } from "node:test";
import assert from "node:assert/strict";

delete process.env.AI_PRICING_JSON;
delete process.env.GROQ_MODEL;
delete process.env.OPENROUTER_MODEL;
delete process.env.USD_TO_INR_RATE;

const { buildReport, buildRow, resolveFx, scale, usdToInr, featureCostCsvRows, FEATURE_COST_CSV_HEADERS, OPERATIONS, REFERENCE_RATES } = await import("../../modules/admin/aiFeatureCost.js");
const { estimateCostUsd } = await import("../../config/aiPricing.js");
type G = import("../../modules/admin/aiFeatureCost.js").ObservedGroup;

const fx = { rate: 100, kind: "configured" as const, asOf: null, source: "test" };
const group = (o: Partial<G>): G => ({
  feature: "tarot", route: "/api/tarot/reading", provider: "openrouter", model: "google/gemma-3-27b-it", requests: 0, calls: 0, failed: 0,
  actualRequests: 0, actualUsd: 0, estimatedRequests: 0, estimatedUsd: 0, tokenOnlyRequests: 0, tokenOnlyInput: 0, tokenOnlyOutput: 0,
  tokenRequests: 0, inputTokens: 0, outputTokens: 0, ...o,
});
const find = (rep: ReturnType<typeof buildReport>, id: string) => rep.rows.find((r) => r.id === id)!;

test("formula: (input x input price + output x output price) / 1,000,000", () => {
  assert.equal(estimateCostUsd({ inputPerM: 0.08, outputPerM: 0.35 }, 1000, 500), (1000 * 0.08 + 500 * 0.35) / 1_000_000);
  assert.equal(estimateCostUsd({ inputPerM: 0.15, outputPerM: 0.6 }, 2_000_000, 1_000_000), 0.9);
});

test("missing token counts or price give null, never zero", () => {
  assert.equal(estimateCostUsd(null, 100, 100), null);
  assert.equal(estimateCostUsd({ inputPerM: 1, outputPerM: 1 }, null, 100), null);
});

test("scaling to 100 and 1,000 generations keeps null as null", () => {
  assert.equal(scale(0.002, 100), 0.2);
  assert.equal(scale(0.002, 1000), 2);
  assert.equal(scale(null, 100), null);
});

test("INR conversion uses the stated rate; null stays null", () => {
  assert.equal(usdToInr(0.01, 95.073571), 0.01 * 95.073571);
  assert.equal(usdToInr(null, 95), null);
});

test("exchange rate: the configured rate wins, else the dated reference rate is reported", () => {
  assert.deepEqual({ ...resolveFx(88.5) }, { rate: 88.5, kind: "configured", asOf: null, source: "USD_TO_INR_RATE environment variable" });
  const ref = resolveFx(null);
  assert.equal(ref.kind, "reference");
  assert.equal(ref.asOf, "2026-10-31");
  assert.ok(ref.rate > 0);
});

test("a recorded provider cost is Paid/actual and is averaged over those requests only", () => {
  const rep = buildReport([group({ requests: 4, calls: 4, actualRequests: 4, actualUsd: 0.004, tokenRequests: 4, inputTokens: 4000, outputTokens: 2000 })], {}, fx);
  const r = find(rep, "tarot.reading");
  assert.equal(r.classification, "paid");
  assert.equal(r.costBasis, "actual");
  assert.equal(r.costPerGenerationUsd, 0.001);
  assert.equal(r.costPerGenerationInr, 0.1);
  assert.equal(r.cost100Usd, 0.1);
  assert.equal(r.cost1000Usd, 1);
  assert.equal(r.cost1000Inr, 100);
  assert.equal(r.inputTokens, 1000);
  assert.equal(r.outputTokens, 500);
  assert.equal(r.totalTokens, 1500);
  assert.equal(rep.totals.actualUsd, 0.004);
});

test("tokens without a stored cost are priced from the verified rate and labelled Estimated, not Actual", () => {
  const rep = buildReport([group({ requests: 2, calls: 2, tokenOnlyRequests: 2, tokenOnlyInput: 2000, tokenOnlyOutput: 1000, tokenRequests: 2, inputTokens: 2000, outputTokens: 1000 })], {}, fx);
  const r = find(rep, "tarot.reading");
  assert.equal(r.classification, "estimated");
  assert.equal(r.costBasis, "estimated");
  assert.equal(r.costPerGenerationUsd, (1000 * 0.08 + 500 * 0.35) / 1_000_000);
  assert.equal(rep.totals.actualUsd, 0);
  assert.equal(rep.totals.estimatedUsd, (2000 * 0.08 + 1000 * 0.35) / 1_000_000);
});

test("stored estimates are averaged and kept apart from actuals", () => {
  const rep = buildReport([group({ requests: 3, calls: 3, estimatedRequests: 2, estimatedUsd: 0.0004, actualRequests: 1, actualUsd: 0.0009 })], {}, fx);
  assert.equal(find(rep, "tarot.reading").costPerGenerationUsd, 0.0009); // actual wins for the headline figure
  assert.equal(rep.totals.actualUsd, 0.0009);
  assert.equal(rep.totals.estimatedUsd, 0.0004);
});

test("verified free model is Free model with $0, with or without any usage", () => {
  const none = find(buildReport([], {}, fx), "iv.diagnose");
  assert.equal(none.classification, "free-model");
  assert.equal(none.costPerGenerationUsd, 0);
  assert.equal(none.cost1000Inr, 0);
  const used = find(buildReport([group({ feature: "inner-voice", route: "/api/inner-voice/diagnose", model: "google/gemma-4-31b-it:free", requests: 5, calls: 5, tokenRequests: 5, inputTokens: 5000, outputTokens: 2500, tokenOnlyRequests: 5, tokenOnlyInput: 5000, tokenOnlyOutput: 2500 })], {}, fx), "iv.diagnose");
  assert.equal(used.classification, "free-model");
  assert.equal(used.costPerGenerationUsd, 0);
});

test("missing pricing is Unknown with null cost, never $0, and says why", () => {
  const rep = buildReport([], {}, fx);
  const palm = find(rep, "palm.reading"); // anthropic/claude-3.5-sonnet is not in any verified price list
  assert.equal(palm.classification, "unknown");
  assert.equal(palm.costPerGenerationUsd, null);
  assert.equal(palm.cost100Usd, null);
  assert.match(palm.reason, /No verified price/);
  const gem = find(rep, "gemstone.explain"); // Groq lists llama-3.3-70b-versatile as "contact sales"
  assert.equal(gem.classification, "unknown");
  assert.equal(gem.costPerGenerationUsd, null);
});

test("a priced model with no recorded requests is Unknown, not guessed", () => {
  const r = find(buildReport([], {}, fx), "tarot.reading");
  assert.equal(r.classification, "unknown");
  assert.equal(r.costPerGenerationUsd, null);
  assert.match(r.reason, /no request has been recorded/i);
  assert.equal(r.rate?.inputPerM, 0.08);
  assert.equal(r.rate?.verifiedAt, "2026-10-31");
});

test("non-AI paths are Free with $0", () => {
  const r = find(buildReport([], {}, fx), "free.zodiac");
  assert.equal(r.classification, "free");
  assert.equal(r.costPerGenerationUsd, 0);
  assert.equal(r.provider, null);
});

test("character-billed TTS is Unknown but shows the per-request ceiling from the 500-character cap", () => {
  const r = find(buildReport([], {}, fx), "tts.main");
  assert.equal(r.classification, "unknown");
  assert.equal(r.costPerGenerationUsd, null);
  assert.equal(r.rate?.inrPer1kChars, 3);
  assert.equal(r.maxCostPerGenerationUsd, (500 / 1000) * 3 / 100); // INR 1.50 at 100 INR per USD
});

test("a shared endpoint is counted once in totals even though three features list it", () => {
  const chat = group({ feature: "ai-chat", route: "/api/ai/chat", provider: "groq", model: "openai/gpt-oss-120b", requests: 10, calls: 10, actualRequests: 10, actualUsd: 0.05, tokenRequests: 10, inputTokens: 10000, outputTokens: 5000 });
  const rep = buildReport([chat], {}, fx);
  const rows = ["chat.karma", "chat.guru", "chat.shloka"].map((id) => find(rep, id));
  assert.ok(rows.every((r) => r.sharedEndpoint && r.costPerGenerationUsd === 0.005));
  assert.equal(rep.totals.actualUsd, 0.05);
  assert.equal(rep.totals.requestsWithActual, 10);
});

test("retries inside one request are not multiplied: the cost is the request's recorded total", () => {
  const r = find(buildReport([group({ requests: 2, calls: 4, actualRequests: 2, actualUsd: 0.02 })], {}, fx), "tarot.reading");
  assert.equal(r.avgCalls, 2);
  assert.equal(r.costPerGenerationUsd, 0.01);
});

test("filters by feature, provider and model narrow rows and totals", () => {
  const groups = [
    group({ requests: 1, calls: 1, actualRequests: 1, actualUsd: 0.5 }),
    group({ feature: "ai-chat", route: "/api/ai/chat", provider: "groq", model: "openai/gpt-oss-120b", requests: 1, calls: 1, actualRequests: 1, actualUsd: 0.25 }),
  ];
  const byFeature = buildReport(groups, { feature: "tarot" }, fx);
  assert.ok(byFeature.rows.every((r) => r.feature === "tarot"));
  assert.equal(byFeature.totals.actualUsd, 0.5);
  const byProvider = buildReport(groups, { provider: "groq" }, fx);
  assert.ok(byProvider.rows.every((r) => r.provider === "groq"));
  assert.equal(byProvider.totals.actualUsd, 0.25);
  const byModel = buildReport(groups, { model: "GEMMA-3" }, fx);
  assert.equal(byModel.totals.actualUsd, 0.5);
  assert.ok(byModel.rows.length >= 1 && byModel.rows.every((r) => /gemma-3/i.test(r.model ?? "")));
});

test("recorded usage on a route outside the catalogue is still shown", () => {
  const rep = buildReport([group({ feature: "tarot", route: "/api/tarot/new-thing", requests: 1, calls: 1, actualRequests: 1, actualUsd: 0.01 })], {}, fx);
  assert.ok(rep.rows.some((r) => r.operation === "Not in the operation catalogue" && r.costPerGenerationUsd === 0.01));
  assert.equal(rep.totals.actualUsd, 0.01);
});

test("the model comes from the environment when the code reads it from the environment", () => {
  process.env.GROQ_MODEL = "openai/gpt-oss-120b";
  const gem = OPERATIONS.find((o) => o.id === "gemstone.explain")!;
  assert.deepEqual(gem.model(), { id: "openai/gpt-oss-120b", from: "environment" });
  const r = find(buildReport([], {}, fx), "gemstone.explain");
  assert.equal(r.rate?.inputPerM, 0.15); // now a priced model, still Unknown until a request is recorded
  assert.equal(r.classification, "unknown");
  delete process.env.GROQ_MODEL;
  assert.equal(gem.model().id, "llama-3.3-70b-versatile");
});

test("every reference price names its source and verification date", () => {
  for (const [k, v] of Object.entries(REFERENCE_RATES)) {
    assert.match(v.source, /^https:\/\//, k);
    assert.match(v.verifiedAt, /^\d{4}-\d{2}-\d{2}$/, k);
  }
});

test("CSV has one value per header on every row", () => {
  const rep = buildReport([group({ requests: 1, calls: 1, actualRequests: 1, actualUsd: 0.01 })], {}, fx);
  const rows = featureCostCsvRows(rep);
  assert.ok(rows.length > 10);
  assert.ok(rows.every((r) => r.length === FEATURE_COST_CSV_HEADERS.length));
});

test("buildRow marks a bare free path without touching providers", () => {
  const r = buildRow({ id: "x", feature: "zodiac", label: "Zodiac", operation: "op", route: null, provider: null }, { id: null, from: null }, null, fx);
  assert.equal(r.classification, "free");
});

test("a price fetched from OpenRouter's live list is labelled as such, not as AI_PRICING_JSON", async () => {
  const { setOpenRouterCatalogue, resetOpenRouterCatalogue } = await import("../../config/aiPricing.js");
  setOpenRouterCatalogue([{ id: "google/gemma-3-27b-it", pricing: { prompt: "0.00000009", completion: "0.0000004" } }]);
  try {
    const r = find(buildReport([], {}, fx), "tarot.reading");
    assert.equal(r.rate?.inputPerM, 0.09 * 1);
    assert.match(r.rate!.source, /OpenRouter public price list/);
    assert.equal(r.rate!.verifiedAt, null);
  } finally {
    resetOpenRouterCatalogue();
  }
});
