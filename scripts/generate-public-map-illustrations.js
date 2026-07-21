const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "assets", "images", "public");
const geojson = JSON.parse(fs.readFileSync(path.join(root, "data", "indonesia-adm2-simplified.geojson"), "utf8"));
const check = process.argv.includes("--check");
const bounds = { minX: 94.7, maxX: 141.1, minY: -11.2, maxY: 6.2 };

function project([lon, lat], box) {
  const x = box.x + ((lon - bounds.minX) / (bounds.maxX - bounds.minX)) * box.width;
  const y = box.y + ((bounds.maxY - lat) / (bounds.maxY - bounds.minY)) * box.height;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

function ringPath(ring, box) {
  const points = ring.map((point) => project(point, box));
  const compact = points.filter((point, index) => index === 0 || point[0] !== points[index - 1][0] || point[1] !== points[index - 1][1]);
  return compact.length < 3 ? "" : `M${compact.map((point) => point.join(" ")).join("L")}Z`;
}

function geometryPath(geometry, box) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap((polygon) => polygon.map((ring) => ringPath(ring, box))).join("");
}

function featuresPath(features, box) {
  return features.map((feature) => geometryPath(feature.geometry, box)).join("");
}

function escape(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function svg(title, description, body, viewBox = "0 0 900 430") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="title description">
  <title id="title">${escape(title)}</title>
  <desc id="description">${escape(description)}</desc>
  <style>text{font-family:Inter,ui-sans-serif,system-ui,sans-serif}.label{font-size:15px;font-weight:700;fill:#102a43}.small{font-size:12px;fill:#52636e}.outline{stroke:#fff;stroke-width:.8;stroke-linejoin:round}.pin{fill:#087f73;stroke:#fff;stroke-width:3}</style>
${body.trim()}
</svg>
`;
}

const mapBox = { x: 25, y: 25, width: 800, height: 340 };
const all = featuresPath(geojson.features, mapBox);
const province = (name) => geojson.features.filter((feature) => feature.properties.province_name === name);
const place = (name) => {
  const feature = geojson.features.find((item) => item.properties.display_name === name);
  if (!feature) throw new Error(`Missing canonical public illustration place: ${name}`);
  const coordinates = [];
  const collect = (value) => typeof value[0] === "number" ? coordinates.push(value) : value.forEach(collect);
  collect(feature.geometry.coordinates);
  const lon = coordinates.reduce((sum, item) => sum + item[0], 0) / coordinates.length;
  const lat = coordinates.reduce((sum, item) => sum + item[1], 0) / coordinates.length;
  return project([lon, lat], mapBox);
};

function highlightedMap() {
  const fills = [
    ["Aceh", "#58b7b0"], ["Dki Jakarta", "#f36f61"], ["Jawa Timur", "#3d91bd"],
    ["Kalimantan Timur", "#7b6fc2"], ["Sulawesi Selatan", "#087f73"]
  ].map(([name, color]) => `<path d="${featuresPath(province(name), mapBox)}" fill="${color}" class="outline"/>`).join("\n  ");
  const labels = ["Kota Medan", "Kota Jakarta Pusat", "Kota Surabaya", "Kota Balikpapan", "Kota Makassar"].map((name, index) => {
    const [x, y] = place(name);
    const label = name.replace("Kota ", "").replace("Jakarta Pusat", "Jakarta");
    const right = index === 3 || index === 4;
    return `<g><circle class="pin" cx="${x}" cy="${y}" r="7"/><text class="label" x="${x + (right ? -12 : 12)}" y="${y - 10}" text-anchor="${right ? "end" : "start"}">${label}</text></g>`;
  }).join("\n  ");
  return svg("Highlighted Indonesia regions and cities", "An illustrative Indonesia map using repository geometry, with five cities and several color treatments.", `
  <rect width="900" height="430" rx="22" fill="#f0f9f8"/>
  <path d="${all}" fill="#d7ece9" stroke="#a8cfca" stroke-width=".6"/>
  ${fills}
  ${labels}
  <g transform="translate(690 350)"><rect width="180" height="58" rx="12" fill="#fff" stroke="#c9dede"/><circle cx="20" cy="20" r="6" fill="#087f73"/><text class="small" x="34" y="24">Highlighted</text><circle cx="20" cy="40" r="6" fill="#d7ece9"/><text class="small" x="34" y="44">Other regions</text></g>`);
}

function spreadsheetMap() {
  const box = { x: 410, y: 55, width: 455, height: 270 };
  const base = featuresPath(geojson.features, box);
  const fills = [["Sumatera Utara", "#f36f61"], ["Jawa Timur", "#3d91bd"], ["Jawa Barat", "#78bdb6"], ["Sulawesi Selatan", "#087f73"], ["Papua", "#f5a36c"]]
    .map(([name, color]) => `<path d="${featuresPath(province(name), box)}" fill="${color}" class="outline"/>`).join("\n  ");
  return svg("Spreadsheet transformed into an Indonesia map", "Synthetic region values in a table point to a color-coded map made from repository geometry.", `
  <rect width="900" height="430" rx="22" fill="#f5fafc"/>
  <g transform="translate(28 64)"><rect width="260" height="230" rx="14" fill="#fff" stroke="#b8c9d3"/><rect width="260" height="42" rx="14" fill="#e6f2f2"/><text class="label" x="18" y="27">Region</text><text class="label" x="154" y="27">Value</text><text class="small" x="18" y="72">Jakarta</text><text class="small" x="170" y="72">120</text><text class="small" x="18" y="112">Surabaya</text><text class="small" x="170" y="112">80</text><text class="small" x="18" y="152">Bandung</text><text class="small" x="170" y="152">60</text><text class="small" x="18" y="192">Makassar</text><text class="small" x="170" y="192">70</text><path d="M0 88H260M0 128H260M0 168H260" stroke="#e2e9ee"/></g>
  <path d="M315 180h58m-18-18 18 18-18 18" fill="none" stroke="#087f73" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${base}" fill="#dce8ec" stroke="#fff" stroke-width=".5"/>
  ${fills}
  <g transform="translate(664 338)"><rect width="205" height="68" rx="12" fill="#fff" stroke="#c8d8de"/><rect x="16" y="15" width="13" height="13" rx="2" fill="#f36f61"/><text class="small" x="38" y="26">High (100+)</text><rect x="16" y="39" width="13" height="13" rx="2" fill="#78bdb6"/><text class="small" x="38" y="50">Medium (50–99)</text></g>`);
}

function territoryMap() {
  const colors = ["#4aa6a0", "#3d91bd", "#f5a36c", "#7b6fc2"];
  const groups = [[], [], [], []];
  geojson.features.forEach((feature) => {
    const coordinates = [];
    const collect = (value) => typeof value[0] === "number" ? coordinates.push(value) : value.forEach(collect);
    collect(feature.geometry.coordinates);
    const lon = coordinates.reduce((sum, item) => sum + item[0], 0) / coordinates.length;
    groups[lon < 105 ? 0 : lon < 116 ? 1 : lon < 127 ? 2 : 3].push(feature);
  });
  return svg("Illustrative sales territories across Indonesia", "Repository geometry grouped into four illustrative, not-yet-available territory teams.", `
  <rect width="900" height="430" rx="22" fill="#f5fafc"/>
  ${groups.map((group, index) => `<path d="${featuresPath(group, mapBox)}" fill="${colors[index]}" class="outline"/>`).join("\n  ")}
  <g transform="translate(60 355)">${["Team West", "Team Central", "Team North", "Team East"].map((label, index) => `<rect x="${index * 195}" width="14" height="14" rx="3" fill="${colors[index]}"/><text class="small" x="${index * 195 + 22}" y="12">${label}</text>`).join("")}</g>
  <text class="small" x="450" y="410" text-anchor="middle">Illustrative territory groups · Coming soon</text>`);
}

function coverageMap() {
  return svg("Illustrative Indonesia coverage analysis", "An accurate Indonesia outline with illustrative coverage markers and a low-to-high legend.", `
  <rect width="900" height="430" rx="22" fill="#f6fafc"/>
  <path d="${all}" fill="#d9ecea" stroke="#fff" stroke-width=".6"/>
  <g fill="#087f73">${[[190,160,44,.18],[330,225,58,.3],[500,175,70,.42],[620,245,50,.28],[755,185,76,.5]].map(([x,y,r,o]) => `<circle cx="${x}" cy="${y}" r="${r}" opacity="${o}"/><circle cx="${x}" cy="${y}" r="7"/>`).join("")}</g>
  <g transform="translate(660 345)"><text class="small" x="0" y="13">Low</text><rect x="35" width="150" height="16" rx="8" fill="url(#coverage)"/><text class="small" x="195" y="13">High</text></g>
  <defs><linearGradient id="coverage"><stop stop-color="#cfe7e4"/><stop offset="1" stop-color="#087f73"/></linearGradient></defs>
  <text class="small" x="450" y="410" text-anchor="middle">Illustrative coverage only · Coming soon</text>`);
}

function mapTreatments() {
  const left = { x: 25, y: 50, width: 370, height: 210 };
  const right = { x: 475, y: 50, width: 370, height: 210 };
  const vibrant = [["Aceh", "#087f73"], ["Jawa Timur", "#f36f61"], ["Sulawesi Selatan", "#7b6fc2"]];
  const soft = [["Aceh", "#7fc4be"], ["Jawa Timur", "#f7ad9e"], ["Sulawesi Selatan", "#aaa1d7"]];
  return svg("Vibrant and soft map treatments", "The same accurate Indonesia map shown with vibrant and soft presentation styles.", `
  <rect width="900" height="340" rx="20" fill="#fff"/>
  <text class="label" x="25" y="30">Vibrant</text><text class="label" x="475" y="30">Soft</text>
  <path d="${featuresPath(geojson.features, left)}" fill="#dce9e8" stroke="#fff" stroke-width=".4"/>
  ${vibrant.map(([name,color]) => `<path d="${featuresPath(province(name), left)}" fill="${color}"/>`).join("")}
  <path d="${featuresPath(geojson.features, right)}" fill="#edf3f3" stroke="#fff" stroke-width=".4"/>
  ${soft.map(([name,color]) => `<path d="${featuresPath(province(name), right)}" fill="${color}"/>`).join("")}
  <text class="small" x="25" y="310">Clear contrast for presentations</text><text class="small" x="475" y="310">Quiet tones for reports</text>`, "0 0 900 340");
}

function spreadsheetOutput() {
  const fills = [["Sumatera Utara", "#f36f61"], ["Jawa Timur", "#f36f61"], ["Jawa Barat", "#78bdb6"], ["Sulawesi Selatan", "#78bdb6"], ["Kalimantan Barat", "#b8d9d5"], ["Papua", "#3d91bd"]]
    .map(([name, color]) => `<path d="${featuresPath(province(name), mapBox)}" fill="${color}" class="outline"/>`).join("");
  return svg("Synthetic spreadsheet map example", "A color-coded Indonesia map with synthetic High, Medium, and Low groups.", `
  <rect width="900" height="430" rx="22" fill="#fff"/>
  <path d="${all}" fill="#dce8ec" stroke="#fff" stroke-width=".5"/>${fills}
  <g transform="translate(650 330)"><rect width="220" height="78" rx="12" fill="#fff" stroke="#c8d8de"/><rect x="16" y="14" width="14" height="14" rx="2" fill="#f36f61"/><text class="small" x="40" y="26">High</text><rect x="16" y="34" width="14" height="14" rx="2" fill="#78bdb6"/><text class="small" x="40" y="46">Medium</text><rect x="16" y="54" width="14" height="14" rx="2" fill="#b8d9d5"/><text class="small" x="40" y="66">Low</text></g>`);
}

const files = {
  "hero-highlight-regions.svg": highlightedMap(),
  "hero-map-spreadsheet.svg": spreadsheetMap(),
  "hero-sales-territories.svg": territoryMap(),
  "hero-coverage-analysis.svg": coverageMap(),
  "highlight-map-styles.svg": mapTreatments(),
  "spreadsheet-example-output.svg": spreadsheetOutput()
};

fs.mkdirSync(outputDir, { recursive: true });
for (const [name, contents] of Object.entries(files)) {
  const target = path.join(outputDir, name);
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== contents) throw new Error(`${name} is not deterministic; regenerate public illustrations.`);
  } else {
    fs.writeFileSync(target, contents);
  }
}
console.log(`${check ? "Verified" : "Generated"} ${Object.keys(files).length} deterministic public map illustrations.`);
