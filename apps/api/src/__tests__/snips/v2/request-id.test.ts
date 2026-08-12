import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";
import {
  ALLOW_TEST_SUITE_WEBSITE,
  concurrentIf,
  TEST_SUITE_WEBSITE,
} from "../lib";
import request, { TEST_API_URL, scrapeTimeout, idmux, Identity } from "./lib";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let identity: Identity;

beforeAll(async () => {
  identity = await idmux({
    name: "request-id",
    concurrency: 10,
    credits: 1000,
  });
}, 10000);

describe("Request ID correlation", () => {
  concurrentIf(ALLOW_TEST_SUITE_WEBSITE)(
    "generates and echoes an x-request-id header on a successful scrape",
    async () => {
      const clientRequestId = `client-${crypto.randomUUID()}`;

      const withoutHeader = await request(TEST_API_URL)
        .post("/v2/scrape")
        .set("Authorization", `Bearer ${identity.apiKey}`)
        .set("Content-Type", "application/json")
        .send({ url: TEST_SUITE_WEBSITE });

      expect(withoutHeader.statusCode).toBe(200);
      expect(withoutHeader.headers["x-request-id"]).toMatch(UUID_RE);

      const withHeader = await request(TEST_API_URL)
        .post("/v2/scrape")
        .set("Authorization", `Bearer ${identity.apiKey}`)
        .set("Content-Type", "application/json")
        .set("X-Request-Id", clientRequestId)
        .send({ url: TEST_SUITE_WEBSITE });

      expect(withHeader.statusCode).toBe(200);
      expect(withHeader.headers["x-request-id"]).toBe(clientRequestId);
    },
    scrapeTimeout,
  );

  it("echoes a client-supplied x-request-id header on a validation failure", async () => {
    const clientRequestId = `client-${crypto.randomUUID()}`;

    const res = await request(TEST_API_URL)
      .post("/v2/scrape")
      .set("Authorization", `Bearer ${identity.apiKey}`)
      .set("Content-Type", "application/json")
      .set("X-Request-Id", clientRequestId)
      .send({ url: "https://example.com", waitFor: 20000, timeout: 15000 });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.headers["x-request-id"]).toBe(clientRequestId);
  }, 30000);
});
