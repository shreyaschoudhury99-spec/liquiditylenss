const app = document.getElementById("app");
const toastRoot = document.getElementById("toastRoot");
const modalRoot = document.getElementById("modalRoot");

const routes = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/connect": "Connect Store",
  "/forecasts": "Forecasts",
  "/inventory": "Inventory",
  "/marketplace": "Marketplace",
  "/pricing": "Pricing",
  "/how-it-connects": "How It Connects",
  "/why-liquiditylens": "Why LiquidityLens",
  "/community": "Community",
  "/reports": "Reports",
  "/profile": "Profile",
};
const authRoutes = new Set(["/login", "/reset-password"]);
const publicRoutes = new Set(["/pricing", "/how-it-connects", "/why-liquiditylens"]);

const navItems = [
  ["/", "Dashboard", "layout-dashboard"],
  ["/connect", "Connect Store", "plug"],
  ["/forecasts", "Forecasts", "chart-line"],
  ["/inventory", "Inventory", "boxes"],
  ["/marketplace", "Marketplace", "store"],
  ["/community", "Community", "messages"],
  ["/reports", "Reports", "file-text"],
  ["/profile", "Profile", "user"],
];

const skuData = [
  { id: 1, product: "Trail Running Shoes M10", sku: "TRS-M10", current: 84, forecast: 312, stockout: 91, overstock: 2, action: "buy" },
  { id: 2, product: "Insulated Water Bottle 32oz", sku: "IWB-32", current: 512, forecast: 189, stockout: 3, overstock: 78, action: "sell" },
  { id: 3, product: "Trail Socks 3-Pack M", sku: "TS3-M", current: 203, forecast: 218, stockout: 34, overstock: 12, action: "hold" },
  { id: 4, product: "Merino Base Layer L", sku: "MBL-L", current: 47, forecast: 198, stockout: 88, overstock: 1, action: "buy" },
  { id: 5, product: "Trekking Poles Pair", sku: "TPP-01", current: 29, forecast: 41, stockout: 62, overstock: 5, action: "transfer" },
  { id: 6, product: "Packable Rain Jacket S", sku: "PRJ-S", current: 387, forecast: 102, stockout: 1, overstock: 89, action: "sell" },
  { id: 7, product: "Camping Cookset Compact", sku: "CCC-01", current: 156, forecast: 149, stockout: 18, overstock: 22, action: "hold" },
  { id: 8, product: "Headlamp 350 Lumen", sku: "HL-350", current: 22, forecast: 87, stockout: 79, overstock: 0, action: "buy" },
  { id: 9, product: "Fleece Pullover XL", sku: "FPX-XL", current: 441, forecast: 88, stockout: 2, overstock: 94, action: "sell" },
  { id: 10, product: "Dry Bag 10L", sku: "DB-10L", current: 63, forecast: 71, stockout: 28, overstock: 14, action: "transfer" },
  { id: 11, product: "Hiking Boot W8", sku: "HB-W8", current: 18, forecast: 95, stockout: 86, overstock: 0, action: "buy" },
  { id: 12, product: "Camp Towel Large", sku: "CTL-01", current: 298, forecast: 71, stockout: 1, overstock: 81, action: "sell" },
];

const forecastData = [
  { week: "Wk 1", arima: 158000, xgboost: 168000, ensemble: 163000, lower: 148000, upper: 178000 },
  { week: "Wk 2", arima: 162000, xgboost: 172000, ensemble: 167000, lower: 152000, upper: 182000 },
  { week: "Wk 3", arima: 165000, xgboost: 178000, ensemble: 172000, lower: 155000, upper: 189000 },
  { week: "Wk 4", arima: 168000, xgboost: 183000, ensemble: 175000, lower: 158000, upper: 192000 },
  { week: "Wk 5", arima: 170000, xgboost: 187000, ensemble: 179000, lower: 162000, upper: 196000 },
  { week: "Wk 6", arima: 171000, xgboost: 190000, ensemble: 181000, lower: 163000, upper: 199000 },
  { week: "Wk 7", arima: 172000, xgboost: 192000, ensemble: 183000, lower: 165000, upper: 201000 },
  { week: "Wk 8", arima: 172900, xgboost: 189700, ensemble: 184200, lower: 166000, upper: 202000 },
];

const monteCarloData = [
  { outcome: -30, probability: 2 }, { outcome: -20, probability: 5 }, { outcome: -10, probability: 11 },
  { outcome: 0, probability: 19 }, { outcome: 10, probability: 25 }, { outcome: 20, probability: 21 },
  { outcome: 30, probability: 13 }, { outcome: 40, probability: 8 }, { outcome: 50, probability: 5 },
  { outcome: 60, probability: 3 }, { outcome: 70, probability: 4 }, { outcome: 80, probability: 6 },
  { outcome: 90, probability: 7 }, { outcome: 100, probability: 5 },
];

const seasonalData = [
  { month: "Jan", demand: 142000 }, { month: "Feb", demand: 138000 }, { month: "Mar", demand: 156000 },
  { month: "Apr", demand: 168000 }, { month: "May", demand: 175000 }, { month: "Jun", demand: 162000 },
  { month: "Jul", demand: 158000 }, { month: "Aug", demand: 172000 }, { month: "Sep", demand: 181000 },
  { month: "Oct", demand: 195000 }, { month: "Nov", demand: 210000 }, { month: "Dec", demand: 225000 },
];

const providerFields = {
  shopify: [{ label: "Storefront URL", type: "text", placeholder: "yourstore.myshopify.com" }, { label: "Admin API Key", type: "password", placeholder: "shpat_..." }],
  square: [{ label: "Location ID", type: "text", placeholder: "LXXXXXXXXXXXXXXXXX" }, { label: "Access Token", type: "password", placeholder: "EAAAl..." }],
  lightspeed: [{ label: "Account ID", type: "text", placeholder: "12345" }, { label: "API Key", type: "password", placeholder: "ls_key_..." }],
  clover: [{ label: "Merchant ID", type: "text", placeholder: "MXXXXXXXXXX" }, { label: "Auth Token", type: "password", placeholder: "clv_..." }],
  netsuite: [{ label: "Account ID", type: "text", placeholder: "1234567" }, { label: "Consumer Key", type: "password", placeholder: "ns_key_..." }, { label: "Consumer Secret", type: "password", placeholder: "ns_sec_..." }],
  sap: [{ label: "System URL", type: "url", placeholder: "https://your-sap-system.com" }, { label: "Client ID", type: "text", placeholder: "client_id_..." }, { label: "Client Secret", type: "password", placeholder: "client_sec_..." }],
  csv: null,
  salesRecords: loadStoredJson("ll_sales_records", []),
  transferRecords: loadStoredJson("ll_transfer_records", []),
  connectionStatus: loadStoredJson("ll_connection_status", {
    csv: { status: "not connected", detail: "Upload a CSV with SKU, date, quantity sold, and location." },
    shopify: { status: "needs setup", detail: "Shopify OAuth app credentials are not configured in this demo build." },
    square: { status: "needs setup", detail: "Square OAuth app credentials are not configured in this demo build." },
  }),
  skuSettings: loadStoredJson("ll_sku_settings", {}),
};

const listings = [
  { id: 1, retailer: "Midwest Outdoor Co.", dist: 38, type: "excess", cat: "footwear", product: "Trail Running Shoes", qty: 240, price: 42, urgency: "high" },
  { id: 2, retailer: "Prairie City Retail", dist: 22, type: "shortage", cat: "outdoor", product: "Trekking Poles", qty: 60, price: 28, urgency: "high" },
  { id: 3, retailer: "Lakefront Goods", dist: 55, type: "excess", cat: "home", product: "Insulated Bottles", qty: 180, price: 18, urgency: "medium" },
  { id: 4, retailer: "Bluff Road Supply", dist: 71, type: "shortage", cat: "footwear", product: "Hiking Boots W8", qty: 45, price: 89, urgency: "high" },
  { id: 5, retailer: "River Valley Sports", dist: 14, type: "excess", cat: "outdoor", product: "Packable Rain Jacket", qty: 320, price: 31, urgency: "low" },
  { id: 6, retailer: "Cornerstone Retail", dist: 88, type: "shortage", cat: "outdoor", product: "Camp Cookset", qty: 90, price: 44, urgency: "medium" },
  { id: 7, retailer: "Great Plains Co-op", dist: 43, type: "excess", cat: "footwear", product: "Trail Socks 3-Pack", qty: 500, price: 9, urgency: "low" },
  { id: 8, retailer: "Northfield Outfitters", dist: 19, type: "shortage", cat: "home", product: "Camp Towel Large", qty: 75, price: 22, urgency: "medium" },
];

const starters = {
  "inventory-swap": "Looking for partners with excess [product] before next weekend. Anyone in the Midwest region?",
  "bulk-buy": "Interested in coordinating a bulk order for fall outerwear to reduce per-unit cost. Who's in?",
  "delivery-route": "Does anyone have a shared delivery route to the Twin Cities area? Looking to split shipping cost.",
  pricing: "How are others handling end-of-season markdowns on outerwear this year? Looking to avoid the usual 40% off.",
};

let state = {
  path: location.pathname in routes ? location.pathname : "/",
  authReady: false,
  authMode: location.pathname === "/reset-password" ? "reset" : "signin",
  authUser: null,
  accessToken: null,
  authBusy: false,
  authMessage: "",
  loading: true,
  syncing: false,
  sidebarOpen: false,
  search: "",
  searchOpen: false,
  highlightedSku: Number(sessionStorage.getItem("ll_highlight_sku")) || null,
  riskScore: 76,
  revenueRisk: 684000,
  lastUpdated: "Updated 14m ago",
  refreshing: false,
  selectedProvider: "shopify",
  checklist: { pos: true, categories: true, sales: false, inventory: false, analysis: false },
  providerBusy: false,
  checklistBusy: "",
  csv: null,
  inventoryFilter: "",
  actionFilter: "all",
  typeFilter: "all",
  catFilter: "all",
  distFilter: 100,
  selectedRetailer: listings[0],
  messageSent: "",
  marketplaceBusy: false,
  selectedTopic: null,
  posts: [
    { id: 1, author: "Prairie City Retail", topic: "inventory-swap", time: "2h ago", text: "Has excess insulated bottles. 180 units at $18. Anyone need?" },
    { id: 2, author: "River Valley Sports", topic: "bulk-buy", time: "5h ago", text: "Coordinating a bulk rain jacket order for Q4. Reply if interested." },
    { id: 3, author: "Midwest Outdoor Co.", topic: "delivery-route", time: "1d ago", text: "Running a route to Milwaukee Thursday. Happy to include transfers." },
    { id: 4, author: "Lakefront Goods", topic: "pricing", time: "2d ago", text: "Using 25% markdown on trail shoes. Any data on demand recovery?" },
  ],
  postBusy: false,
  notificationsOpen: false,
  notifications: [
    { id: 1, type: "warning", text: "Running shoes M10 at 8% stock. Transfer recommended.", time: "2m ago", read: false },
    { id: 2, type: "success", text: "Midwest Outdoor Co. accepted your transaction request.", time: "1h ago", read: false },
    { id: 3, type: "info", text: "Weekly demand forecast updated. Risk score changed 68 to 76.", time: "3h ago", read: true },
  ],
  reportBusy: false,
  profileBusy: false,
  passwordBusy: false,
  mfaChallengeId: "",
  mfaMethod: "",
  mfaDestination: "",
  mfaRedirectTo: "",
  mfaSetupBusy: false,
  mfaSetupChallengeId: "",
  mfaSetupMethod: "email",
  mfaSetupDestination: "",
};

function icon(name) {
  const paths = {
    "layout-dashboard": '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M7 8h10v4a5 5 0 0 1-10 0Z"/>',
    "chart-line": '<path d="M3 3v18h18"/><path d="m6 16 4-5 4 3 5-8"/>',
    boxes: '<path d="m7 16 5 3 5-3"/><path d="m7 8 5-3 5 3v8l-5 3-5-3Z"/><path d="m7 8 5 3 5-3"/><path d="M12 11v8"/>',
    store: '<path d="M4 10h16l-1-6H5Z"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    messages: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
    "file-text": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.8 1c-.6 1.2-2 1.5-2.5 2.7"/><path d="M12 17h.01"/>',
    signout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    "eye-off": '<path d="m3 3 18 18"/><path d="M10.6 10.6a3 3 0 0 0 4.2 4.2"/><path d="M9.9 4.2A10.4 10.4 0 0 1 12 4.0c6.5 0 10 8 10 8a18.4 18.4 0 0 1-3.2 4.4"/><path d="M6.6 6.6A18.8 18.8 0 0 0 2 12s3.5 8 10 8c1.5 0 2.8-.3 4-.8"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z"/><path d="m9 12 2 2 4-5"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
}

function logo() {
  return `<div class="logo"><svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><rect x="4" y="6" width="8" height="16" rx="4" fill="var(--accent)" opacity="0.9"/><rect x="10" y="6" width="8" height="16" rx="4" fill="var(--accent)" opacity="0.5"/><rect x="16" y="6" width="8" height="16" rx="4" fill="var(--accent)" opacity="0.9"/></svg><span class="logo-title">LiquidityLens</span></div>`;
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function attr(value) {
  return esc(value).replaceAll("\n", "&#10;");
}

function fmt(value) {
  return Number(value).toLocaleString("en-US");
}

function loadStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStoredJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function activeSkuData() {
  if (!state.salesRecords.length) return skuData;
  const bySku = new Map();
  state.salesRecords.forEach(row => {
    const item = bySku.get(row.sku) || {
      id: bySku.size + 1,
      product: row.sku,
      sku: row.sku,
      current: 0,
      forecast: 0,
      stockout: 0,
      overstock: 0,
      action: "hold",
      locations: {},
      history: [],
    };
    item.history.push(row);
    item.locations[row.location] = item.locations[row.location] || { sold: 0, current: 0 };
    item.locations[row.location].sold += row.quantity;
    bySku.set(row.sku, item);
  });
  return [...bySku.values()].map(item => {
    const totalSold = item.history.reduce((sum, row) => sum + row.quantity, 0);
    const days = Math.max(7, distinctDays(item.history).length);
    const avgDaily = totalSold / days;
    const forecast = Math.max(1, Math.round(avgDaily * 56));
    const locationCount = Math.max(1, Object.keys(item.locations).length);
    Object.entries(item.locations).forEach(([location, value], index) => {
      const multiplier = index % 2 === 0 ? 0.45 : 2.1;
      value.current = Math.max(0, Math.round((value.sold / days) * 18 * multiplier));
    });
    state.transferRecords.filter(t => t.status === "received" && t.sku === item.sku).forEach(t => {
      item.locations[t.from] = item.locations[t.from] || { sold: 0, current: 0 };
      item.locations[t.to] = item.locations[t.to] || { sold: 0, current: 0 };
      item.locations[t.from].current = Math.max(0, item.locations[t.from].current - t.quantity);
      item.locations[t.to].current += t.quantity;
    });
    const current = Math.max(1, Object.values(item.locations).reduce((sum, location) => sum + location.current, 0));
    const stockout = Math.max(0, Math.min(99, Math.round(((forecast - current) / Math.max(forecast, 1)) * 100)));
    const overstock = Math.max(0, Math.min(99, Math.round(((current - forecast) / Math.max(forecast, 1)) * 100)));
    const action = stockout > 55 ? "buy" : overstock > 55 ? "sell" : transferSuggestionsForSku(item, forecast).length ? "transfer" : "hold";
    return { ...item, current, forecast, stockout, overstock, action };
  });
}

function distinctDays(rows) {
  return [...new Set(rows.map(row => row.date))];
}

function skuSettings(sku) {
  return { leadTime: 14, safetyStock: 7, ...(state.skuSettings[sku] || {}) };
}

function reorderSuggestion(sku) {
  const settings = skuSettings(sku.sku);
  const dailyDemand = Math.max(1, sku.forecast / 56);
  const needed = Math.ceil(dailyDemand * (settings.leadTime + settings.safetyStock));
  const quantity = Math.max(0, needed - sku.current);
  const orderBy = new Date(Date.now() + Math.max(0, Math.round((sku.current / dailyDemand) - settings.leadTime)) * 86400000);
  return {
    quantity,
    orderBy: orderBy.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    reason: `Lead time ${settings.leadTime} days, safety stock ${settings.safetyStock} days, forecast ${Math.round(dailyDemand)} units/day.`,
  };
}

function transferSuggestions() {
  return activeSkuData().flatMap(sku => transferSuggestionsForSku(sku, sku.forecast).map(s => ({ ...s, sku: sku.sku, product: sku.product }))).slice(0, 8);
}

function transferSuggestionsForSku(sku, forecast) {
  const locations = Object.entries(sku.locations || {});
  if (locations.length < 2) return [];
  const daily = Math.max(1, forecast / 56 / locations.length);
  const shortages = locations.filter(([, v]) => v.current < daily * 10);
  const excess = locations.filter(([, v]) => v.current > daily * 28);
  return shortages.flatMap(([to, short]) => excess.map(([from, rich]) => ({
    from,
    to,
    quantity: Math.max(1, Math.min(Math.round(daily * 14 - short.current), Math.round(rich.current - daily * 21))),
    reason: `${to} covers ${Math.round(short.current / daily)} days; ${from} has ${Math.round(rich.current / daily)} days on hand.`,
  }))).filter(s => s.quantity > 0);
}

function forecastSeriesForSku(sku) {
  const rows = [...(sku.history || [])].sort((a, b) => a.date.localeCompare(b.date));
  if (!rows.length) return [];
  const byDay = new Map();
  rows.forEach(row => byDay.set(row.date, (byDay.get(row.date) || 0) + row.quantity));
  const points = [...byDay.entries()].slice(-8).map(([date, sold], i) => ({ label: `D${i + 1}`, history: sold }));
  const avg = points.reduce((sum, p) => sum + p.history, 0) / Math.max(1, points.length);
  return [
    ...points.map(p => ({ ...p, prediction: null, lower: null, upper: null })),
    ...Array.from({ length: 6 }, (_, i) => {
      const prediction = Math.max(1, Math.round(avg * (1 + i * 0.03)));
      return { label: `F${i + 1}`, history: null, prediction, lower: Math.round(prediction * 0.78), upper: Math.round(prediction * 1.22) };
    }),
  ];
}

function auth() {
  return state.authUser;
}

function canUseAppRoutes() {
  return location.protocol !== "file:";
}

function authUnavailableMessage() {
  return "Auth is not running yet. Do not open index.html directly; start the Express backend, open http://localhost:4174, add a .env file, connect Postgres, and add Google/Microsoft OAuth credentials.";
}

function replacePath(path) {
  if (!canUseAppRoutes()) return;
  try {
    history.replaceState({}, "", path);
  } catch (err) {
    console.warn("Could not update browser path:", err);
  }
}

function pushPath(path) {
  if (!canUseAppRoutes()) return;
  try {
    history.pushState({}, "", path);
  } catch (err) {
    console.warn("Could not update browser path:", err);
  }
}

function currentTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function setTheme(next) {
  const theme = next === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("ll_theme", theme);
  render();
}

function toggleTheme() {
  setTheme(currentTheme() === "light" ? "dark" : "light");
}

function navigate(path) {
  if (!(path in routes)) path = "/";
  pushPath(path);
  state.path = path;
  state.loading = true;
  state.searchOpen = false;
  state.notificationsOpen = false;
  state.sidebarOpen = false;
  render();
  setTimeout(() => {
    state.loading = false;
    render();
    if (state.path === "/forecasts") requestAnimationFrame(drawForecastCharts);
    if (state.path === "/inventory") scrollHighlighted();
  }, 900);
}

function goToAuth(mode = "signin", message = "") {
  state.authMode = mode;
  state.authMessage = message;
  state.authBusy = false;
  replacePath(mode === "reset" ? "/reset-password" : "/login");
  state.path = "/";
  render();
}

function clearMfaState() {
  state.mfaChallengeId = "";
  state.mfaMethod = "";
  state.mfaDestination = "";
  state.mfaRedirectTo = "";
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="mono">${type === "success" ? "✓" : type === "error" ? "✕" : "●"}</span><span>${esc(message)}</span>`;
  toastRoot.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 180);
  }, 3500);
}

function spinner(label) {
  return `<span class="spinner" aria-hidden="true"></span><span>${label}</span>`;
}

function layout(content) {
  const unread = state.notifications.some(n => !n.read);
  return `
    ${state.sidebarOpen ? `<div class="drawer-overlay" data-close-sidebar></div>` : ""}
    <aside class="sidebar ${state.sidebarOpen ? "open" : ""}">
      <div class="sidebar-top">${logo()}</div>
      <div class="store-row"><div class="store-name">Northstar Retail</div><div class="online"><span class="dot"></span>online</div></div>
      <nav class="sidebar-nav" aria-label="Primary">${navItems.map(([path, label, name]) => `<a href="${path}" class="nav-link ${state.path === path ? "active" : ""}" data-route="${path}"><span class="nav-icon">${icon(name)}</span>${label}</a>`).join("")}</nav>
      <div class="sidebar-bottom">
        <button class="btn-icon bottom-link" data-how type="button">${icon("help")}<span>How this works</span></button>
        <button class="btn-icon bottom-link" data-signout type="button">${icon("signout")}<span>Sign out</span></button>
      </div>
    </aside>
    <header class="topbar">
      <button class="btn-icon hamburger" data-menu type="button" aria-label="Open navigation">${icon("menu")}</button>
      <div class="breadcrumb">${routes[state.path]}</div>
      <div class="topbar-actions">
        <div class="topbar-search">
          <input class="input" data-global-search type="search" value="${esc(state.search)}" placeholder="Search products, partners..." aria-label="Search products and partners" />
          ${state.searchOpen ? searchDropdown() : ""}
        </div>
        <div class="notification-wrap">
          <button class="btn-icon" data-notifications type="button" aria-label="Notifications">${icon("bell")}${unread ? '<span class="unread-dot"></span>' : ""}</button>
          ${state.notificationsOpen ? notificationsPanel() : ""}
        </div>
        <button class="btn-icon" data-theme type="button" aria-label="Switch to ${currentTheme() === "light" ? "dark" : "light"} theme">${icon(currentTheme() === "light" ? "moon" : "sun")}</button>
        <button class="btn-ghost" data-download type="button" ${state.reportBusy ? "disabled" : ""}>${state.reportBusy ? spinner("Exporting...") : `${icon("file-text")}<span class="download-label">Download report</span>`}</button>
        <div class="avatar" aria-label="Northstar Retail">NR</div>
      </div>
    </header>
    <main class="main ${state.syncing ? "syncing" : ""}">${content}</main>
  `;
}

function searchDropdown() {
  const q = state.search.toLowerCase().trim();
  if (!q) return "";
  const matches = activeSkuData().filter(s => s.product.toLowerCase().includes(q) || s.sku.toLowerCase().includes(q)).slice(0, 6);
  return `<div class="search-dropdown">${matches.length ? matches.map(s => `<button class="search-item" data-search-sku="${s.id}" type="button"><span>${esc(s.product)}<br><span class="muted mono">${s.sku}</span></span><span class="badge badge--${s.action}">${s.action}</span></button>`).join("") : `<div class="empty-state">No products match. Try a different name or SKU.</div>`}</div>`;
}

function notificationsPanel() {
  return `<div class="notification-panel">
    <div class="notification-head"><strong>Notifications</strong><button class="btn-ghost" data-mark-read type="button">Mark all read</button></div>
    ${state.notifications.map(n => `<div class="notification-item ${n.read ? "" : "unread"}"><span class="dot" style="background: var(--${n.type === "warning" ? "yellow" : n.type === "success" ? "green" : "accent"})"></span><div>${esc(n.text)}<span class="notification-time">${n.time}</span></div></div>`).join("")}
  </div>`;
}

function loginPage() {
  const mode = state.authMode;
  const isReset = mode === "reset";
  const title = ({ signin: "Sign in to LiquidityLens", signup: "Create your LiquidityLens account", forgot: "Reset your password", reset: "Choose a new password", mfa: "Enter your verification code" })[mode];
  const copy = ({ signin: "Use your work account or continue with a connected identity provider.", signup: "Start with a secure workspace account for your retail team.", forgot: "Enter your email and we will send a reset link if an account exists.", reset: "Your new password must meet the production password policy.", mfa: `We sent a 6-digit code to ${state.mfaDestination || "your saved verification method"}.` })[mode];
  return `<section class="auth-page">
    <aside class="auth-left">
      <div class="auth-copy">
        ${logo()}
        <h1 class="text-2xl">Inventory decisions, before the problem.</h1>
        <p>Connect your POS, get an 8-week forecast, and act on SKU-level recommendations.</p>
        <div class="feature-list">
          <div class="feature-row">${icon("plug")} POS and ERP connections</div>
          <div class="feature-row">${icon("chart-line")} Demand forecasting with confidence bands</div>
          <div class="feature-row">${icon("store")} Nearby transfer marketplace</div>
        </div>
      </div>
      <div class="auth-slideshow" aria-label="Product feature preview">
        ${demoSlides()}
      </div>
      <p class="mono text-sm">Northstar Retail demo workspace</p>
    </aside>
    <main class="auth-right">
      <button class="btn-icon auth-theme" data-theme type="button" aria-label="Switch to ${currentTheme() === "light" ? "dark" : "light"} theme">${icon(currentTheme() === "light" ? "moon" : "sun")}</button>
      <section class="auth-form" aria-live="polite">
        <p class="eyebrow">Secure retailer access</p>
        <h2 class="text-xl">${title}</h2>
        <p>${copy}</p>
        ${!isReset && !["forgot", "mfa"].includes(mode) ? `<div class="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button class="auth-tab ${mode === "signin" ? "active" : ""}" data-auth-mode="signin" type="button">Sign in</button>
          <button class="auth-tab ${mode === "signup" ? "active" : ""}" data-auth-mode="signup" type="button">Sign up</button>
        </div>
        <div class="social-grid">
          ${socialButton("google", "Google")}
          ${socialButton("microsoft", "Microsoft")}
        </div>
        <div class="auth-divider"><span>or use email</span></div>` : ""}
        ${authForm(mode)}
        ${!canUseAppRoutes() ? `<p class="auth-message auth-message--warning">${esc(authUnavailableMessage())}</p>` : ""}
        ${state.authMessage ? `<p class="auth-message">${esc(state.authMessage)}</p>` : ""}
      </section>
    </main>
  </section>`;
}

function publicPage(kind) {
  const pages = {
    "/pricing": ["Pricing", "Start with CSV forecasting, then add managed integrations as your operations mature.", pricingContent()],
    "/how-it-connects": ["How It Connects", "Upload CSV data today. Shopify and Square are staged as provider-backed integrations.", howItConnectsContent()],
    "/why-liquiditylens": ["Why LiquidityLens", "Inventory intelligence you can start in an afternoon instead of a months-long enterprise rollout.", whyContent()],
  };
  const [title, copy, content] = pages[kind] || pages["/why-liquiditylens"];
  return `<main class="public-site">
    <header class="public-nav">${logo()}<nav><a href="/why-liquiditylens" data-route="/why-liquiditylens">Why</a><a href="/how-it-connects" data-route="/how-it-connects">Connections</a><a href="/pricing" data-route="/pricing">Pricing</a><a href="/login">Sign in</a></nav></header>
    <section class="public-hero"><h1>${title}</h1><p>${copy}</p><a class="btn-primary" href="/login">Start with your data</a></section>
    ${content}
  </main>`;
}

function pricingContent() {
  return `<section class="pricing-grid">
    ${pricingCard("Starter", "$0", "CSV upload, forecast dashboard, reorder CSV export, and transfer suggestions for one workspace.")}
    ${pricingCard("Growth", "$49/mo", "Scheduled imports, team roles, saved settings, and managed onboarding for Shopify or Square.")}
    ${pricingCard("Enterprise", "Contact us", "Multi-brand deployments, SSO, custom integrations, audit exports, and dedicated support.")}
  </section>`;
}

function pricingCard(name, price, copy) {
  return `<article class="card pricing-card"><p class="eyebrow">${name}</p><h2>${price}</h2><p>${copy}</p></article>`;
}

function howItConnectsContent() {
  return `<section class="public-band"><div class="connection-status-grid">
    ${publicIntegration("CSV upload", "Built now", "Upload SKU, date, quantity sold, and location columns to populate forecasts.")}
    ${publicIntegration("Shopify", "Provider setup required", "OAuth shell is planned; credentials and Admin API scopes still need production setup.")}
    ${publicIntegration("Square", "Provider setup required", "Connection status is modeled; production OAuth wiring is the next backend step.")}
  </div></section>`;
}

function publicIntegration(name, status, copy) {
  return `<article class="card connection-card"><span class="badge badge--info">${status}</span><h2 class="text-lg">${name}</h2><p>${copy}</p></article>`;
}

function whyContent() {
  return `<section class="public-band grid-3">
    <article class="card"><h2 class="text-lg">Fast setup</h2><p>Start with CSV sales data instead of waiting months for an enterprise implementation.</p></article>
    <article class="card"><h2 class="text-lg">Explainable decisions</h2><p>Every risk badge includes the math behind stockout, overstock, reorder, or transfer recommendations.</p></article>
    <article class="card"><h2 class="text-lg">Transfer-first thinking</h2><p>LiquidityLens highlights when one location can solve another location's risk before you buy more inventory.</p></article>
  </section>`;
}

function socialButton(provider, label) {
  return `<button class="btn-ghost social-btn" data-social-auth="${provider}" type="button" ${state.authBusy ? "disabled" : ""} aria-label="Continue with ${label}"><span class="social-mark">${label[0]}</span>${label}</button>`;
}

function passwordField(id, name, label, autocomplete) {
  return `<div class="field"><label for="${id}">${label}</label><div class="password-wrap"><input id="${id}" class="input" name="${name}" type="password" autocomplete="${autocomplete}" /><button class="btn-icon password-toggle" data-toggle-password="${id}" type="button" aria-label="Show ${label.toLowerCase()}">${icon("eye")}</button></div></div>`;
}

function authForm(mode) {
  if (mode === "signup") {
    return `<form class="form-stack" data-auth-form="signup" novalidate>
      <div class="auth-name-grid">
        <div class="field"><label for="firstName">First name</label><input id="firstName" class="input" name="firstName" autocomplete="given-name" /></div>
        <div class="field"><label for="lastName">Last name</label><input id="lastName" class="input" name="lastName" autocomplete="family-name" /></div>
      </div>
      <div class="field"><label for="signupEmail">Work email</label><input id="signupEmail" class="input" name="email" type="email" autocomplete="email" /></div>
      ${passwordField("signupPassword", "password", "Password", "new-password")}
      ${passwordField("confirmPassword", "confirmPassword", "Confirm password", "new-password")}
      <p class="password-policy">Minimum 8 characters with uppercase, number, and special character.</p>
      <button class="btn-primary" type="submit" ${state.authBusy ? "disabled" : ""}>${state.authBusy ? spinner("Creating account...") : "Create account"}</button>
    </form>`;
  }
  if (mode === "forgot") {
    return `<form class="form-stack" data-auth-form="forgot" novalidate>
      <div class="field"><label for="forgotEmail">Work email</label><input id="forgotEmail" class="input" name="email" type="email" autocomplete="email" /></div>
      <button class="btn-primary" type="submit" ${state.authBusy ? "disabled" : ""}>${state.authBusy ? spinner("Sending...") : "Send reset link"}</button>
      <button class="btn-ghost" data-auth-mode="signin" type="button">Back to sign in</button>
    </form>`;
  }
  if (mode === "reset") {
    return `<form class="form-stack" data-auth-form="reset" novalidate>
      ${passwordField("resetPassword", "password", "New password", "new-password")}
      ${passwordField("resetConfirm", "confirmPassword", "Confirm new password", "new-password")}
      <p class="password-policy">Minimum 8 characters with uppercase, number, and special character.</p>
      <button class="btn-primary" type="submit" ${state.authBusy ? "disabled" : ""}>${state.authBusy ? spinner("Updating...") : "Update password"}</button>
    </form>`;
  }
  if (mode === "mfa") {
    return `<form class="form-stack" data-auth-form="mfa" novalidate>
      <div class="field"><label for="mfaCode">Verification code</label><input id="mfaCode" class="input" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" /></div>
      <button class="btn-primary" type="submit" ${state.authBusy ? "disabled" : ""}>${state.authBusy ? spinner("Verifying...") : "Verify and sign in"}</button>
      <button class="btn-ghost" data-auth-mode="signin" type="button">Back to sign in</button>
    </form>`;
  }
  return `<form class="form-stack" data-auth-form="signin" novalidate>
    <div class="field"><label for="email">Work email</label><input id="email" class="input" name="email" type="email" autocomplete="email" /></div>
    ${passwordField("password", "password", "Password", "current-password")}
    <button class="btn-primary" type="submit" ${state.authBusy ? "disabled" : ""}>${state.authBusy ? spinner("Signing in...") : "Sign in"}</button>
    <button class="auth-link" data-auth-mode="forgot" type="button">Forgot password?</button>
  </form>`;
}

function demoSlides() {
  const slides = [
    ["Forecast blend", "Confidence bands and model-by-model demand shifts.", forecastMockup()],
    ["SKU actions", "Buy, sell, hold, and transfer decisions at product level.", inventoryMockup()],
    ["Partner map", "Nearby retailers with matching excess or shortage signals.", marketplaceMockup()],
  ];
  return slides.map(([title, copy, art], i) => `<figure class="demo-slide demo-slide-${i + 1}">
    ${art}
    <figcaption><strong>${title}</strong><span>${copy}</span></figcaption>
  </figure>`).join("");
}

function forecastMockup() {
  return `<svg viewBox="0 0 520 250" role="img" aria-label="Forecast chart demo">
    <rect width="520" height="250" rx="8" fill="var(--bg-elevated)"/>
    ${[45, 90, 135, 180].map(y => `<line x1="40" x2="485" y1="${y}" y2="${y}" class="chart-grid"/>`).join("")}
    <path d="M45 162 C110 132 135 142 185 111 C240 78 285 118 330 86 C390 42 430 78 480 52" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"/>
    <path d="M45 185 C125 150 160 176 220 132 C280 96 320 142 380 102 C430 72 450 98 480 76" fill="none" stroke="var(--blue)" stroke-width="3" stroke-linecap="round"/>
    <circle cx="330" cy="86" r="11" fill="var(--accent)"/>
    <rect x="330" y="28" width="126" height="45" rx="6" fill="var(--bg-surface)" stroke="var(--border-default)"/>
    <text x="344" y="48" fill="var(--text-primary)">Wk 6: 181K</text>
    <text x="344" y="64" fill="var(--text-muted)">+5K vs baseline</text>
  </svg>`;
}

function inventoryMockup() {
  return `<svg viewBox="0 0 520 250" role="img" aria-label="Inventory recommendations demo">
    <rect width="520" height="250" rx="8" fill="var(--bg-elevated)"/>
    ${[
      ["Trail Running Shoes", "91% stockout", "buy", "var(--red)"],
      ["Insulated Bottle", "78% overstock", "sell", "var(--yellow)"],
      ["Dry Bag 10L", "transfer match", "transfer", "var(--blue)"],
    ].map((row, i) => {
      const y = 42 + i * 62;
      return `<rect x="34" y="${y}" width="452" height="46" rx="6" fill="var(--bg-surface)" stroke="var(--border-default)"/>
        <text x="52" y="${y + 20}" fill="var(--text-primary)">${row[0]}</text>
        <text x="52" y="${y + 35}" fill="var(--text-muted)">${row[1]}</text>
        <rect x="385" y="${y + 11}" width="74" height="24" rx="4" fill="${row[3]}" opacity=".18"/>
        <text x="422" y="${y + 28}" text-anchor="middle" fill="${row[3]}">${row[2]}</text>`;
    }).join("")}
  </svg>`;
}

function marketplaceMockup() {
  return `<svg viewBox="0 0 520 250" role="img" aria-label="Partner marketplace demo">
    <rect width="520" height="250" rx="8" fill="var(--bg-elevated)"/>
    <path d="M42 205 C112 105 170 160 238 88 C304 19 365 110 480 50" fill="none" stroke="var(--border-strong)" stroke-width="2" stroke-dasharray="6 8"/>
    ${[[252,122,"var(--accent)","Northstar"],[352,76,"var(--green)","38 mi"],[168,156,"var(--blue)","22 mi"],[410,155,"var(--yellow)","14 mi"]].map(([x,y,color,label]) => `<circle cx="${x}" cy="${y}" r="23" fill="${color}" opacity=".18"/><circle cx="${x}" cy="${y}" r="10" fill="${color}"/><text x="${x + 19}" y="${y - 13}" fill="var(--text-primary)">${label}</text>`).join("")}
    <rect x="290" y="158" width="158" height="45" rx="6" fill="var(--bg-surface)" stroke="var(--border-default)"/>
    <text x="305" y="178" fill="var(--text-primary)">Transfer match</text>
    <text x="305" y="194" fill="var(--text-muted)">$48.2K savings</text>
  </svg>`;
}

function skeletonPage(kind = "cards") {
  if (kind === "table") return `<div class="card">${[100, 70, 85].map(w => `<div class="skeleton skel-line" style="width:${w}%"></div>`).join("")}</div>`;
  if (kind === "chart") return `<div class="card"><div class="skeleton" style="height:280px"></div></div>`;
  return `<div class="kpi-grid">${Array.from({ length: 4 }, () => `<div class="skeleton skel-card"></div>`).join("")}</div>`;
}

function dashboard() {
  if (state.loading) return pageShell("Dashboard", "Inventory risk, transfer opportunity, and executive KPIs.", skeletonPage());
  const skus = activeSkuData();
  const stockout = skus.filter(s => s.stockout > 55);
  const overstock = skus.filter(s => s.overstock > 55);
  const transfers = transferSuggestions();
  const chartSku = skus.find(s => s.history?.length) || skus[0];
  const revenueRisk = stockout.reduce((sum, s) => sum + s.forecast * 42, 0) || state.revenueRisk;
  const riskScore = Math.min(99, Math.round((stockout.length * 18 + overstock.length * 12 + transfers.length * 8) / Math.max(1, skus.length) * 5));
  const cards = [
    ["Inventory Risk Score", riskScore || state.riskScore, stockout.length ? "HIGH RISK" : "WATCH", "Live from imported demand", `${transfers.length} transfer matches can reduce avoidable buys.`, "bad", "accent"],
    ["Total Inventory Value", "$12.8M", "", "↑ 2.1%", "Across all connected stores.", "good", ""],
    ["Revenue at Risk", `$${Math.round(revenueRisk / 1000)}K`, `${stockout.length} SKUs`, "Stockout exposure", "Likely stockout loss this week.", "bad", ""],
    ["Excess Cost", `$${Math.round(overstock.reduce((sum, s) => sum + s.current * 9, 0) / 1000)}K`, "", `${overstock.length} overstocked`, "Markdown and carrying cost.", "good", ""],
  ];
  return pageShell("Dashboard", state.lastUpdated, `
    <div class="toolbar-spread"><div></div><button class="btn-primary" data-refresh type="button" ${state.refreshing ? "disabled" : ""}>${state.refreshing ? spinner("Refreshing...") : `${icon("chart-line")}Refresh analysis`}</button></div>
    <section class="kpi-grid">${cards.map((c, i) => kpiCard(c, i)).join("")}</section>
    <section class="triage-grid">
      ${triageCard("Stockout risk", stockout.length, "high", stockout.slice(0, 3).map(s => `${s.sku}: ${s.stockout}%`).join(", ") || "No urgent stockouts")}
      ${triageCard("Overstock risk", overstock.length, "medium", overstock.slice(0, 3).map(s => `${s.sku}: ${s.overstock}%`).join(", ") || "No urgent overstock")}
      ${triageCard("Transfer matches", transfers.length, "info", transfers[0] ? `${transfers[0].from} → ${transfers[0].to}, ${transfers[0].quantity} units` : "Upload multi-location CSV data")}
    </section>
    <section class="grid-2">
      <article class="card"><div class="toolbar-spread"><div><p class="eyebrow">Forecast</p><h2 class="text-lg">${esc(chartSku.product)} demand outlook</h2></div><div class="legend"><span><i style="background:var(--text-muted)"></i>History</span><span><i style="background:var(--accent)"></i>Prediction</span><span><i style="background:var(--accent)"></i>Confidence</span></div></div><div class="chart">${chartSku.history?.length ? skuForecastChart(forecastSeriesForSku(chartSku), 820, 280) : lineChart(forecastData, 820, 280)}</div></article>
      <article class="card"><p class="eyebrow">Recommendations</p><h2 class="text-lg">Action queue</h2><div class="report-list">${skus.slice(0, 5).map(s => {
        const reorder = reorderSuggestion(s);
        return `<div class="report-row"><span>${esc(s.product)}<br><span class="muted">${reorder.quantity ? `${reorder.quantity} units by ${reorder.orderBy}` : "No reorder needed"}</span></span><span class="badge badge--${s.action}">${s.action}</span></div>`;
      }).join("")}</div></article>
    </section>
  `);
}

function triageCard(title, count, tone, detail) {
  return `<article class="card triage-card"><span class="badge badge--${tone}">${count}</span><div><strong>${title}</strong><p class="muted">${esc(detail)}</p></div></article>`;
}

function kpiCard([label, value, badge, trend, subtext, trendClass, accent], index) {
  if (state.refreshing) return `<article class="card kpi-card ${accent ? "card--accent" : ""}"><div class="skeleton skel-line"></div><div class="skeleton skel-line" style="height:38px;width:70%"></div><div class="skeleton skel-line" style="width:85%"></div></article>`;
  return `<article class="card kpi-card ${accent ? "card--accent" : ""}">
    <div class="kpi-top"><p class="eyebrow">${label}</p>${badge ? `<span class="badge badge--${index === 0 ? "high" : "warning"}">${badge}</span>` : ""}</div>
    ${index === 0 ? `<div class="risk-layout">${riskGauge(value)}<span class="trend ${trendClass}">${trend}</span></div>` : `<div class="toolbar-spread"><div class="metric-value">${value}</div><span class="trend ${trendClass}">${trend}</span></div>`}
    <p class="kpi-subtext">${subtext}</p>
  </article>`;
}

function riskGauge(score) {
  const r = 48, cx = 56, cy = 56, c = 2 * Math.PI * r, dash = (score / 100) * c;
  const color = score > 70 ? "var(--red)" : score > 40 ? "var(--yellow)" : "var(--green)";
  return `<svg width="112" height="112" viewBox="0 0 112 112"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--bg-subtle)" stroke-width="8"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-dasharray="${dash} ${c - dash}" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/><text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="var(--text-primary)" font-size="22" font-weight="700" font-family="var(--font-mono)">${score}</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="var(--text-muted)" font-size="10" letter-spacing="0.06em">/ 100</text></svg>`;
}

function pageShell(title, sub, content, eyebrow = "") {
  return `<section class="page"><div class="page-head"><div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}<h1 class="text-xl">${title}</h1><p>${sub}</p></div></div>${content}</section>`;
}

function connectPage() {
  const complete = Object.values(state.checklist).every(Boolean);
  return pageShell("Connect Store", "Link systems, import data, and run the first analysis.", `
    <section class="connection-status-grid">
      ${connectionStatusCard("CSV Upload", "csv")}
      ${connectionStatusCard("Shopify", "shopify")}
      ${connectionStatusCard("Square POS", "square")}
    </section>
    <section class="grid-2">
      <article class="card"><p class="eyebrow">Selected integration</p><h2 class="text-lg">${providerName(state.selectedProvider)}</h2>${integrationPanel()}</article>
      <article class="card"><p class="eyebrow">Providers</p><div class="connector-grid">${Object.keys(providerFields).map(p => `<button class="btn-ghost connector-card ${state.selectedProvider === p ? "selected" : ""}" data-provider="${p}" type="button">${providerName(p)}</button>`).join("")}</div></article>
    </section>
    <article class="card">${complete ? `<div class="card card--accent" style="margin-bottom:var(--space-4)">Setup complete. Your first analysis is ready. <a data-route="/" href="/">View Dashboard →</a></div>` : ""}<p class="eyebrow">Setup checklist</p><div class="checklist">${checkRows()}</div></article>
  `);
}

function connectionStatusCard(label, key) {
  const status = state.connectionStatus[key] || { status: "not connected", detail: "No status yet." };
  const tone = status.status === "connected" ? "success" : status.status === "error" ? "high" : "warning";
  return `<article class="card connection-card"><div class="toolbar-spread"><strong>${label}</strong><span class="badge badge--${tone}">${esc(status.status)}</span></div><p class="muted">${esc(status.detail)}</p><button class="btn-ghost" data-sync-source="${key}" type="button">${state.providerBusy === key ? spinner("Syncing...") : "Sync now"}</button></article>`;
}

function providerName(key) {
  return ({ shopify: "Shopify", square: "Square", lightspeed: "Lightspeed", clover: "Clover", netsuite: "NetSuite", sap: "SAP", csv: "CSV Upload" })[key];
}

function integrationPanel() {
  if (state.selectedProvider === "csv") {
    return `<div class="form-stack">
      <label class="drop-zone" data-drop><input class="hidden" data-csv type="file" accept=".csv" />${icon("upload")}<span>Drop a .csv file here, or click to browse</span></label>
      ${state.csv?.loading ? `<div class="progress"><span></span></div>` : ""}
      ${state.csv?.errors?.length ? `<div class="auth-message auth-message--warning"><strong>${state.csv.errors.length} row issues found</strong><ul>${state.csv.errors.slice(0, 5).map(e => `<li>${esc(e)}</li>`).join("")}</ul></div>` : ""}
      ${state.csv?.records ? `<p class="muted">File loaded: ${esc(state.csv.name)}. ${state.csv.records.length} valid rows detected</p>${previewTable([["SKU", "date", "quantity sold", "location"], ...state.csv.records.map(r => [r.sku, r.date, r.quantity, r.location])])}<button class="btn-primary" data-import-csv type="button">${state.providerBusy ? spinner("Importing...") : "Import CSV"}</button>` : ""}
    </div>`;
  }
  if (["shopify", "square"].includes(state.selectedProvider)) {
    return `<div class="form-stack"><p class="muted">${providerName(state.selectedProvider)} OAuth needs production app credentials before it can pull live orders. This screen keeps the integration honest instead of pretending a token exists.</p><button class="btn-primary" data-connect-form-disabled type="button">Request ${providerName(state.selectedProvider)} app setup</button></div>`;
  }
  const fields = providerFields[state.selectedProvider];
  return `<form class="form-stack" data-connect-form>${fields.map((f, i) => `<div class="field"><label>${f.label}</label><input class="input" name="field${i}" type="${f.type}" placeholder="${f.placeholder}" /></div>`).join("")}<button class="btn-primary" type="submit" ${state.providerBusy ? "disabled" : ""}>${state.providerBusy ? spinner("Connecting...") : `Connect ${providerName(state.selectedProvider)}`}</button></form>`;
}

function previewTable(rows) {
  return `<div class="table-wrap"><table class="data-table"><tbody>${rows.slice(0, 5).map(r => `<tr>${r.slice(0, 5).map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function checkRows() {
  const labels = { pos: "POS connected", categories: "Categories selected", sales: "Historical sales imported", inventory: "Current inventory imported", analysis: "Automated analysis report generated" };
  const actions = { sales: "Import sales", inventory: "Import inventory", analysis: "Run analysis" };
  return Object.entries(labels).map(([key, label]) => {
    const done = state.checklist[key];
    const disabled = key === "inventory" && !state.checklist.sales || key === "analysis" && (!state.checklist.sales || !state.checklist.inventory);
    return `<div class="check-row"><span class="check-label"><span class="check-dot ${done ? "done" : ""}">${done ? icon("check") : ""}</span>${label}</span>${actions[key] ? (done ? `<span class="badge badge--success">Imported</span>` : `<button class="btn-ghost" data-check="${key}" ${disabled || state.checklistBusy ? "disabled" : ""} type="button">${state.checklistBusy === key ? spinner("Working...") : actions[key]}</button>`) : ""}</div>`;
  }).join("");
}

function forecastsPage() {
  if (state.loading) return pageShell("Forecasts", "Model output, confidence bands, and seasonal demand.", skeletonPage("chart"));
  return pageShell("Forecasts", "Model output, confidence bands, and seasonal demand.", `
    <section class="grid-3">
      <article class="card"><p class="eyebrow">ARIMA</p><div class="metric-value">172,900</div><p class="muted">Baseline demand from recurring cycles.</p></article>
      <article class="card"><p class="eyebrow">XGBoost</p><div class="metric-value">189,700</div><p class="muted">Signal-adjusted regional demand.</p></article>
      <article class="card card--accent"><p class="eyebrow">Ensemble</p><div class="metric-value">184,200</div><p class="muted">Operational forecast used for recommendations.</p></article>
    </section>
    <section class="card"><div class="toolbar-spread"><div><p class="eyebrow">8-week demand forecast</p><h2 class="text-lg">Forecast blend</h2></div><div class="legend"><span><i style="background:var(--accent)"></i>Ensemble</span><span><i style="background:var(--blue)"></i>XGBoost</span><span><i style="background:var(--text-muted)"></i>ARIMA</span></div></div><div id="forecastChart" class="chart">${lineChart(forecastData, 900, 280)}</div></section>
    <section class="grid-2"><article class="card"><p class="eyebrow">Monte Carlo simulation</p><div id="mcChart" class="chart chart-small">${areaChart()}</div></article><article class="card"><p class="eyebrow">Seasonal demand</p><div id="seasonChart" class="chart chart-tiny">${barChart()}</div></article></section>
    <section class="card"><p class="eyebrow">How each model works</p><div class="accordion">${accordion("ARIMA", "Demand baseline", ["Uses 24 months of daily sales data to detect seasonality", "Removes trend to isolate repeatable demand cycles", "Output: weekly baseline forecast ±8% confidence band"], "Daily sales", "Weekly baseline")}${accordion("XGBoost", "Signal adjustment", ["Uses promotions, holidays, stock levels, and regional signals", "Ranks demand drivers by predictive lift", "Output: demand-adjusted forecast"], "Sales + external signals", "Adjusted demand")}${accordion("Ensemble", "Operational forecast", ["Blends statistical baseline with ML adjustment", "Weights models by recent forecast error", "Output: SKU action recommendations"], "ARIMA + XGBoost", "Buy, sell, hold, transfer")}</div></section>
  `);
}

function accordion(title, sub, bullets, input, output) {
  return `<div class="accordion-item"><button class="accordion-trigger" data-accordion type="button"><span><strong>${title}</strong> <span class="muted">${sub}</span></span><span>expand</span></button><div class="accordion-body"><div class="accordion-content"><ul>${bullets.map(b => `<li>${b}</li>`).join("")}</ul><div class="io-grid"><div><p class="eyebrow">Inputs</p><span class="mono">${input}</span></div><div><p class="eyebrow">Output</p><span class="mono">${output}</span></div></div></div></div></div>`;
}

function inventoryPage() {
  if (state.loading) return pageShell("Inventory", "SKU-level recommendations and risk signals.", skeletonPage("table"), "SKU RECOMMENDATIONS");
  const skus = activeSkuData();
  const q = state.inventoryFilter.toLowerCase();
  const rows = skus.filter(s => (state.actionFilter === "all" || s.action === state.actionFilter) && (s.product.toLowerCase().includes(q) || s.sku.toLowerCase().includes(q)));
  return pageShell("Inventory", `Showing ${rows.length} of ${skus.length} products`, `
    <div class="toolbar"><input class="input" data-inventory-search style="max-width:240px" value="${esc(state.inventoryFilter)}" placeholder="Search name or SKU" />${["all", "buy", "sell", "hold", "transfer"].map(a => `<button class="btn-ghost ${state.actionFilter === a ? "active" : ""}" data-action-filter="${a}" type="button">${a[0].toUpperCase() + a.slice(1)}</button>`).join("")}</div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Product + SKU</th><th>Current Stock</th><th>Forecasted Demand</th><th>Risk reason</th><th>Reorder suggestion</th><th>Action</th></tr></thead><tbody>${rows.length ? rows.map(skuRow).join("") : `<tr><td colspan="6"><div class="empty-state">${icon("search")}No products match. Try a different name or SKU.</div></td></tr>`}</tbody></table></div>
    <section class="card"><div class="toolbar-spread"><div><p class="eyebrow">Reorder export</p><h2 class="text-lg">Actionable purchase list</h2></div><button class="btn-primary" data-export-reorders type="button">${icon("file-text")}Export reorder CSV</button></div><p class="muted">Includes only SKUs where forecasted lead-time demand plus safety stock exceeds current stock.</p></section>
  `, "SKU RECOMMENDATIONS");
}

function skuRow(s) {
  const reorder = reorderSuggestion(s);
  const daily = Math.max(1, Math.round(s.forecast / 56));
  const daysOnHand = Math.round(s.current / daily);
  const reason = s.stockout > s.overstock
    ? `Current stock covers ${daysOnHand} days; lead time is ${skuSettings(s.sku).leadTime} days.`
    : `Forecast is ${s.forecast}; current stock is ${s.current}.`;
  return `<tr id="sku-${s.id}" class="${state.highlightedSku === s.id ? "highlight-row" : ""}"><td><strong>${esc(s.product)}</strong><br><span class="mono muted">${s.sku}</span></td><td class="mono">${s.current}</td><td class="mono">${s.forecast}</td><td><span class="risk-badge ${severity(s.stockout || s.overstock)}" title="${attr(reason)}">${s.stockout > s.overstock ? `${s.stockout}% stockout` : `${s.overstock}% overstock`}</span><br><span class="muted">${esc(reason)}</span></td><td>${reorder.quantity ? `<strong>${reorder.quantity} units</strong><br><span class="muted">Order by ${reorder.orderBy}. ${esc(reorder.reason)}</span>` : `<span class="muted">No reorder needed</span>`}</td><td><span class="badge badge--${s.action}">${s.action}</span></td></tr>`;
}

function severity(n) {
  return n > 70 ? "severity-high" : n >= 40 ? "severity-medium" : "severity-low";
}

function marketplacePage() {
  const filtered = listings.filter(l => (state.typeFilter === "all" || l.type === state.typeFilter) && (state.catFilter === "all" || l.cat === state.catFilter) && l.dist <= state.distFilter);
  const msg = state.selectedRetailer ? `Hi ${state.selectedRetailer.retailer}, we're interested in discussing a transfer of ${state.selectedRetailer.product}. Can you confirm availability and pricing for ${state.selectedRetailer.qty} units?` : "";
  const suggestions = transferSuggestions();
  return pageShell("Marketplace", `Showing ${filtered.length} of ${listings.length} partners`, `
    <p class="eyebrow">PARTNER NETWORK</p>
    <section class="card"><div class="toolbar-spread"><div><p class="eyebrow">Inter-store transfer engine</p><h2 class="text-lg">Suggested transfers</h2></div><span class="badge badge--info">${suggestions.length} matches</span></div><div class="transfer-list">${suggestions.length ? suggestions.map((s, i) => transferSuggestionCard(s, i)).join("") : `<div class="empty-state">Upload a CSV with at least two locations carrying the same SKU to surface transfer matches.</div>`}</div></section>
    <section class="card"><p class="eyebrow">Transfer records</p><div class="transfer-list">${state.transferRecords.length ? state.transferRecords.map(transferRecordCard).join("") : `<p class="muted">Approved transfers will appear here with pending, in transit, and received states.</p>`}</div></section>
    <article class="card map-panel">${mapSvg()}</article>
    <div class="toolbar"><select class="select" data-market-filter="typeFilter" style="max-width:160px"><option value="all">All types</option><option value="excess">Excess</option><option value="shortage">Shortage</option></select><select class="select" data-market-filter="catFilter" style="max-width:180px"><option value="all">All categories</option><option value="footwear">Footwear</option><option value="outdoor">Outdoor</option><option value="home">Home</option></select><select class="select" data-market-filter="distFilter" style="max-width:160px"><option value="25">25 miles</option><option value="50">50 miles</option><option value="100">100 miles</option></select></div>
    <section class="listing-grid">${filtered.length ? filtered.map(l => listingCard(l)).join("") : `<article class="card empty-state">No partners match your filters. Try expanding the distance or category.</article>`}</section>
    <section class="card message-layout"><div>${listings.map(l => `<button class="btn-ghost retailer-row ${state.selectedRetailer?.id === l.id ? "selected" : ""}" data-retailer="${l.id}" type="button"><span>${esc(l.retailer)}</span><span class="mono">${l.dist} mi</span></button>`).join("")}</div><form class="form-stack" data-message><textarea class="textarea" name="message">${esc(msg)}</textarea><button class="btn-primary" type="submit" ${state.marketplaceBusy ? "disabled" : ""}>${state.marketplaceBusy ? spinner("Sending...") : "Send request"}</button>${state.messageSent ? `<p class="severity-low">${esc(state.messageSent)}</p>` : ""}</form></section>
  `);
}

function transferSuggestionCard(s, index) {
  return `<article class="transfer-row"><div><strong>${esc(s.product)}</strong><p class="muted">${esc(s.from)} → ${esc(s.to)} · ${s.quantity} units · ${esc(s.reason)}</p></div><button class="btn-primary" data-approve-transfer="${index}" type="button">Approve transfer</button></article>`;
}

function transferRecordCard(record) {
  const next = record.status === "pending" ? "Mark in transit" : record.status === "in transit" ? "Mark received" : "";
  return `<article class="transfer-row"><div><strong>${esc(record.product)}</strong><p class="muted">${esc(record.from)} → ${esc(record.to)} · ${record.quantity} units</p></div><div class="transfer-actions"><span class="badge badge--info">${esc(record.status)}</span>${next ? `<button class="btn-ghost" data-advance-transfer="${record.id}" type="button">${next}</button>` : ""}</div></article>`;
}

function listingCard(l) {
  return `<article class="card listing-card"><div class="listing-top"><strong>${esc(l.retailer)}</strong><span class="badge badge--info">${l.dist} mi</span></div><div><p class="text-md">${esc(l.product)}</p><p class="muted mono">${l.qty} units at $${l.price}/unit</p></div><div class="toolbar-spread"><span class="badge badge--${l.urgency}">${l.urgency}</span><button class="btn-primary" data-contact="${l.id}" type="button">Contact</button></div></article>`;
}

function mapSvg() {
  return `<svg viewBox="0 0 900 180" role="img" aria-label="Partner map"><defs><pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="var(--border-default)" stroke-width="1"/></pattern></defs><rect width="900" height="180" fill="url(#grid)"/><g font-family="var(--font-mono)" font-size="11">${pin(450, 88, "var(--accent)", "Northstar Retail", 8)}${pin(560, 48, "var(--green)", "Midwest Outdoor Co.", 6)}${pin(330, 82, "var(--blue)", "Prairie City Retail", 6)}${pin(460, 142, "var(--yellow)", "River Valley Sports", 6)}</g></svg>`;
}
function pin(x, y, color, label, r) {
  return `<circle class="map-pin" cx="${x}" cy="${y}" r="${r + 6}" fill="${color}" opacity=".16"/><circle class="map-pin" cx="${x}" cy="${y}" r="${r}" fill="${color}"/><circle class="map-pin" cx="${x}" cy="${y}" r="2" fill="var(--bg-base)"/><text class="map-label" x="${x + 14}" y="${y - 8}" fill="var(--text-primary)">${label}</text>`;
}

function communityPage() {
  const topics = [["inventory-swap", "Inventory swap"], ["bulk-buy", "Bulk buying group"], ["delivery-route", "Local delivery route"], ["pricing", "Pricing and markdown advice"]];
  return pageShell("Community", "Share opportunities with your retailer network.", `
    <p class="eyebrow">COMMUNITY</p>
    <section class="card"><div class="topic-grid">${topics.map(([k, v]) => `<button class="btn-ghost topic-btn ${state.selectedTopic === k ? "active" : ""}" data-topic="${k}" type="button">${v}</button>`).join("")}</div><form class="form-stack" data-post style="margin-top:var(--space-4)"><textarea class="textarea" name="post">${esc(state.selectedTopic ? starters[state.selectedTopic] : "")}</textarea><button class="btn-primary" type="submit" ${state.postBusy ? "disabled" : ""}>${state.postBusy ? spinner("Sharing...") : "Share with network"}</button></form></section>
    <section class="post-list">${state.posts.map(p => `<article class="card post-card"><div class="post-meta"><strong>${esc(p.author)}</strong><span>${p.time}</span></div><span class="badge badge--info">${topicLabel(p.topic)}</span><p>${esc(p.text)}</p></article>`).join("")}</section>
  `);
}

function topicLabel(key) {
  return ({ "inventory-swap": "Inventory swap", "bulk-buy": "Bulk buy", "delivery-route": "Delivery route", pricing: "Pricing" })[key] || key;
}

function reportsPage() {
  return pageShell("Reports", "Executive summary and exportable metrics.", `
    <article class="card"><div class="toolbar-spread"><div><p class="eyebrow">Executive report</p><h2 class="text-lg">Inventory Health Summary</h2></div><button class="btn-primary" data-download type="button">${state.reportBusy ? spinner("Exporting...") : "Download report"}</button></div><div class="report-list" style="margin-top:var(--space-6)">${[["Risk Score", "76 (HIGH)"], ["Revenue at Risk", "$684,000"], ["Excess Cost", "$312,000"], ["Total Inventory Value", "$12,800,000"], ["Transfer Units Recommended", "1,842"]].map(([a, b]) => `<div class="report-row"><span>${a}</span><span class="mono">${b}</span></div>`).join("")}</div></article>
  `);
}

function profilePage() {
  const user = state.authUser || {};
  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "LL";
  const mfaLabel = user.twoFactorEnabled ? `${user.twoFactorMethod === "phone" ? "Phone" : "Email"} verification enabled` : "Not enabled";
  return pageShell("Profile", "Manage your account, password, and session.", `
    <section class="grid-2 account-grid">
      <article class="card account-summary">
        <div class="profile-avatar">${esc(initials)}</div>
        <div>
          <p class="eyebrow">Signed in as</p>
          <h2 class="text-lg">${esc(`${user.firstName || ""} ${user.lastName || ""}`.trim() || "LiquidityLens user")}</h2>
          <p class="muted">${esc(user.email || "")}</p>
        </div>
        <div class="account-facts">
          <div><span>Email status</span><strong>${user.emailVerified ? "Verified" : "Unverified"}</strong></div>
          <div><span>Two-factor auth</span><strong>${esc(mfaLabel)}</strong></div>
          <div><span>Workspace</span><strong>Northstar Retail</strong></div>
        </div>
      </article>

      <article class="card">
        <p class="eyebrow">Account details</p>
        <form class="form-stack" data-profile-form>
          <div class="auth-name-grid">
            <div class="field"><label for="profileFirstName">First name</label><input id="profileFirstName" class="input" name="firstName" value="${esc(user.firstName || "")}" autocomplete="given-name" /></div>
            <div class="field"><label for="profileLastName">Last name</label><input id="profileLastName" class="input" name="lastName" value="${esc(user.lastName || "")}" autocomplete="family-name" /></div>
          </div>
          <div class="field"><label for="profileEmail">Email</label><input id="profileEmail" class="input" value="${esc(user.email || "")}" disabled /></div>
          <button class="btn-primary" type="submit" ${state.profileBusy ? "disabled" : ""}>${state.profileBusy ? spinner("Saving...") : "Save profile"}</button>
        </form>
      </article>

      <article class="card">
        <p class="eyebrow">Password</p>
        <form class="form-stack" data-password-form>
          ${passwordField("currentPassword", "currentPassword", "Current password", "current-password")}
          ${passwordField("newProfilePassword", "password", "New password", "new-password")}
          ${passwordField("confirmProfilePassword", "confirmPassword", "Confirm new password", "new-password")}
          <p class="password-policy">Changing your password signs out other sessions.</p>
          <button class="btn-primary" type="submit" ${state.passwordBusy ? "disabled" : ""}>${state.passwordBusy ? spinner("Updating...") : "Update password"}</button>
        </form>
      </article>

      <article class="card">
        <p class="eyebrow">Two-factor authentication</p>
        <div class="security-status">
          <span class="security-icon">${icon("shield")}</span>
          <div>
            <strong>${user.twoFactorEnabled ? "Extra sign-in protection is on" : "Add an extra sign-in check"}</strong>
            <p class="muted">${user.twoFactorEnabled ? `Codes are sent by ${user.twoFactorMethod === "phone" ? "phone" : "email"} before a new login finishes.` : "Use email or phone verification to protect this account."}</p>
          </div>
        </div>
        <form class="form-stack" data-mfa-start-form>
          <div class="field"><label for="mfaMethod">Verification method</label><select id="mfaMethod" class="input" name="method" data-mfa-method>
            <option value="email" ${state.mfaSetupMethod === "email" ? "selected" : ""}>Email</option>
            <option value="phone" ${state.mfaSetupMethod === "phone" ? "selected" : ""}>Phone</option>
          </select></div>
          <div class="field ${state.mfaSetupMethod === "phone" ? "" : "hidden"}"><label for="mfaPhone">Phone number</label><input id="mfaPhone" class="input" name="phone" value="${esc(user.phone || "")}" placeholder="+13125550123" autocomplete="tel" /></div>
          <button class="btn-primary" type="submit" ${state.mfaSetupBusy ? "disabled" : ""}>${state.mfaSetupBusy ? spinner("Sending code...") : "Send setup code"}</button>
        </form>
        ${state.mfaSetupChallengeId ? `<form class="form-stack mfa-confirm-form" data-mfa-confirm-form>
          <p class="auth-message">Enter the code sent to ${esc(state.mfaSetupDestination)}.</p>
          <div class="field"><label for="mfaSetupCode">Setup code</label><input id="mfaSetupCode" class="input" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" /></div>
          <button class="btn-primary" type="submit" ${state.mfaSetupBusy ? "disabled" : ""}>${state.mfaSetupBusy ? spinner("Confirming...") : "Turn on 2FA"}</button>
        </form>` : ""}
        ${user.twoFactorEnabled ? `<button class="btn-ghost danger-btn" data-disable-mfa type="button" ${state.mfaSetupBusy ? "disabled" : ""}>Disable 2FA</button>` : ""}
      </article>

      <article class="card">
        <p class="eyebrow">Recovery and session</p>
        <div class="form-stack">
          <button class="btn-ghost" data-send-profile-reset type="button">Send password reset email</button>
          <button class="btn-ghost" data-signout type="button">${icon("signout")}Sign out</button>
        </div>
      </article>
    </section>
  `);
}

function render() {
  if (!state.authReady) {
    app.innerHTML = `<main class="auth-loading"><span class="spinner" aria-hidden="true"></span><span>Checking your session...</span></main>`;
    return;
  }
  if (publicRoutes.has(location.pathname) && !auth()) {
    app.innerHTML = publicPage(location.pathname);
    bind();
    return;
  }
  if (authRoutes.has(location.pathname) || !auth()) {
    app.innerHTML = loginPage();
    bind();
    return;
  }
  const views = { "/": dashboard, "/dashboard": dashboard, "/connect": connectPage, "/forecasts": forecastsPage, "/inventory": inventoryPage, "/marketplace": marketplacePage, "/pricing": () => publicPage("/pricing"), "/how-it-connects": () => publicPage("/how-it-connects"), "/why-liquiditylens": () => publicPage("/why-liquiditylens"), "/community": communityPage, "/reports": reportsPage, "/profile": profilePage };
  app.innerHTML = layout((views[state.path] || dashboard)());
  bind();
}

function bind() {
  document.querySelectorAll("[data-route]").forEach(el => el.addEventListener("click", e => { e.preventDefault(); navigate(el.getAttribute("data-route")); }));
  document.querySelectorAll("button[data-theme]").forEach(el => el.addEventListener("click", toggleTheme));
  document.querySelectorAll("[data-auth-mode]").forEach(el => el.addEventListener("click", () => {
    state.authMode = el.dataset.authMode;
    state.authMessage = "";
    if (state.authMode !== "mfa") clearMfaState();
    replacePath("/login");
    render();
  }));
  document.querySelectorAll("[data-auth-unavailable]").forEach(el => el.addEventListener("click", () => {
    state.authMessage = authUnavailableMessage();
    render();
  }));
  document.querySelectorAll("[data-social-auth]").forEach(el => el.addEventListener("click", () => startSocialAuth(el.dataset.socialAuth)));
  document.querySelectorAll("[data-toggle-password]").forEach(el => el.addEventListener("click", () => togglePasswordVisibility(el)));
  document.querySelectorAll("[data-auth-form]").forEach(el => el.addEventListener("submit", handleAuthSubmit));
  document.querySelector("[data-signout]")?.addEventListener("click", signOut);
  document.querySelector("[data-how]")?.addEventListener("click", openHow);
  document.querySelector("[data-menu]")?.addEventListener("click", () => { state.sidebarOpen = true; render(); });
  document.querySelector("[data-close-sidebar]")?.addEventListener("click", () => { state.sidebarOpen = false; render(); });
  document.querySelector("[data-refresh]")?.addEventListener("click", refreshAnalysis);
  document.querySelectorAll("[data-download]").forEach(el => el.addEventListener("click", downloadReport));
  document.querySelector("[data-global-search]")?.addEventListener("input", e => { clearTimeout(window.llSearchTimer); window.llSearchTimer = setTimeout(() => { state.search = e.target.value; state.searchOpen = true; render(); }, 200); });
  document.querySelector("[data-global-search]")?.addEventListener("keydown", e => { if (e.key === "Escape") { state.searchOpen = false; render(); } });
  document.querySelectorAll("[data-search-sku]").forEach(el => el.addEventListener("click", () => { state.highlightedSku = Number(el.dataset.searchSku); sessionStorage.setItem("ll_highlight_sku", state.highlightedSku); navigate("/inventory"); }));
  document.querySelector("[data-notifications]")?.addEventListener("click", () => { state.notificationsOpen = !state.notificationsOpen; render(); });
  document.querySelector("[data-mark-read]")?.addEventListener("click", () => { state.notifications = state.notifications.map(n => ({ ...n, read: true })); render(); });
  document.querySelectorAll("[data-provider]").forEach(el => el.addEventListener("click", () => { state.selectedProvider = el.dataset.provider; render(); }));
  document.querySelector("[data-connect-form]")?.addEventListener("submit", connectProvider);
  document.querySelector("[data-connect-form-disabled]")?.addEventListener("click", () => showToast("Add provider OAuth credentials on the backend before enabling live sync.", "info"));
  document.querySelectorAll("[data-sync-source]").forEach(el => el.addEventListener("click", () => syncSource(el.dataset.syncSource)));
  document.querySelector("[data-csv]")?.addEventListener("change", handleCsvFile);
  document.querySelector("[data-drop]")?.addEventListener("dragover", e => e.preventDefault());
  document.querySelector("[data-drop]")?.addEventListener("drop", e => {
    e.preventDefault();
    loadCsvFile(e.dataTransfer.files[0]);
  });
  document.querySelector("[data-import-csv]")?.addEventListener("click", importCsv);
  document.querySelectorAll("[data-check]").forEach(el => el.addEventListener("click", () => runChecklist(el.dataset.check)));
  document.querySelector("[data-inventory-search]")?.addEventListener("input", e => { state.inventoryFilter = e.target.value; render(); });
  document.querySelectorAll("[data-action-filter]").forEach(el => el.addEventListener("click", () => { state.actionFilter = el.dataset.actionFilter; render(); }));
  document.querySelector("[data-export-reorders]")?.addEventListener("click", exportReorders);
  document.querySelectorAll("[data-market-filter]").forEach(el => { el.value = state[el.dataset.marketFilter]; el.addEventListener("change", () => { state[el.dataset.marketFilter] = el.dataset.marketFilter === "distFilter" ? Number(el.value) : el.value; render(); }); });
  document.querySelectorAll("[data-approve-transfer]").forEach(el => el.addEventListener("click", () => approveTransfer(Number(el.dataset.approveTransfer))));
  document.querySelectorAll("[data-advance-transfer]").forEach(el => el.addEventListener("click", () => advanceTransfer(Number(el.dataset.advanceTransfer))));
  document.querySelectorAll("[data-contact], [data-retailer]").forEach(el => el.addEventListener("click", () => { const id = Number(el.dataset.contact || el.dataset.retailer); state.selectedRetailer = listings.find(l => l.id === id); state.messageSent = ""; render(); }));
  document.querySelector("[data-message]")?.addEventListener("submit", sendMessage);
  document.querySelectorAll("[data-topic]").forEach(el => el.addEventListener("click", () => { state.selectedTopic = el.dataset.topic; render(); }));
  document.querySelector("[data-post]")?.addEventListener("submit", postCommunity);
  document.querySelector("[data-profile-form]")?.addEventListener("submit", updateProfile);
  document.querySelector("[data-password-form]")?.addEventListener("submit", changePassword);
  document.querySelector("[data-send-profile-reset]")?.addEventListener("click", sendProfileReset);
  document.querySelector("[data-mfa-method]")?.addEventListener("change", e => { state.mfaSetupMethod = e.target.value; render(); });
  document.querySelector("[data-mfa-start-form]")?.addEventListener("submit", startMfaSetup);
  document.querySelector("[data-mfa-confirm-form]")?.addEventListener("submit", confirmMfaSetup);
  document.querySelector("[data-disable-mfa]")?.addEventListener("click", disableMfa);
  document.querySelectorAll("[data-accordion]").forEach(el => el.addEventListener("click", () => el.closest(".accordion-item").classList.toggle("open")));
  bindChartTips();
}

function togglePasswordVisibility(button) {
  const input = document.getElementById(button.dataset.togglePassword);
  if (!input) return;
  const visible = input.type === "text";
  input.type = visible ? "password" : "text";
  button.setAttribute("aria-label", `${visible ? "Show" : "Hide"} ${input.name === "confirmPassword" ? "confirm password" : "password"}`);
  button.innerHTML = icon(visible ? "eye" : "eye-off");
}

async function authStatus() {
  if (!canUseAppRoutes()) throw new Error(authUnavailableMessage());
  let response;
  try {
    response = await fetch("/api/auth/status", { credentials: "same-origin" });
  } catch {
    throw new Error("The authentication server is not reachable. Start the LiquidityLens backend and open http://localhost:4174.");
  }
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json().catch(() => ({})) : {};
  if (!response.ok || !data.ok) {
    throw new Error("The authentication API was not found on this server. Port 4174 is likely serving static files instead of the Express backend.");
  }
  return data;
}

async function startSocialAuth(provider) {
  state.authBusy = true;
  state.authMessage = "";
  render();
  try {
    const status = await authStatus();
    if (!status.providers?.[provider]) {
      throw new Error(`${provider === "google" ? "Google" : "Microsoft"} sign-in is not configured yet. Add the client ID and secret to .env, then restart the backend.`);
    }
    const redirectTo = encodeURIComponent(sessionStorage.getItem("ll_redirect_after_login") || "/dashboard");
    location.href = `/api/auth/oauth/${provider}?redirectTo=${redirectTo}`;
  } catch (err) {
    state.authBusy = false;
    state.authMessage = err.message;
    render();
  }
}

async function apiAuth(path, body) {
  if (!canUseAppRoutes()) {
    throw new Error(authUnavailableMessage());
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      signal: controller.signal,
      body: JSON.stringify(body || {}),
    });
  } catch (err) {
    const message = err.name === "AbortError"
      ? "The authentication server did not respond. Check that the backend is running, then try again."
      : "Could not reach the authentication server. Open the app from http://localhost:4174 with the backend running.";
    throw new Error(message);
  } finally {
    clearTimeout(timer);
  }
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    const missingApi = response.status === 404 && !contentType.includes("application/json");
    const err = new Error(missingApi ? "The authentication API was not found. Port 4174 is likely serving static files instead of the Express backend." : data.error || "Request failed. Please try again.");
    err.code = data.code;
    throw err;
  }
  return data;
}

async function apiPatch(path, body) {
  if (!state.accessToken) throw new Error("Sign in required.");
  const response = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.accessToken}` },
    credentials: "same-origin",
    body: JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed. Please try again.");
  return data;
}

async function apiAuthedPost(path, body) {
  if (!state.accessToken) throw new Error("Sign in required.");
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.accessToken}` },
    credentials: "same-origin",
    body: JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed. Please try again.");
  return data;
}

function validateAuthForm(form, mode) {
  let ok = true;
  const email = form.email;
  const password = form.password;
  const confirmPassword = form.confirmPassword;
  const currentPassword = form.currentPassword;
  const firstName = form.firstName;
  const lastName = form.lastName;
  form.querySelectorAll(".input-error-msg").forEach(n => n.remove());
  form.querySelectorAll(".input--error").forEach(n => n.classList.remove("input--error"));

  if (firstName && !firstName.value.trim()) { errorAfter(firstName, "First name is required"); ok = false; }
  if (lastName && !lastName.value.trim()) { errorAfter(lastName, "Last name is required"); ok = false; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { errorAfter(email, "Enter a valid email address"); ok = false; }
  if (mode === "mfa" && !/^\d{6}$/.test(String(form.code?.value || "").trim())) { errorAfter(form.code, "Enter the 6-digit code"); ok = false; }
  if ((mode === "signup" || mode === "reset") && !/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password.value)) {
    errorAfter(password, "Use 8+ characters with uppercase, number, and special character");
    ok = false;
  }
  if (currentPassword && !currentPassword.value) { errorAfter(currentPassword, "Current password is required"); ok = false; }
  if (mode === "signin" && !password.value) { errorAfter(password, "Password is required"); ok = false; }
  if (confirmPassword && password.value !== confirmPassword.value) { errorAfter(confirmPassword, "Passwords do not match"); ok = false; }
  return ok;
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const mode = form.dataset.authForm;
  if (!validateAuthForm(form, mode)) return;

  const values = Object.fromEntries(new FormData(form).entries());
  state.authBusy = true;
  state.authMessage = "";
  render();
  try {
    if (mode === "forgot") {
      await apiAuth("/api/auth/forgot-password", values);
      goToAuth("signin", "If an account exists, a reset link has been sent.");
      return;
    }
    if (mode === "reset") {
      const token = new URLSearchParams(location.search).get("token");
      await apiAuth("/api/auth/reset-password", { ...values, token });
      goToAuth("signin", "Password updated. Sign in with your new password.");
      return;
    }
    if (mode === "mfa") {
      const data = await apiAuth("/api/auth/mfa/verify", { challengeId: state.mfaChallengeId, code: values.code });
      state.accessToken = data.token;
      state.authUser = data.user;
      state.authReady = true;
      state.authBusy = false;
      const next = state.mfaRedirectTo || sessionStorage.getItem("ll_redirect_after_login") || "/dashboard";
      clearMfaState();
      sessionStorage.removeItem("ll_redirect_after_login");
      replacePath(next);
      state.path = next in routes ? next : "/dashboard";
      render();
      showToast("Signed in.", "success");
      return;
    }
    const data = await apiAuth(`/api/auth/${mode}`, values);
    if (data.mfaRequired) {
      state.mfaChallengeId = data.challengeId;
      state.mfaMethod = data.method;
      state.mfaDestination = data.destination;
      state.mfaRedirectTo = sessionStorage.getItem("ll_redirect_after_login") || "/dashboard";
      goToAuth("mfa", `Enter the code sent to ${data.destination}.`);
      return;
    }
    state.accessToken = data.token;
    state.authUser = data.user;
    state.authReady = true;
    state.authBusy = false;
    const next = sessionStorage.getItem("ll_redirect_after_login") || "/dashboard";
    sessionStorage.removeItem("ll_redirect_after_login");
    replacePath(next);
    state.path = next in routes ? next : "/dashboard";
    render();
    showToast(mode === "signup" ? "Account created." : "Signed in.", "success");
  } catch (err) {
    state.authBusy = false;
    state.authMessage = err.message;
    render();
  }
}

function errorAfter(input, text) {
  input.classList.add("input--error");
  const target = input.closest(".password-wrap") || input;
  target.insertAdjacentHTML("afterend", `<span class="input-error-msg">${text}</span>`);
}

async function signOut() {
  state.authBusy = true;
  try {
    await apiAuth("/api/auth/signout", {});
  } catch (err) {
    console.warn("Sign-out request failed:", err);
  }
  state.accessToken = null;
  state.authUser = null;
  state.authBusy = false;
  sessionStorage.removeItem("ll_redirect_after_login");
  showToast("Signed out.", "info");
  replacePath("/login");
  render();
}

function refreshAnalysis() {
  state.refreshing = true;
  state.syncing = true;
  render();
  setTimeout(() => {
    state.riskScore = Math.max(0, Math.min(100, 76 + Math.round(Math.random() * 6 - 3)));
    state.revenueRisk = 684000 + Math.round(Math.random() * 24000 - 12000);
    state.lastUpdated = "Updated just now";
    state.refreshing = false;
    state.syncing = false;
    render();
    showToast("Analysis refreshed", "success");
  }, 1600);
}

function connectProvider(e) {
  e.preventDefault();
  const inputs = [...e.target.querySelectorAll("input")];
  let ok = true;
  e.target.querySelectorAll(".input-error-msg").forEach(n => n.remove());
  inputs.forEach(i => {
    i.classList.remove("input--error");
    if (!i.value.trim()) {
      errorAfter(i, `${i.closest(".field")?.querySelector("label")?.textContent || "This field"} is required`);
      ok = false;
    }
  });
  if (!ok) return;
  state.providerBusy = true; render();
  setTimeout(() => {
    state.providerBusy = false;
    state.checklist.pos = true;
    state.syncing = true;
    render();
    showToast(`Connected to ${providerName(state.selectedProvider)}`, "success");
    setTimeout(() => { state.syncing = false; render(); }, 500);
  }, 1800);
}

function syncSource(source) {
  state.providerBusy = source;
  render();
  setTimeout(() => {
    if (source === "csv" && state.salesRecords.length) {
      state.connectionStatus.csv = { status: "connected", detail: `${state.salesRecords.length} rows available. No duplicate records created on sync.` };
      showToast("CSV source re-synced without duplicates.", "success");
    } else if (source === "csv") {
      state.connectionStatus.csv = { status: "not connected", detail: "Upload a sales CSV before syncing." };
      showToast("Upload a CSV first.", "error");
    } else {
      state.connectionStatus[source] = { status: "needs re-auth", detail: `${providerName(source)} OAuth credentials are not configured yet.` };
      showToast(`${providerName(source)} needs provider credentials before sync.`, "error");
    }
    saveStoredJson("ll_connection_status", state.connectionStatus);
    state.providerBusy = false;
    render();
  }, 900);
}

function handleCsvFile(e) {
  loadCsvFile(e.target.files[0]);
}

function loadCsvFile(file) {
  if (!file) return;
  if (!/\.csv$/i.test(file.name)) return showToast("Choose a CSV file.", "error");
  state.csv = { name: file.name, loading: true, records: null, errors: [] };
  render();
  file.text().then(text => setTimeout(() => {
    const parsed = parseSalesCsv(text);
    if (!parsed.records.length && !parsed.errors.length) {
      state.csv = null;
      render();
      showToast("CSV file is empty.", "error");
      return;
    }
    state.csv = { name: file.name, records: parsed.records, errors: parsed.errors };
    state.connectionStatus.csv = parsed.errors.length
      ? { status: "error", detail: `${parsed.records.length} valid rows, ${parsed.errors.length} rows need cleanup.` }
      : { status: "ready", detail: `${parsed.records.length} valid sales rows ready to import.` };
    saveStoredJson("ll_connection_status", state.connectionStatus);
    render();
  }, 1200)).catch(() => {
    state.csv = null;
    render();
    showToast("Could not read that CSV file.", "error");
  });
}

function parseSalesCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean).map(parseCsvLine);
  if (!lines.length) return { records: [], errors: [] };
  const header = lines[0].map(h => h.trim().toLowerCase());
  const find = names => names.map(n => header.indexOf(n)).find(i => i >= 0);
  const idx = {
    sku: find(["sku"]),
    date: find(["date"]),
    quantity: find(["quantity sold", "quantity", "qty", "units sold"]),
    location: find(["location", "store", "warehouse"]),
  };
  const missing = Object.entries(idx).filter(([, i]) => i === undefined).map(([k]) => k);
  if (missing.length) return { records: [], errors: [`Missing required column(s): ${missing.join(", ")}. Expected SKU, date, quantity sold, location.`] };
  const records = [];
  const errors = [];
  lines.slice(1).forEach((row, offset) => {
    const line = offset + 2;
    const sku = String(row[idx.sku] || "").trim();
    const date = String(row[idx.date] || "").trim();
    const quantity = Number(row[idx.quantity]);
    const location = String(row[idx.location] || "").trim();
    if (!sku) errors.push(`Line ${line}: SKU is required.`);
    if (!date || Number.isNaN(Date.parse(date))) errors.push(`Line ${line}: date must be valid.`);
    if (!Number.isFinite(quantity) || quantity < 0) errors.push(`Line ${line}: quantity sold must be a positive number.`);
    if (!location) errors.push(`Line ${line}: location is required.`);
    if (sku && date && Number.isFinite(quantity) && quantity >= 0 && location) {
      records.push({ sku, date: new Date(date).toISOString().slice(0, 10), quantity, location });
    }
  });
  return { records, errors };
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function importCsv() {
  state.providerBusy = true; render();
  setTimeout(() => {
    state.providerBusy = false;
    const incoming = state.csv?.records || [];
    const key = row => `${row.sku}|${row.date}|${row.location}`;
    const existing = new Map(state.salesRecords.map(row => [key(row), row]));
    incoming.forEach(row => existing.set(key(row), row));
    state.salesRecords = [...existing.values()];
    saveStoredJson("ll_sales_records", state.salesRecords);
    state.connectionStatus.csv = { status: "connected", detail: `${state.salesRecords.length} historical sales rows imported. Last sync just now.` };
    saveStoredJson("ll_connection_status", state.connectionStatus);
    state.checklist.sales = true;
    state.checklist.inventory = true;
    state.checklist.analysis = true;
    render();
    showToast("CSV sales imported and forecast dashboard updated", "success");
  }, 2000);
}

function exportReorders() {
  const rows = activeSkuData()
    .map(sku => ({ sku, reorder: reorderSuggestion(sku) }))
    .filter(item => item.reorder.quantity > 0);
  if (!rows.length) return showToast("No reorder rows to export.", "info");
  const csv = [
    ["SKU", "Product", "Suggested Quantity", "Order By", "Reason"],
    ...rows.map(({ sku, reorder }) => [sku.sku, sku.product, reorder.quantity, reorder.orderBy, reorder.reason]),
  ].map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  downloadText(`liquiditylens-reorders-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  showToast("Reorder CSV exported.", "success");
}

function runChecklist(key) {
  if (key === "inventory" && !state.checklist.sales) return showToast("Import sales first", "error");
  if (key === "analysis" && (!state.checklist.sales || !state.checklist.inventory)) return showToast("Import sales and inventory first", "error");
  state.checklistBusy = key; render();
  setTimeout(() => {
    state.checklist[key] = true;
    state.checklistBusy = "";
    render();
    showToast(key === "analysis" ? "Analysis report generated" : `${key === "sales" ? "Sales" : "Inventory"} imported`, "success");
  }, 1500);
}

function sendMessage(e) {
  e.preventDefault();
  const text = e.target.message.value.trim();
  if (!text) return showToast("Message cannot be empty", "error");
  state.marketplaceBusy = true; render();
  setTimeout(() => {
    const retailer = state.selectedRetailer.retailer;
    state.marketplaceBusy = false;
    state.messageSent = `Request sent to ${retailer}. They typically respond within 24 hours.`;
    render();
    showToast(`Transaction request sent to ${retailer}.`, "success");
    setTimeout(() => { state.selectedRetailer = listings[0]; state.messageSent = ""; render(); }, 3000);
  }, 1800);
}

function approveTransfer(index) {
  const suggestion = transferSuggestions()[index];
  if (!suggestion) return showToast("Transfer suggestion is no longer available.", "error");
  const record = { id: Date.now(), status: "pending", createdAt: new Date().toISOString(), ...suggestion };
  state.transferRecords.unshift(record);
  saveStoredJson("ll_transfer_records", state.transferRecords);
  showToast("Transfer approved and queued.", "success");
  render();
}

function advanceTransfer(id) {
  state.transferRecords = state.transferRecords.map(record => {
    if (record.id !== id) return record;
    if (record.status === "pending") return { ...record, status: "in transit" };
    if (record.status === "in transit") return { ...record, status: "received", receivedAt: new Date().toISOString() };
    return record;
  });
  saveStoredJson("ll_transfer_records", state.transferRecords);
  showToast("Transfer status updated.", "success");
  render();
}

function postCommunity(e) {
  e.preventDefault();
  const text = e.target.post.value.trim();
  if (!state.selectedTopic || !text) return showToast("Choose a topic and add a message", "error");
  state.postBusy = true; render();
  setTimeout(() => {
    state.posts.unshift({ id: Date.now(), author: "Northstar Retail", topic: state.selectedTopic, time: "just now", text });
    state.selectedTopic = null;
    state.postBusy = false;
    render();
    showToast("Post shared with your retailer network.", "success");
  }, 800);
}

async function updateProfile(e) {
  e.preventDefault();
  const form = e.currentTarget;
  form.querySelectorAll(".input-error-msg").forEach(n => n.remove());
  form.querySelectorAll(".input--error").forEach(n => n.classList.remove("input--error"));
  const firstName = form.firstName;
  const lastName = form.lastName;
  let ok = true;
  if (!firstName.value.trim()) { errorAfter(firstName, "First name is required"); ok = false; }
  if (!lastName.value.trim()) { errorAfter(lastName, "Last name is required"); ok = false; }
  if (!ok) return;

  state.profileBusy = true;
  render();
  try {
    const data = await apiPatch("/api/auth/profile", { firstName: firstName.value, lastName: lastName.value });
    state.authUser = data.user;
    state.accessToken = data.token;
    showToast("Profile updated.", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    state.profileBusy = false;
    render();
  }
}

async function changePassword(e) {
  e.preventDefault();
  const form = e.currentTarget;
  if (!validateAuthForm(form, "reset")) return;
  const values = Object.fromEntries(new FormData(form).entries());
  state.passwordBusy = true;
  render();
  try {
    await apiAuthedPost("/api/auth/change-password", values);
    state.accessToken = null;
    state.authUser = null;
    showToast("Password updated. Sign in again.", "success");
    replacePath("/login");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    state.passwordBusy = false;
    render();
  }
}

async function sendProfileReset() {
  if (!state.authUser?.email) return showToast("No email found for this account.", "error");
  state.profileBusy = true;
  render();
  try {
    await apiAuth("/api/auth/forgot-password", { email: state.authUser.email });
    showToast("Password reset email sent if the account supports password login.", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    state.profileBusy = false;
    render();
  }
}

async function startMfaSetup(e) {
  e.preventDefault();
  const form = e.currentTarget;
  form.querySelectorAll(".input-error-msg").forEach(n => n.remove());
  form.querySelectorAll(".input--error").forEach(n => n.classList.remove("input--error"));
  const values = Object.fromEntries(new FormData(form).entries());
  if (values.method === "phone" && !/^\+?[1-9]\d{9,14}$/.test(String(values.phone || "").replace(/[\s().-]/g, ""))) {
    errorAfter(form.phone, "Enter a valid phone number with country code");
    return;
  }

  state.mfaSetupBusy = true;
  state.mfaSetupMethod = values.method;
  state.mfaSetupChallengeId = "";
  render();
  try {
    const data = await apiAuthedPost("/api/auth/mfa/setup/start", values);
    state.mfaSetupChallengeId = data.challengeId;
    state.mfaSetupDestination = data.destination;
    state.mfaSetupMethod = data.method;
    showToast(`Verification code sent to ${data.destination}.`, "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    state.mfaSetupBusy = false;
    render();
  }
}

async function confirmMfaSetup(e) {
  e.preventDefault();
  const form = e.currentTarget;
  form.querySelectorAll(".input-error-msg").forEach(n => n.remove());
  form.querySelectorAll(".input--error").forEach(n => n.classList.remove("input--error"));
  const code = String(form.code.value || "").trim();
  if (!/^\d{6}$/.test(code)) {
    errorAfter(form.code, "Enter the 6-digit code");
    return;
  }

  state.mfaSetupBusy = true;
  render();
  try {
    const data = await apiAuthedPost("/api/auth/mfa/setup/confirm", { challengeId: state.mfaSetupChallengeId, code });
    state.authUser = data.user;
    state.accessToken = data.token;
    state.mfaSetupChallengeId = "";
    state.mfaSetupDestination = "";
    showToast("Two-factor authentication enabled.", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    state.mfaSetupBusy = false;
    render();
  }
}

async function disableMfa() {
  state.mfaSetupBusy = true;
  render();
  try {
    const data = await apiAuthedPost("/api/auth/mfa/disable", {});
    state.authUser = data.user;
    state.accessToken = data.token;
    state.mfaSetupChallengeId = "";
    state.mfaSetupDestination = "";
    showToast("Two-factor authentication disabled.", "info");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    state.mfaSetupBusy = false;
    render();
  }
}

function openHow() {
  modalRoot.innerHTML = `<div class="modal-overlay" data-modal-close><article class="modal-card" role="dialog" aria-modal="true"><button class="btn-icon modal-close" data-modal-x aria-label="Close">${icon("x")}</button><h2 class="text-xl">How LiquidityLens works</h2><ol class="steps"><li><div><strong>Connect your store</strong><p>Link your POS or ERP system in under 2 minutes using OAuth or API keys.</p></div></li><li><div><strong>Import your data</strong><p>LiquidityLens pulls your sales history, current inventory levels, and product catalog.</p></div></li><li><div><strong>Get your forecast</strong><p>ARIMA and XGBoost models generate an 8-week demand forecast blended into one ensemble output.</p></div></li><li><div><strong>Act on recommendations</strong><p>Each SKU gets a clear action: buy, sell, hold, or transfer, with quantities and urgency.</p></div></li><li><div><strong>Track your savings</strong><p>See recovered revenue, avoided stockouts, and reduced markdowns in the executive report.</p></div></li></ol></article></div>`;
  modalRoot.querySelector("[data-modal-close]").addEventListener("click", e => { if (e.target.dataset.modalClose !== undefined || e.target.closest("[data-modal-x]")) modalRoot.innerHTML = ""; });
}

function downloadReport() {
  state.reportBusy = true; render();
  setTimeout(() => {
    const iso = new Date().toISOString().slice(0, 10);
    const csv = [
      ["LiquidityLens Executive Report", new Date().toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" })],
      [],
      ["Inventory Health Summary"],
      ["Risk Score", "76 (HIGH)"],
      ["Revenue at Risk", "$684,000"],
      ["Excess Cost", "$312,000"],
      ["Total Inventory Value", "$12,800,000"],
      ["Transfer Units Recommended", "1,842"],
      [],
      ["Top Transfer Recommendation", "Midwest Outdoor Co.", "38 miles", "94% match", "$48,200 savings"],
      ["SKU Action Summary", "Buy: 3 SKUs (2,170 units)", "Sell: 3 SKUs (1,126 units)", "Transfer: 2 SKUs (672 units)", "Hold: 4 SKUs"],
      ["Generated by LiquidityLens", "Confidential"],
    ].map(r => r.map(c => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    downloadText(`LiquidityLens-Report-${iso}.csv`, csv);
    state.reportBusy = false;
    render();
    showToast("Report downloaded.", "success");
  }, 1200);
}

function downloadText(filename, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function scrollHighlighted() {
  if (!state.highlightedSku) return;
  document.getElementById(`sku-${state.highlightedSku}`)?.scrollIntoView({ block: "center" });
}

function lineChart(data, w, h) {
  const pad = { l: 52, r: 18, t: 18, b: 34 };
  const vals = data.flatMap(d => [d.lower, d.upper, d.arima, d.xgboost, d.ensemble]);
  const min = Math.min(...vals) - 8000, max = Math.max(...vals) + 8000;
  const x = i => pad.l + i * ((w - pad.l - pad.r) / (data.length - 1));
  const y = v => h - pad.b - ((v - min) / (max - min)) * (h - pad.t - pad.b);
  const path = key => data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d[key])}`).join(" ");
  const area = `${data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.upper)}`).join(" ")} ${[...data].reverse().map((d, i) => `L${x(data.length - 1 - i)},${y(d.lower)}`).join(" ")} Z`;
  return `<svg viewBox="0 0 ${w} ${h}">${[0, 1, 2, 3].map(i => `<line class="chart-grid" x1="${pad.l}" x2="${w - pad.r}" y1="${pad.t + i * 55}" y2="${pad.t + i * 55}"/>`).join("")}<path d="${area}" fill="var(--accent-dim)"/><path d="${path("arima")}" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-dasharray="5 5"/><path d="${path("xgboost")}" fill="none" stroke="var(--blue)" stroke-width="1.5"/><path d="${path("ensemble")}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>${data.map((d, i) => {
    const variance = Math.round(((d.upper - d.lower) / d.ensemble) * 100);
    const tip = `<strong>${d.week} demand forecast</strong>
      <span>Ensemble: ${fmt(d.ensemble)} units</span>
      <span>XGBoost: ${fmt(d.xgboost)} units</span>
      <span>ARIMA: ${fmt(d.arima)} units</span>
      <span>Confidence: ${fmt(d.lower)}-${fmt(d.upper)} units (${variance}% band)</span>`;
    return `<g class="chart-point" tabindex="0" data-chart-tip="${attr(tip)}"><line x1="${x(i)}" x2="${x(i)}" y1="${pad.t}" y2="${h - pad.b}" class="chart-hit-line"/><circle cx="${x(i)}" cy="${y(d.ensemble)}" r="12" fill="var(--bg-base)" opacity="0.001"/><circle cx="${x(i)}" cy="${y(d.ensemble)}" r="4" fill="var(--accent)"/></g><text x="${x(i)}" y="${h - 10}" text-anchor="middle">${d.week}</text>`;
  }).join("")}</svg>`;
}

function skuForecastChart(data, w, h) {
  const pad = { l: 46, r: 18, t: 18, b: 34 };
  const vals = data.flatMap(d => [d.history, d.prediction, d.lower, d.upper]).filter(v => Number.isFinite(v));
  const max = Math.max(10, ...vals) * 1.25;
  const x = i => pad.l + i * ((w - pad.l - pad.r) / Math.max(1, data.length - 1));
  const y = v => h - pad.b - (v / max) * (h - pad.t - pad.b);
  const pathFor = key => data.filter(d => Number.isFinite(d[key])).map((d, i, arr) => {
    const originalIndex = data.indexOf(d);
    return `${i ? "L" : "M"}${x(originalIndex)},${y(d[key])}`;
  }).join(" ");
  const future = data.filter(d => Number.isFinite(d.prediction));
  const area = future.length ? `${future.map((d, i) => `${i ? "L" : "M"}${x(data.indexOf(d))},${y(d.upper)}`).join(" ")} ${[...future].reverse().map(d => `L${x(data.indexOf(d))},${y(d.lower)}`).join(" ")} Z` : "";
  return `<svg viewBox="0 0 ${w} ${h}">${[0, 1, 2, 3].map(i => `<line class="chart-grid" x1="${pad.l}" x2="${w - pad.r}" y1="${pad.t + i * 55}" y2="${pad.t + i * 55}"/>`).join("")}${area ? `<path d="${area}" fill="var(--accent-dim)"/>` : ""}<path d="${pathFor("history")}" fill="none" stroke="var(--text-muted)" stroke-width="2"/><path d="${pathFor("prediction")}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>${data.map((d, i) => {
    const value = Number.isFinite(d.history) ? d.history : d.prediction;
    const tip = `<strong>${d.label}</strong><span>${Number.isFinite(d.history) ? `Historical sales: ${fmt(d.history)}` : `Predicted demand: ${fmt(d.prediction)}`}</span>${Number.isFinite(d.lower) ? `<span>Confidence: ${fmt(d.lower)}-${fmt(d.upper)}</span>` : ""}`;
    return `<g class="chart-point" tabindex="0" data-chart-tip="${attr(tip)}"><circle cx="${x(i)}" cy="${y(value)}" r="12" fill="var(--bg-base)" opacity="0.001"/><circle cx="${x(i)}" cy="${y(value)}" r="4" fill="${Number.isFinite(d.history) ? "var(--text-muted)" : "var(--accent)"}"/></g><text x="${x(i)}" y="${h - 10}" text-anchor="middle">${d.label}</text>`;
  }).join("")}</svg>`;
}

function areaChart() {
  const w = 520, h = 220, p = 34, max = 28;
  const x = i => p + i * ((w - p * 2) / (monteCarloData.length - 1));
  const y = v => h - p - (v / max) * (h - p * 2);
  const d = monteCarloData.map((m, i) => `${i ? "L" : "M"}${x(i)},${y(m.probability)}`).join(" ");
  const thresholdX = x(monteCarloData.findIndex(m => m.outcome === 40));
  return `<svg viewBox="0 0 ${w} ${h}"><path d="${d} L${w - p},${h - p} L${p},${h - p}Z" fill="var(--blue-dim)"/><path d="${d}" fill="none" stroke="var(--blue)" stroke-width="2"/><line x1="${thresholdX}" x2="${thresholdX}" y1="${p}" y2="${h - p}" stroke="var(--red)" stroke-dasharray="4 4"/><text x="${thresholdX + 8}" y="${p + 14}" fill="var(--red)">Risk threshold</text><text x="${p}" y="${p + 14}" fill="var(--blue)">Safe range</text><text x="${thresholdX + 70}" y="${p + 34}" fill="var(--red)">High risk</text>${monteCarloData.map((m, i) => {
    const zone = m.outcome >= 40 ? "High risk" : "Safe range";
    const tip = `<strong>${m.outcome >= 0 ? "+" : ""}${m.outcome}% demand outcome</strong><span>Probability: ${m.probability}%</span><span>Risk zone: ${zone}</span><span>Planning note: ${m.outcome >= 40 ? "Prepare transfer or emergency buy options." : "Covered by current stock buffer."}</span>`;
    return `<g class="chart-point" tabindex="0" data-chart-tip="${attr(tip)}"><circle cx="${x(i)}" cy="${y(m.probability)}" r="12" fill="var(--bg-base)" opacity="0.001"/><circle cx="${x(i)}" cy="${y(m.probability)}" r="4" fill="var(--blue)"/></g>`;
  }).join("")}</svg>`;
}

function barChart() {
  const w = 520, h = 180, p = 28, max = 235000, bw = (w - p * 2) / seasonalData.length - 8;
  const avg = seasonalData.reduce((sum, m) => sum + m.demand, 0) / seasonalData.length;
  return `<svg viewBox="0 0 ${w} ${h}">${seasonalData.map((m, i) => {
    const bh = (m.demand / max) * (h - p * 2);
    const current = m.month === "Jun";
    const xPos = p + i * (bw + 8);
    const yPos = h - p - bh;
    const lift = Math.round(((m.demand - avg) / avg) * 100);
    const tip = `<strong>${m.month} seasonal demand</strong><span>Demand: ${fmt(m.demand)} units</span><span>${lift >= 0 ? "+" : ""}${lift}% vs annual average</span><span>${current ? "Current month: watch stockouts weekly." : "Use for buying and transfer timing."}</span>`;
    return `<g class="chart-bar" tabindex="0" data-chart-tip="${attr(tip)}"><rect x="${xPos - 3}" y="${p}" width="${bw + 6}" height="${h - p * 2}" fill="var(--bg-base)" opacity="0.001"/><rect x="${xPos}" y="${yPos}" width="${bw}" height="${bh}" rx="3" fill="var(--accent)" opacity="${current ? "1" : ".6"}" ${current ? 'filter="drop-shadow(0 0 8px var(--accent))"' : ""}/></g><text x="${xPos + bw / 2}" y="${h - 8}" text-anchor="middle">${m.month}</text>`;
  }).join("")}</svg>`;
}

function drawForecastCharts() {}

function bindChartTips() {
  document.querySelectorAll("[data-chart-tip]").forEach(el => {
    el.addEventListener("mouseenter", showChartTip);
    el.addEventListener("mousemove", moveChartTip);
    el.addEventListener("focus", showChartTip);
    el.addEventListener("click", showChartTip);
    el.addEventListener("mouseleave", hideChartTip);
    el.addEventListener("blur", hideChartTip);
  });
}

function chartTip() {
  let tip = document.getElementById("chartTip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "chartTip";
    tip.className = "chart-tip hidden";
    document.body.appendChild(tip);
  }
  return tip;
}

function showChartTip(e) {
  const tip = chartTip();
  tip.innerHTML = e.currentTarget.dataset.chartTip;
  tip.classList.remove("hidden");
  e.currentTarget.classList.add("active");
  moveChartTip(e);
}

function moveChartTip(e) {
  const tip = chartTip();
  const source = e.currentTarget;
  const point = e.touches?.[0] || e;
  const rect = source.getBoundingClientRect();
  const x = Number.isFinite(point.clientX) ? point.clientX : rect.left + rect.width / 2;
  const y = Number.isFinite(point.clientY) ? point.clientY : rect.top;
  tip.style.left = `${Math.min(window.innerWidth - tip.offsetWidth - 12, x + 14)}px`;
  tip.style.top = `${Math.max(12, y - tip.offsetHeight - 12)}px`;
}

function hideChartTip(e) {
  e.currentTarget.classList.remove("active");
  chartTip().classList.add("hidden");
}

window.addEventListener("popstate", () => { state.path = location.pathname in routes ? location.pathname : "/"; render(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") { modalRoot.innerHTML = ""; state.searchOpen = false; state.notificationsOpen = false; render(); } });
document.addEventListener("click", e => {
  if (!e.target.closest(".topbar-search") && state.searchOpen) { state.searchOpen = false; render(); }
});

document.documentElement.dataset.theme = localStorage.getItem("ll_theme") === "light" ? "light" : "dark";

async function bootAuth() {
  const params = new URLSearchParams(location.search);
  const oauthError = params.get("error");
  const mfaChallenge = params.get("mfa");
  if (location.pathname === "/reset-password") state.authMode = "reset";
  if (oauthError) {
    state.authMessage = oauthError;
    replacePath("/login");
  }
  if (mfaChallenge) {
    state.mfaChallengeId = mfaChallenge;
    state.mfaMethod = params.get("method") || "";
    state.mfaDestination = params.get("destination") || "";
    state.mfaRedirectTo = params.get("redirectTo") || "/dashboard";
    state.authMode = "mfa";
    state.authMessage = `Enter the code sent to ${state.mfaDestination || "your verification method"}.`;
    replacePath("/login");
  }
  if (canUseAppRoutes()) {
    try {
      const data = await apiAuth("/api/auth/refresh", {});
      state.accessToken = data.token;
      state.authUser = data.user;
    } catch {
      state.accessToken = null;
      state.authUser = null;
    }
  } else {
    state.accessToken = null;
    state.authUser = null;
  }
  state.authReady = true;
  if (!auth() && !authRoutes.has(location.pathname)) {
    if (!publicRoutes.has(location.pathname)) {
      sessionStorage.setItem("ll_redirect_after_login", location.pathname in routes ? location.pathname : "/dashboard");
      replacePath("/login");
    }
  }
  if (auth() && authRoutes.has(location.pathname)) {
    const next = sessionStorage.getItem("ll_redirect_after_login") || "/dashboard";
    sessionStorage.removeItem("ll_redirect_after_login");
    replacePath(next);
  }
  state.path = location.pathname in routes ? location.pathname : "/dashboard";
  render();
  setTimeout(() => { state.loading = false; render(); }, 900);
}

render();
bootAuth();
