import request, { TEST_API_URL, idmux, Identity } from "./lib";

let identity: Identity;

beforeAll(async () => {
  identity = await idmux({
    name: "request-id",
    concurrency: 10,
    credits: 100,
  });
});

describe("Request ID correlation", () => {
  it("generates and returns a request ID header when none is supplied", async () => {
    const response = await request(TEST_API_URL)
      .get("/v2/crawl/not-a-uuid")
      .set("Authorization", `Bearer ${identity.apiKey}`);

    expect(response.statusCode).toBe(400);
    expect(response.headers["x-request-id"]).toMatch(
      /^[a-zA-Z0-9_.:-]{1,128}$/,
    );
  });

  it("echoes back a client-supplied X-Request-ID header", async () => {
    const clientRequestId = "client-supplied-id-123";

    const response = await request(TEST_API_URL)
      .get("/v2/crawl/not-a-uuid")
      .set("Authorization", `Bearer ${identity.apiKey}`)
      .set("X-Request-ID", clientRequestId);

    expect(response.statusCode).toBe(400);
    expect(response.headers["x-request-id"]).toBe(clientRequestId);
  });

  it("ignores an invalid client-supplied X-Request-ID and generates its own", async () => {
    const response = await request(TEST_API_URL)
      .get("/v2/crawl/not-a-uuid")
      .set("Authorization", `Bearer ${identity.apiKey}`)
      .set("X-Request-ID", "not valid! header value with spaces");

    expect(response.statusCode).toBe(400);
    expect(response.headers["x-request-id"]).toMatch(
      /^[a-zA-Z0-9_.:-]{1,128}$/,
    );
    expect(response.headers["x-request-id"]).not.toBe(
      "not valid! header value with spaces",
    );
  });
});
