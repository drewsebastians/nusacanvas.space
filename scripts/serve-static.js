const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(process.argv[2] || ".");
const port = Number(process.argv[3] || 8000);

const types = {
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};

const securityHeaders = {
  "x-robots-tag": "noindex, nofollow, noarchive",
  "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; frame-src 'none'; worker-src 'self' blob:",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "accelerometer=(), ambient-light-sensor=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), usb=(), xr-spatial-tracking=()"
};

function resolveRequest(url) {
  const parsed = new URL(url, `http://localhost:${port}`);
  const decoded = decodeURIComponent(parsed.pathname);
  const relativePath = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  let target = path.resolve(root, relativePath);
  if (target.startsWith(root) && fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, "index.html");
  }
  if (decoded.endsWith("/") && (!fs.existsSync(target) || fs.statSync(target).isDirectory())) {
    target = path.resolve(root, relativePath, "index.html");
  }
  if (!target.startsWith(root)) return null;
  return target;
}

const server = http.createServer((request, response) => {
  const filePath = resolveRequest(request.url);
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404, { ...securityHeaders, "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    ...securityHeaders,
    "content-type": types[path.extname(filePath)] || "application/octet-stream",
    "cache-control": "no-store"
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}/`);
});
