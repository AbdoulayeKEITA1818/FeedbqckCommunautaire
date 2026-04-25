const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const rootDir = __dirname;
const preferredPort = Number.parseInt(process.env.PORT || "3000", 10);
const maxPortRetries = 10;

const backendCandidates = process.env.API_TARGET
  ? [process.env.API_TARGET]
  : Array.from({ length: 11 }, (_, index) => `http://127.0.0.1:${5000 + index}`);

let cachedBackend = "";
let cachedBackendAt = 0;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(response, 500, { success: false, message: "Impossible de lire le fichier demande." });
      return;
    }

    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  });
}

async function detectBackend() {
  const cacheIsFresh = cachedBackend && Date.now() - cachedBackendAt < 10_000;
  if (cacheIsFresh) {
    return cachedBackend;
  }

  for (const candidate of backendCandidates) {
    const isReachable = await pingHealth(candidate);
    if (isReachable) {
      cachedBackend = candidate;
      cachedBackendAt = Date.now();
      return candidate;
    }
  }

  cachedBackend = "";
  cachedBackendAt = 0;
  return "";
}

function pingHealth(baseUrl) {
  return new Promise((resolve) => {
    const url = new URL("/api/health", baseUrl);
    const request = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: "GET",
        timeout: 1200,
      },
      (response) => {
        response.resume();
        resolve(Boolean(response.statusCode) && response.statusCode < 500);
      }
    );

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });

    request.on("error", () => {
      resolve(false);
    });

    request.end();
  });
}

async function proxyApiRequest(request, response) {
  const backendBase = await detectBackend();

  if (!backendBase) {
    sendJson(response, 502, {
      success: false,
      message: "Aucune API backend joignable sur localhost:5000 a localhost:5010.",
    });
    return;
  }

  const targetUrl = new URL(request.url, backendBase);
  const proxyRequest = http.request(
    {
      hostname: targetUrl.hostname,
      port: targetUrl.port,
      path: `${targetUrl.pathname}${targetUrl.search}`,
      method: request.method,
      headers: {
        ...request.headers,
        host: `${targetUrl.hostname}:${targetUrl.port}`,
      },
    },
    (proxyResponse) => {
      response.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
      proxyResponse.pipe(response);
    }
  );

  proxyRequest.on("error", () => {
    cachedBackend = "";
    cachedBackendAt = 0;
    sendJson(response, 502, {
      success: false,
      message: "Le backend a refuse la connexion pendant le proxy.",
    });
  });

  request.pipe(proxyRequest);
}

function handleStaticRequest(request, response) {
  if (!["GET", "HEAD"].includes(request.method)) {
    sendJson(response, 405, { success: false, message: "Methode non supportee." });
    return;
  }

  const requestUrl = new URL(request.url, "http://127.0.0.1");
  const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const safePath = path.normalize(path.join(rootDir, decodeURIComponent(requestedPath)));

  if (!safePath.startsWith(rootDir)) {
    sendJson(response, 403, { success: false, message: "Acces refuse." });
    return;
  }

  fs.stat(safePath, (error, stats) => {
    if (error || !stats.isFile()) {
      sendJson(response, 404, { success: false, message: "Fichier introuvable." });
      return;
    }

    if (request.method === "HEAD") {
      response.writeHead(200, { "Content-Type": mimeTypes[path.extname(safePath)] || "application/octet-stream" });
      response.end();
      return;
    }

    sendFile(response, safePath);
  });
}

async function requestHandler(request, response) {
  if (request.url.startsWith("/api/")) {
    await proxyApiRequest(request, response);
    return;
  }

  handleStaticRequest(request, response);
}

function startServer(port, retriesLeft = maxPortRetries) {
  const server = http.createServer((request, response) => {
    requestHandler(request, response).catch((error) => {
      sendJson(response, 500, {
        success: false,
        message: "Erreur serveur frontend.",
        details: error.message,
      });
    });
  });

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && retriesLeft > 0) {
      const nextPort = port + 1;
      console.warn(`Le port ${port} est deja utilise. Nouvelle tentative sur ${nextPort}.`);
      startServer(nextPort, retriesLeft - 1);
      return;
    }

    console.error(`Impossible de lancer le frontend sur le port ${port}:`, error.message);
    process.exit(1);
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`Frontend disponible sur http://127.0.0.1:${port}`);
  });
}

startServer(preferredPort);
