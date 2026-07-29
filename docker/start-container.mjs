import http from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";

const appRoot = process.env.REDLINE_APP_ROOT || "/app";
const publicPort = parsePort(process.env.PORT, 8080, "PORT");
const botPort = parsePort(process.env.BOT_INTERNAL_PORT, 18081, "BOT_INTERNAL_PORT");
const miniAppPort = parsePort(
  process.env.MINI_APP_INTERNAL_PORT,
  3000,
  "MINI_APP_INTERNAL_PORT",
);

if (new Set([publicPort, botPort, miniAppPort]).size !== 3) {
  throw new Error("Public, bot and Mini App ports must be different");
}

let shuttingDown = false;

const bot = launch(
  "bot",
  "java",
  ["-XX:MaxRAMPercentage=55.0", "-jar", process.env.BOT_JAR_PATH || path.join(appRoot, "bot.jar")],
  {
    ...process.env,
    PORT: String(botPort),
  },
);

const miniApp = launch(
  "mini-app",
  process.env.WEB_CLI_PATH || path.join(appRoot, "node_modules/.bin/vinext"),
  ["start", "--host", "127.0.0.1", "--port", String(miniAppPort)],
  {
    ...process.env,
    WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH || "/tmp/redline-wrangler.log",
  },
);

const proxy = http.createServer((request, response) => {
  const originalUrl = request.url || "/";
  const isMiniApp =
    originalUrl === "/redlineclub" || originalUrl.startsWith("/redlineclub/");
  const isPrefixedApi =
    originalUrl === "/redlineclub-api" ||
    originalUrl.startsWith("/redlineclub-api/");

  let targetPath = originalUrl;
  if (isPrefixedApi) {
    targetPath = originalUrl.slice("/redlineclub-api".length) || "/";
  } else if (originalUrl.startsWith("/redlineclub/assets/")) {
    targetPath = originalUrl.slice("/redlineclub".length);
  }

  const forwardedHeaders = {
    ...request.headers,
    "x-forwarded-host":
      request.headers["x-forwarded-host"] || request.headers.host || "",
    "x-forwarded-proto":
      request.headers["x-forwarded-proto"] || "http",
  };
  if (isMiniApp) {
    forwardedHeaders["accept-encoding"] = "identity";
  }

  const proxyRequest = http.request(
    {
      hostname: "127.0.0.1",
      port: isMiniApp ? miniAppPort : botPort,
      path: targetPath,
      method: request.method,
      headers: forwardedHeaders,
    },
    (proxyResponse) => {
      const contentType = String(proxyResponse.headers["content-type"] || "");
      if (isMiniApp && contentType.includes("text/html")) {
        const chunks = [];
        proxyResponse.on("data", (chunk) => chunks.push(chunk));
        proxyResponse.on("end", () => {
          const body = Buffer.concat(chunks)
            .toString("utf8")
            .replaceAll('"/assets/_vinext_fonts/', '"/redlineclub/assets/_vinext_fonts/')
            .replaceAll("url(/assets/_vinext_fonts/", "url(/redlineclub/assets/_vinext_fonts/");
          const headers = { ...proxyResponse.headers };
          delete headers["content-length"];
          delete headers["content-encoding"];
          if (typeof headers.link === "string") {
            headers.link = headers.link.replaceAll(
              "</assets/_vinext_fonts/",
              "</redlineclub/assets/_vinext_fonts/",
            );
          }
          response.writeHead(proxyResponse.statusCode || 502, headers);
          response.end(body);
        });
      } else {
        response.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
        proxyResponse.pipe(response);
      }
    },
  );

  proxyRequest.on("error", (error) => {
    if (!response.headersSent) {
      response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    }
    response.end(`REDLINE service is starting: ${error.message}\n`);
  });
  proxyRequest.setTimeout(isMiniApp ? 30_000 : 120_000, () => {
    proxyRequest.destroy(
      new Error(
        isMiniApp
          ? "Mini App upstream timeout"
          : "REDLINE API upstream timeout",
      ),
    );
  });

  request.pipe(proxyRequest);
});

proxy.requestTimeout = 125_000;
proxy.headersTimeout = 130_000;

proxy.listen(publicPort, "0.0.0.0", () => {
  console.log(`REDLINE gateway listening on 0.0.0.0:${publicPort}`);
});

proxy.on("error", (error) => {
  console.error("REDLINE gateway failed", error);
  void shutdown("SIGTERM", 1);
});

process.on("SIGTERM", () => void shutdown("SIGTERM", 0));
process.on("SIGINT", () => void shutdown("SIGINT", 0));

function launch(name, command, args, env) {
  const child = spawn(command, args, {
    cwd: appRoot,
    env,
    stdio: "inherit",
  });
  child.once("error", (error) => {
    console.error(`${name} failed to start`, error);
    if (!shuttingDown) {
      void shutdown("SIGTERM", 1);
    }
  });
  child.once("exit", (code, signal) => {
    if (!shuttingDown) {
      console.error(`${name} exited unexpectedly (code=${code}, signal=${signal})`);
      void shutdown("SIGTERM", code || 1);
    }
  });
  return child;
}

async function shutdown(signal, exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  proxy.close();

  for (const child of [bot, miniApp]) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill(signal);
    }
  }

  const forcedExit = setTimeout(() => {
    for (const child of [bot, miniApp]) {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
    }
  }, 10_000);
  forcedExit.unref();

  await Promise.all(
    [bot, miniApp].map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null) {
            resolve();
          } else {
            child.once("exit", resolve);
          }
        }),
    ),
  );
  process.exit(exitCode);
}

function parsePort(value, fallback, name) {
  const parsed = Number(value || fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return parsed;
}
