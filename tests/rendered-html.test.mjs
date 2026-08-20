import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/redlineclub", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the REDLINE Mini App shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>REDLINE CLUB/);
  assert.match(html, /src="\/redlineclub\/telegram-web-app\.js"/);
  assert.doesNotMatch(html, /src="https:\/\/telegram\.org\/js\/telegram-web-app\.js/);
  assert.match(html, /Загрузка REDLINE/);
  assert.doesNotMatch(html, /BMW Siberia|Роман|Forge District|Кованые диски/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Building your site/);
});
