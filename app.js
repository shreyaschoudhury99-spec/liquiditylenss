const app = document.getElementById("app");
const toastRoot = document.getElementById("toastRoot");
const modalRoot = document.getElementById("modalRoot");

const routes = {
  "/": "Home",
  "/platform": "Platform",
  "/features": "Features",
  "/solutions": "Solutions",
  "/pricing": "Pricing",
  "/resources": "Resources",
  "/blog": "Blog",
  "/docs": "Documentation",
  "/security": "Security",
  "/integrations": "Integrations",
  "/about": "About",
  "/contact": "Contact",
  "/book-demo": "Book Demo",
  "/dashboard": "Dashboard",
  "/connect": "Connect Store",
  "/forecasts": "Forecasts",
  "/inventory": "Inventory",
  "/analytics": "Advanced Analytics",
  "/marketplace": "Marketplace",
  "/social": "Social Signals",
  "/community": "Community",
  "/admin": "Admin",
  "/reports": "Reports",
  "/profile": "Profile",
};
const authRoutes = new Set(["/login", "/reset-password"]);
const publicRoutes = new Set(["/", "/platform", "/features", "/solutions", "/pricing", "/resources", "/blog", "/docs", "/security", "/integrations", "/about", "/contact", "/book-demo"]);

const navItems = [
  ["/dashboard", "Dashboard", "layout-dashboard"],
  ["/connect", "Connect Store", "plug"],
  ["/forecasts", "Forecasts", "chart-line"],
  ["/inventory", "Inventory", "boxes"],
  ["/analytics", "Advanced Analytics", "calculator"],
  ["/marketplace", "Marketplace", "store"],
  ["/social", "Social Signals", "messages"],
  ["/community", "Community", "messages"],
  ["/admin", "Admin", "shield"],
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

const pricingTiers = [
  {
    name: "Starter",
    size: "Independent retailers (1-5 locations)",
    price: "$79",
    cadence: "/month",
    annual: "$948/year",
    summary: "Best for independent retailers that need connected data, forecasting, and risk visibility without extra workflow complexity.",
    features: ["Shopify Integration", "ERP & Inventory System Integration", "CSV Import & Export", "ARIMA & XGBoost Forecasting", "Monte Carlo Risk Analysis", "Inventory Risk Score", "Revenue at Risk Dashboard", "Demand Forecasting", "Inventory Alerts", "Basic Reports", "Email Support"],
    cta: "Start Starter",
  },
  {
    name: "Growth",
    size: "Growing regional retailers (5-25 locations)",
    price: "$199",
    cadence: "/month",
    annual: "$2,388/year",
    summary: "Best for growing regional retailers that need marketplace coordination, team collaboration, and multi-location inventory planning.",
    features: ["Everything in Starter", "Marketplace Access", "Inventory Transfer Recommendations", "Multi-Location Inventory Dashboard", "Team Collaboration", "Automated Weekly Reports", "Marketplace Matching Engine", "Advanced Inventory Analytics", "Priority Support"],
    cta: "Choose Growth",
    featured: true,
  },
  {
    name: "Professional",
    size: "Multi-region retailers (25-100 locations)",
    price: "$499",
    cadence: "/month",
    annual: "$5,988/year",
    summary: "Best for multi-region retailers that need executive analytics, custom reporting, advanced optimization, and scenario planning.",
    features: ["Everything in Growth", "Executive Analytics Dashboard", "Custom Report Builder", "Role-Based Access Control", "Scheduled Analytics Reports", "Marketplace Performance Analytics", "Advanced Optimization Engine", "Forecast Comparison & Scenario Planning", "Dedicated Customer Success Manager"],
    cta: "Choose Professional",
  },
  {
    name: "Enterprise",
    size: "National retail chains (100+ locations)",
    price: "Custom",
    cadence: "",
    annual: "Up to approx. $10,000/year",
    summary: "Best for national retail chains that need white-glove onboarding, custom integrations, SLAs, and training for operations teams.",
    features: ["Everything in Professional", "White-Glove Onboarding", "Dedicated Account Manager", "Custom Integrations", "Private API Endpoints", "SLA & Priority Support", "Early Feature Access", "Custom Analytics & Dashboards", "Training for Operations Teams"],
    cta: "Contact Enterprise",
  },
];

const pricingComparisonRows = [
  ["Shopify Integration", true, true, true, true],
  ["ERP / IMS Integration", true, true, true, true],
  ["CSV Import & Export", true, true, true, true],
  ["ARIMA Forecasting", true, true, true, true],
  ["XGBoost Forecasting", true, true, true, true],
  ["Monte Carlo Simulation", true, true, true, true],
  ["Inventory Risk Score", true, true, true, true],
  ["Revenue at Risk Dashboard", true, true, true, true],
  ["Demand Forecasting", true, true, true, true],
  ["Inventory Alerts", true, true, true, true],
  ["Basic Reports", true, true, true, true],
  ["Email Support", true, true, true, true],
  ["Marketplace Access", false, true, true, true],
  ["Transfer Recommendations", false, true, true, true],
  ["Multi-Location Inventory Dashboard", false, true, true, true],
  ["Team Collaboration", false, true, true, true],
  ["Automated Weekly Reports", false, true, true, true],
  ["Marketplace Matching Engine", false, true, true, true],
  ["Advanced Analytics", false, true, true, true],
  ["Priority Support", false, true, true, true],
  ["Executive Dashboards", false, false, true, true],
  ["Custom Report Builder", false, false, true, true],
  ["Role-Based Access Control", false, false, true, true],
  ["Scheduled Analytics Reports", false, false, true, true],
  ["Marketplace Performance Analytics", false, false, true, true],
  ["Advanced Optimization Engine", false, false, true, true],
  ["Scenario Planning", false, false, true, true],
  ["Dedicated Customer Success Manager", false, false, true, true],
  ["Custom Dashboards", false, false, true, true],
  ["White-Glove Onboarding", false, false, false, true],
  ["Dedicated Account Manager", false, false, false, true],
  ["Custom Integrations", false, false, false, true],
  ["Private API Endpoints", false, false, false, true],
  ["SLA & Priority Support", false, false, false, true],
  ["Early Feature Access", false, false, false, true],
  ["Training for Operations Teams", false, false, false, true],
];

const marketingNav = [
  ["/platform", "Platform"],
  ["/features", "Features"],
  ["/solutions", "Solutions"],
  ["/pricing", "Pricing"],
  ["/resources", "Resources"],
  ["/security", "Security"],
];

const companyLinks = {
  email: "liquiditylink@gmail.com",
  linkedin: "https://www.linkedin.com/company/liquiditylink",
  instagram: "https://www.instagram.com/liquiditylink/",
};

const juneJulyMetrics = [
  { key: "instagramFollowers", value: "250+", label: "Instagram followers", detail: "Followers since the first LiquidityLink Instagram launch posts in July." },
  { key: "retailers", value: "7", label: "Local retailers connected", detail: "Retailers ready to kick-start the pilot program." },
  { key: "interns", value: "5", label: "Interns recruited", detail: "Supporting outreach, marketing, website development, and business administration." },
  { key: "linkedinImpressions", value: "500+", label: "LinkedIn impressions", detail: "Since the company page was created on 7/22." },
];

const buyerQuestions = [
  {
    question: "Why should I care?",
    headline: "Inventory mistakes are cash-flow mistakes.",
    copy: "LiquidityLink helps retailers prevent stockouts, reduce excess inventory, and make replenishment decisions before margin is lost.",
    visual: "A risk board showing forecasted demand, inventory exposure, and recommended actions by SKU.",
  },
  {
    question: "How does it work?",
    headline: "Connect sales data. Model demand. Act on the exceptions.",
    copy: "The platform ingests POS, commerce, and CSV data, normalizes it by SKU and location, and turns demand signals into buy, hold, sell, and transfer recommendations.",
    visual: "A three-step flow from data sources to forecast models to operator actions.",
  },
  {
    question: "Why is AI better?",
    headline: "Forecasts improve when models see the full operating context.",
    copy: "Instead of a static reorder point, LiquidityLink blends observed velocity, seasonality, confidence bands, inventory on hand, and price exposure.",
    visual: "Forecast bands comparing baseline, adjusted, and ensemble demand.",
  },
  {
    question: "Can I trust you?",
    headline: "Built for enterprise governance from the first integration.",
    copy: "Security, auditability, role-based access, and transparent model explanations are part of the product, not enterprise add-ons.",
    visual: "Security controls, data lineage, and model explanation cards.",
  },
];

const enterpriseFaqs = [
  ["How quickly can a retailer start seeing value?", "Most teams can run a pilot from CSV or Shopify data in days. Enterprise rollouts usually start with one region, one category, or one banner before expanding."],
  ["Do we need perfect historical data?", "No. LiquidityLink flags limited history, widens confidence bands, and separates measured signals from assumptions so planners know where the model is certain."],
  ["Does this replace planners?", "No. It gives planners earlier warnings, quantified risk, and clear action queues so they can spend less time hunting through reports."],
  ["Can executives trust the numbers?", "Every forecast is tied back to observed demand, inventory position, model confidence, and the business rule used to produce the recommendation."],
  ["What integrations are supported?", "CSV upload, Shopify, Clover, and Square are the current connection paths. The architecture is ready for ERPs, data warehouses, and private APIs."],
  ["How do pilots work?", "We define a target outcome, connect a limited data set, measure forecast accuracy and working-capital impact, then present an executive readout with expansion options."],
  ["What about data security?", "The product uses server-side secrets, authenticated sessions, access controls, and audit-oriented operational pages. Enterprise SSO, SOC 2 readiness, and custom retention policies can be added for larger deployments."],
  ["How is LiquidityLink different from a BI dashboard?", "BI tools explain what already happened. LiquidityLink turns inventory data into forward-looking decisions, ranked risks, and replenishment actions."],
];

const providerFields = {
  shopify: [{ label: "Storefront URL", type: "text", placeholder: "yourstore.myshopify.com" }, { label: "Admin API Key", type: "password", placeholder: "shpat_..." }],
  square: [{ label: "Location ID", type: "text", placeholder: "LXXXXXXXXXXXXXXXXX" }, { label: "Access Token", type: "password", placeholder: "EAAAl..." }],
  lightspeed: [{ label: "Account ID", type: "text", placeholder: "12345" }, { label: "API Key", type: "password", placeholder: "ls_key_..." }],
  clover: [{ label: "Merchant ID", type: "text", placeholder: "Optional: MXXXXXXXXXX" }],
  netsuite: [{ label: "Account ID", type: "text", placeholder: "1234567" }, { label: "Consumer Key", type: "password", placeholder: "ns_key_..." }, { label: "Consumer Secret", type: "password", placeholder: "ns_sec_..." }],
  sap: [{ label: "System URL", type: "url", placeholder: "https://your-sap-system.com" }, { label: "Client ID", type: "text", placeholder: "client_id_..." }, { label: "Client Secret", type: "password", placeholder: "client_sec_..." }],
  csv: null,
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
  authFieldError: null,
  loading: true,
  syncing: false,
  sidebarOpen: false,
  marketingMenuOpen: false,
  search: "",
  searchOpen: false,
  highlightedSku: Number(sessionStorage.getItem("ll_highlight_sku")) || null,
  riskScore: 76,
  revenueRisk: 684000,
  lastUpdated: "Updated 14m ago",
  refreshing: false,
  selectedProvider: "shopify",
  marketingForecastModel: localStorage.getItem("ll_marketing_forecast_model") || "ensemble",
  securityControlMode: "access",
  selectedPricingTier: localStorage.getItem("ll_selected_pricing_tier") || "Growth",
  pricingComparisonExpanded: false,
  checklist: { pos: true, categories: true, sales: false, inventory: false, analysis: false },
  providerBusy: false,
  checklistBusy: "",
  salesRecords: [],
  inventoryItems: [],
  advancedAnalytics: null,
  enterprise: {
    overview: null,
    workspaces: [],
    pendingInvites: [],
    activeWorkspaceId: localStorage.getItem("ll_active_workspace_id") || "",
    users: [],
    alerts: [],
    notifications: [],
    settings: null,
    apiKeys: [],
    activity: [],
    demoRequests: [],
  },
  enterpriseError: "",
  adminBusy: false,
  inviteBusy: false,
  inviteMessage: "",
  inviteMessageType: "success",
  connectionStatus: {
    csv: { status: "not_connected", detail: "Upload a sales CSV to populate forecasts." },
    shopify: { status: "not_connected", detail: "Shopify OAuth is not configured yet." },
    clover: { status: "not_connected", detail: "Clover OAuth is not configured yet." },
    square: { status: "not_connected", detail: "Square OAuth is not configured yet." },
    instagram: { status: "not_connected", detail: "Instagram OAuth credentials are not configured yet." },
    tiktok: { status: "not_connected", detail: "TikTok OAuth credentials are not configured yet." },
    facebook: { status: "not_connected", detail: "Facebook page OAuth credentials are not configured yet." },
  },
  socialPromotions: [],
  socialPromotionBusy: false,
  socialProviderBusy: "",
  shopifyShop: "",
  cloverMerchantId: "",
  connectionsBusy: "",
  csv: null,
  inventoryFilter: "",
  actionFilter: "all",
  inventoryPage: 1,
  inventoryPageSize: 20,
  inventorySort: "risk_desc",
  typeFilter: "all",
  catFilter: "all",
  distFilter: 100,
  marketplaceBusinessQuery: "",
  marketplaceCityFilter: "",
  marketplaceStateFilter: "",
  marketplaceLocation: localStorage.getItem("ll_marketplace_location") || "",
  marketplaceListings: [],
  marketplaceOrigin: null,
  marketplaceDirectoryNote: "",
  marketplaceSearchBusy: false,
  marketplaceError: "",
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
  demoBusy: false,
  demoMessage: "",
  demoMessageType: "info",
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
    "credit-card": '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/><path d="M14 15h4"/>',
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
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8"/>',
    "globe-2": '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 0 20"/><path d="M12 2a15.3 15.3 0 0 0 0 20"/>',
    "map-pin": '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="m21 15-5-5L5 19"/>',
    tag: '<path d="M12.6 2.6H4a2 2 0 0 0-2 2v8.6a2 2 0 0 0 .6 1.4l6.8 6.8a2 2 0 0 0 2.8 0l9.2-9.2a2 2 0 0 0 0-2.8l-6.8-6.8a2 2 0 0 0-1.4-.6Z"/><circle cx="7.5" cy="7.5" r=".5"/>',
    calculator: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
}

function logo() {
  return `<div class="logo"><img class="logo-mark" src="assets/liquiditylink-logo.png?v=9" alt="" aria-hidden="true" /><span class="logo-title">LiquidityLink</span></div>`;
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function attr(value) {
  return esc(value).replaceAll("\n", "&#10;");
}

function displayNameFromShopifyAccount(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (url.hostname === "admin.shopify.com") {
      const storeIndex = url.pathname.split("/").filter(Boolean).indexOf("store");
      const storeSlug = url.pathname.split("/").filter(Boolean)[storeIndex + 1];
      if (storeSlug) return titleizeStoreSlug(storeSlug);
    }
    return titleizeStoreSlug(url.hostname.replace(/\.myshopify\.com$/i, "").split(".")[0]);
  } catch {
    return titleizeStoreSlug(raw.replace(/\.myshopify\.com$/i, "").split(/[/?#]/)[0]);
  }
}

function titleizeStoreSlug(value) {
  const words = String(value || "").replace(/[_-]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function workspaceName() {
  const activeWorkspace = state.enterprise?.workspaces?.find(workspace => workspace.id === state.enterprise.activeWorkspaceId);
  if (activeWorkspace?.name) return activeWorkspace.name;
  const overviewName = state.enterprise?.overview?.organization?.name;
  if (overviewName) return overviewName;
  const shopify = state.connectionStatus?.shopify;
  if (shopify?.status === "connected" && shopify.externalAccount) {
    return displayNameFromShopifyAccount(shopify.externalAccount) || shopify.externalAccount;
  }
  return "Northstar Retail";
}

function workspaceInitials() {
  return workspaceName().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase() || "LL";
}

function fmt(value) {
  const parsed = Number(value);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return safe.toLocaleString("en-US");
}

function fmtDecimal(value, places = 1) {
  const parsed = Number(value);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return safe.toLocaleString("en-US", { minimumFractionDigits: places, maximumFractionDigits: places });
}

function fmtPercent(value) {
  return `${fmtDecimal(value, 1)}%`;
}

function finiteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sumNumbers(values = []) {
  return values.reduce((sum, value) => sum + finiteNumber(value), 0);
}

function safeForecastPoint(row = {}, index = 0) {
  return {
    week: row.week || `Wk ${index + 1}`,
    arima: finiteNumber(row.arima ?? row.baseline),
    xgboost: finiteNumber(row.xgboost ?? row.adjusted),
    ensemble: finiteNumber(row.ensemble),
    lower: finiteNumber(row.lower),
    upper: finiteNumber(row.upper),
  };
}

function activeSkuData() {
  if (!state.salesRecords.length && !state.inventoryItems.length) return skuData;
  if (state.advancedAnalytics?.skus?.length) {
    return state.advancedAnalytics.skus.map((item, index) => ({
      ...item,
      id: index + 1,
      current: Math.max(0, Math.round(finiteNumber(item.current ?? item.currentUnits ?? item.onHand))),
      forecast: Math.max(0, Math.round(finiteNumber(item.forecast30d ?? sumNumbers(item.forecast8w)))),
      stockout: Math.max(0, Math.min(99, finiteNumber(item.stockoutRisk ?? (item.riskLabel === "high" ? item.riskScore : 0)))),
      overstock: (() => {
        const current = finiteNumber(item.current ?? item.currentUnits ?? item.onHand);
        const demand = finiteNumber(item.forecast30d ?? sumNumbers(item.forecast8w));
        return current ? Math.min(99, Math.max(0, ((current - demand) / current) * 100)) : 0;
      })(),
    }));
  }
  const hasSales = Boolean(state.salesRecords.length);
  const hasInventory = Boolean(state.inventoryItems.length);
  const bySku = new Map();
  const inventoryBySku = new Map();
  for (const item of state.inventoryItems) {
    const sku = String(item.sku || "").trim();
    if (!sku) continue;
    const current = inventoryBySku.get(sku) || { sku, product: item.product || sku, current: 0, price: 0, locations: new Set() };
    current.current += Number(item.current) || 0;
    current.price = Number(item.price) || current.price || 0;
    if (item.product) current.product = item.product;
    if (item.location) current.locations.add(item.location);
    inventoryBySku.set(sku, current);
  }
  for (const record of state.salesRecords) {
    const sku = String(record.sku || "").trim();
    if (!sku) continue;
    const inventory = inventoryBySku.get(sku);
    const current = bySku.get(sku) || {
      sku,
      product: inventory?.product || sku,
      quantity: 0,
      dates: new Set(),
      locations: new Set(),
      current: inventory?.current ?? null,
      price: inventory?.price || 0,
    };
    current.quantity += Number(record.quantity) || 0;
    if (record.date) current.dates.add(String(record.date).slice(0, 10));
    if (record.location) current.locations.add(record.location);
    bySku.set(sku, current);
  }
  for (const [sku, inventory] of inventoryBySku) {
    if (!bySku.has(sku)) {
      bySku.set(sku, {
        sku,
        product: inventory.product || sku,
        quantity: 0,
        dates: new Set(),
        locations: inventory.locations,
        current: inventory.current,
        price: inventory.price || 0,
      });
    }
  }
  return [...bySku.values()].map((item, index) => {
    const dates = [...item.dates].map(date => new Date(`${date}T00:00:00Z`).getTime()).filter(Number.isFinite);
    const minDate = dates.length ? Math.min(...dates) : Date.now();
    const maxDate = dates.length ? Math.max(...dates) : Date.now();
    const activeWeeks = Math.max(1, Math.ceil(((maxDate - minDate) / 86400000 + 1) / 7));
    const avgWeekly = item.quantity / activeWeeks;
    const forecast = hasSales ? Math.max(0, Math.round(avgWeekly * 8)) : 0;
    const current = Math.max(0, Math.round(item.current ?? (hasInventory ? 0 : avgWeekly * 3)));
    const deficit = Math.max(0, forecast - current);
    const surplus = Math.max(0, current - forecast);
    const stockout = hasSales ? Math.max(0, Math.min(99, Math.round((deficit / Math.max(1, forecast)) * 100))) : 0;
    const overstock = hasSales ? Math.max(0, Math.min(99, Math.round((surplus / Math.max(1, current)) * 100))) : 0;
    const action = !hasSales ? "hold" : stockout > 70 ? "buy" : overstock > 70 ? "sell" : item.locations.size > 1 ? "transfer" : "hold";
    return { id: index + 1, product: item.product, sku: item.sku, current, forecast, stockout, overstock, action, price: item.price || 0, sold: item.quantity, activeWeeks };
  });
}

function moneyShort(value) {
  const amount = Math.max(0, Math.round(Number(value) || 0));
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(amount >= 10000000 ? 0 : 1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return `$${amount}`;
}

function riskLabel(score) {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

function importedDashboardMetrics(products) {
  const summary = state.advancedAnalytics?.summary || {};
  const importedUnits = Number(summary.totalUnitsSold) || state.salesRecords.reduce((sum, record) => sum + (Number(record.quantity) || 0), 0);
  const skuCount = products.length;
  const forecastUnits = products.reduce((sum, product) => sum + product.forecast, 0);
  const currentUnits = products.reduce((sum, product) => sum + product.current, 0);
  const highRiskSkus = products.filter(product => product.stockout >= 70).length;
  const buyActions = products.filter(product => product.action === "buy").length;
  const holdActions = products.filter(product => product.action === "hold").length;
  const riskScore = Math.round(Number(summary.riskScore) || 0);
  const estimatedRevenueRisk = Number(summary.revenueAtRisk) || 0;
  const estimatedExcessCost = summary.excessCost;
  return {
    riskScore,
    cards: [
      ["Inventory Risk Score", riskScore, `${riskLabel(riskScore)} RISK`, `${highRiskSkus} high-risk ${highRiskSkus === 1 ? "SKU" : "SKUs"}`, `${buyActions} buy ${buyActions === 1 ? "action" : "actions"} recommended from imported data.`, riskScore >= 70 ? "bad" : riskScore >= 40 ? "warning" : "good", "accent", riskScore >= 70 ? "high" : riskScore >= 40 ? "warning" : "success"],
      ["Imported Units", fmt(importedUnits), `${skuCount} ${skuCount === 1 ? "SKU" : "SKUs"}`, "Live data", "Synced sales quantity from connected sources.", "good", "", "success"],
      ["8-Week Demand", fmt(forecastUnits), `${currentUnits} on hand`, `${buyActions} buy / ${holdActions} hold`, "Demand projection from synced order history.", buyActions ? "bad" : "good", "", buyActions ? "warning" : "success"],
      ["Revenue at Risk", summary.priceCompleteSkus ? moneyShort(estimatedRevenueRisk) : "Insufficient data", "", estimatedExcessCost === null ? "Missing cost data" : `${moneyShort(estimatedExcessCost)} excess`, "Only SKUs with valid price data are included.", estimatedRevenueRisk ? "bad" : "good", "", estimatedRevenueRisk ? "warning" : "success"],
    ],
  };
}

function shopifyOperatingHub(products) {
  const shopify = state.connectionStatus?.shopify || {};
  const inventoryRecords = state.inventoryItems.length;
  const salesRows = state.salesRecords.length;
  const locations = new Set(state.inventoryItems.map(item => item.location).filter(Boolean)).size;
  const connected = shopify.status === "connected";
  const rows = products.slice(0, 6);
  return `<section class="shopify-hub">
    <article class="card shopify-hub-overview">
      <div class="toolbar-spread">
        <div>
          <p class="eyebrow">Shopify data mirror</p>
          <h2 class="text-lg">${connected ? esc(displayNameFromShopifyAccount(shopify.externalAccount) || "Connected Shopify store") : "Connect Shopify to replace back-and-forth reporting"}</h2>
          <p class="muted">Products, variants, inventory levels, locations, and order rows sync into LiquidityLink so the app acts as the planning view on top of Shopify.</p>
        </div>
        <span class="badge badge--${connected ? "success" : "info"}">${esc((shopify.status || "not connected").replaceAll("_", " "))}</span>
      </div>
      <div class="shopify-hub-kpis">
        <span><strong>${fmt(products.length)}</strong><em>analyzed SKUs</em></span>
        <span><strong>${fmt(inventoryRecords)}</strong><em>inventory records</em></span>
        <span><strong>${fmt(salesRows)}</strong><em>order rows</em></span>
        <span><strong>${fmt(locations)}</strong><em>locations</em></span>
      </div>
    </article>
    <article class="card shopify-hub-table">
      <div class="toolbar-spread">
        <div><p class="eyebrow">Operating table</p><h2 class="text-lg">Shopify SKUs with LiquidityLink decisions</h2></div>
        <a class="btn-ghost" href="/inventory" data-route="/inventory">View all inventory</a>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Product</th><th>On hand</th><th>30-day demand</th><th>Stockout</th><th>Overstock</th><th>Action</th></tr></thead>
          <tbody>${rows.length ? rows.map(item => `<tr>
            <td><strong>${esc(item.product || item.sku)}</strong><br><span class="mono muted">${esc(item.sku)}</span></td>
            <td class="mono">${fmt(item.current)}</td>
            <td class="mono">${fmt(item.forecast)}</td>
            <td class="mono ${severity(item.stockout)}">${fmtDecimal(item.stockout, 1)}%</td>
            <td class="mono ${severity(item.overstock)}">${fmtDecimal(item.overstock, 1)}%</td>
            <td>${actionBadge(item.action)}</td>
          </tr>`).join("") : `<tr><td colspan="6" class="muted">No Shopify products synced yet.</td></tr>`}</tbody>
        </table>
      </div>
    </article>
  </section>`;
}

function executiveSummaryRows() {
  if (!state.salesRecords.length && !state.inventoryItems.length) {
    return [
      ["Risk Score", "76 (HIGH)"],
      ["Revenue at Risk", "$684,000"],
      ["Excess Cost", "$312,000"],
      ["Total Inventory Value", "$12,800,000"],
      ["Transfer Units Recommended", "1,842"],
    ];
  }
  const products = activeSkuData();
  const summary = state.advancedAnalytics?.summary || {};
  const riskScore = Math.round(Number(summary.riskScore) || 0);
  const recommendedUnits = products.reduce((sum, product) => {
    if (product.action === "hold") return sum;
    return sum + Math.abs(product.forecast - product.current);
  }, 0);
  return [
    ["Risk Score", `${riskScore} (${riskLabel(riskScore)})`],
    ["Revenue at Risk", summary.priceCompleteSkus ? moneyShort(summary.revenueAtRisk) : "Insufficient price data"],
    ["Excess Cost", summary.excessCost === null ? "Insufficient cost data" : moneyShort(summary.excessCost)],
    ["Total Inventory Value", summary.priceCompleteSkus ? moneyShort(summary.inventoryValue) : "Insufficient price data"],
    ["Transfer Units Recommended", fmt(recommendedUnits)],
  ];
}

function importedForecastData(products) {
  if (!state.salesRecords.length && !state.inventoryItems.length) return forecastData;
  const syncedForecast = state.advancedAnalytics?.forecasts?.weekly;
  if (Array.isArray(syncedForecast) && syncedForecast.length) {
    return syncedForecast.slice(0, 8).map(safeForecastPoint);
  }
  if (!state.salesRecords.length) {
    return Array.from({ length: 8 }, (_, index) => ({
      week: `Wk ${index + 1}`,
      arima: 0,
      xgboost: 0,
      ensemble: 0,
      lower: 0,
      upper: 0,
    }));
  }
  const totalForecast = Math.max(1, products.reduce((sum, product) => sum + product.forecast, 0));
  const weeklyBase = Math.max(0, totalForecast / 8);
  return Array.from({ length: 8 }, (_, index) => {
    const lift = state.salesRecords.length >= 12 ? 1 + index * 0.03 : 1;
    const ensemble = Math.max(1, Math.round(weeklyBase * lift));
    return {
      week: `Wk ${index + 1}`,
      arima: Math.max(1, Math.round(ensemble * 0.92)),
      xgboost: Math.max(1, Math.round(ensemble * 1.08)),
      ensemble,
      lower: Math.max(0, Math.round(ensemble * 0.75)),
      upper: Math.max(1, Math.round(ensemble * 1.25)),
    };
  });
}

function forecastSummary(chartData) {
  const latest = safeForecastPoint(chartData[chartData.length - 1] || {}, chartData.length - 1);
  const hasInventoryOnly = !state.salesRecords.length && state.inventoryItems.length;
  return {
    arima: latest.arima,
    xgboost: latest.xgboost,
    ensemble: latest.ensemble,
    label: state.salesRecords.length ? "Early forecast from synced Shopify history." : hasInventoryOnly ? "Waiting for synced sales history." : "Baseline demand from recurring cycles.",
    xgbLabel: state.salesRecords.length ? "Inventory-adjusted forecast from synced SKU data." : hasInventoryOnly ? "Inventory is live; demand needs orders." : "Signal-adjusted regional demand.",
    ensembleLabel: state.salesRecords.length ? "Operational forecast from live store sales and inventory." : hasInventoryOnly ? "Connect order history to forecast demand." : "Operational forecast used for recommendations.",
  };
}

function modelDiagnostics(chartData, products) {
  const summary = state.advancedAnalytics?.summary || {};
  const last = safeForecastPoint(chartData[chartData.length - 1] || {}, chartData.length - 1);
  const salesRows = state.salesRecords.length;
  const analyzed = products.length || finiteNumber(summary.analyzedSkus);
  const avgRisk = products.length ? Math.round(products.reduce((sum, item) => sum + finiteNumber(item.stockout || item.riskScore), 0) / products.length) : finiteNumber(summary.riskScore);
  return [
    {
      name: "Holt trend",
      value: fmt(last.arima),
      confidence: salesRows >= 20 ? "calibrated" : "early",
      detail: "Smooths weekly demand and handles sparse Shopify order history without overfitting.",
    },
    {
      name: "ARIMA baseline",
      value: fmt(last.arima),
      confidence: salesRows >= 52 ? "seasonal" : "limited history",
      detail: "Uses observed recurring demand as the conservative baseline forecast.",
    },
    {
      name: "XGBoost signal",
      value: fmt(last.xgboost),
      confidence: state.inventoryItems.length ? "inventory aware" : "needs stock",
      detail: "Adjusts demand using inventory on hand, price, location, and action signals.",
    },
    {
      name: "Monte Carlo risk",
      value: `${fmtDecimal(Math.max(8, Math.min(68, avgRisk / 1.5)), 1)}%`,
      confidence: `${fmt(analyzed)} SKUs`,
      detail: "Stress-tests stockout and overstock exposure across demand-band scenarios.",
    },
    {
      name: "Ensemble decision",
      value: fmt(last.ensemble),
      confidence: "recommended",
      detail: "Blends the models into the final buy, sell, hold, or transfer queue.",
    },
  ];
}

function modelDiagnosticsGrid(chartData, products) {
  return `<section class="model-diagnostics-grid">
    ${modelDiagnostics(chartData, products).map((model, index) => `<article class="model-card ${index === 4 ? "model-card--active" : ""}">
      <div><p class="eyebrow">${esc(model.name)}</p><strong>${esc(model.value)}</strong></div>
      <span>${esc(model.confidence)}</span>
      <p>${esc(model.detail)}</p>
    </article>`).join("")}
  </section>`;
}

function riskModelWorkbench(products) {
  const rows = products.slice(0, 5);
  if (!rows.length) return "";
  return `<section class="card risk-workbench">
    <div>
      <p class="eyebrow">Risk analysis models</p>
      <h2 class="text-lg">SKU decision stack</h2>
      <p class="muted">The platform now shows multiple risk lenses instead of a single score: service gap, cash exposure, transfer fit, and confidence penalty.</p>
    </div>
    <div class="risk-stack">
      ${rows.map(item => {
        const stockout = finiteNumber(item.stockout ?? item.riskScore);
        const overstock = finiteNumber(item.overstock);
        const confidencePenalty = Math.max(0, Math.round(100 - finiteNumber(item.confidence, 0.35) * 100));
        const transferFit = item.action === "transfer" ? 86 : item.action === "buy" ? 52 : item.action === "sell" ? 44 : 24;
        return `<div class="risk-stack-row">
          <strong>${esc(item.product || item.sku)}</strong>
          ${[
            ["Service gap", stockout],
            ["Cash exposure", overstock],
            ["Transfer fit", transferFit],
            ["Data penalty", confidencePenalty],
          ].map(([label, value]) => `<span><em>${esc(label)}</em><i style="--score:${Math.max(4, Math.min(100, finiteNumber(value)))}%"></i><b>${fmtDecimal(value, 0)}</b></span>`).join("")}
        </div>`;
      }).join("")}
    </div>
  </section>`;
}

function seasonalDemandData() {
  if (!state.salesRecords.length && !state.inventoryItems.length) return seasonalData;
  const byMonth = Array.from({ length: 12 }, (_, index) => ({ month: new Date(2026, index, 1).toLocaleString("en-US", { month: "short" }), demand: 0 }));
  for (const record of state.salesRecords) {
    const date = new Date(`${String(record.date).slice(0, 10)}T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) byMonth[date.getUTCMonth()].demand += Number(record.quantity) || 0;
  }
  return byMonth;
}

function auth() {
  return state.authUser;
}

function canUseAppRoutes() {
  return location.protocol !== "file:";
}

function authUnavailableMessage() {
  return "Auth is not running yet. Do not open index.html directly; start the Express backend, open http://localhost:4174, add a .env file, connect Postgres, and add Google OAuth credentials.";
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
  if (state.path === path && location.pathname === path) return;
  pushPath(path);
  state.path = path;
  state.searchOpen = false;
  state.notificationsOpen = false;
  state.sidebarOpen = false;
  state.marketingMenuOpen = false;
  if (publicRoutes.has(path)) {
    state.loading = false;
    render();
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    return;
  }
  state.loading = true;
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
  state.authFieldError = null;
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

function rebrandBanner() {
  return `<aside class="rebrand-banner" aria-label="LiquidityLink rebrand notice">
    <span class="badge badge--info">Rebrand</span>
    <p>LiquidityLens is now <strong>LiquidityLink</strong>. Same inventory intelligence, clearer name for connected retail decisions.</p>
  </aside>`;
}

function layout(content) {
  const unread = state.notifications.some(n => !n.read);
  const name = workspaceName();
  const initials = workspaceInitials();
  const workspaceOptions = state.enterprise.workspaces?.length > 1
    ? `<label class="workspace-switcher"><span>Workspace</span><select class="select" data-workspace-switch>${state.enterprise.workspaces.map(workspace => `<option value="${attr(workspace.id)}" ${workspace.id === state.enterprise.activeWorkspaceId ? "selected" : ""}>${esc(workspace.name)}</option>`).join("")}</select></label>`
    : "";
  const pendingCount = state.enterprise.pendingInvites?.length || 0;
  return `
    ${state.sidebarOpen ? `<div class="drawer-overlay" data-close-sidebar></div>` : ""}
    <aside class="sidebar ${state.sidebarOpen ? "open" : ""}">
      <div class="sidebar-top">${logo()}</div>
      <div class="store-row"><div class="store-name">${esc(name)}</div><div class="online"><span class="dot"></span>online ${pendingCount ? `· ${fmt(pendingCount)} invite${pendingCount === 1 ? "" : "s"}` : ""}</div>${workspaceOptions}</div>
      <nav class="sidebar-nav" aria-label="Primary">${navItems.map(([path, label, name]) => `<a href="${path}" class="nav-link ${state.path === path ? "active" : ""}" data-route="${path}"><span class="nav-icon">${icon(name)}</span>${label}</a>`).join("")}</nav>
      <div class="sidebar-bottom">
        <a class="bottom-link bottom-link--public" href="/" data-route="/">${icon("globe-2")}<span>Public site</span></a>
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
        <div class="avatar" aria-label="${esc(name)}">${esc(initials)}</div>
      </div>
    </header>
    <main class="main ${state.syncing ? "syncing" : ""}">${rebrandBanner()}${content}</main>
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
    ${state.notifications.map(n => `<div class="notification-item ${n.read ? "" : "unread"}"><span class="dot" style="background: var(--${n.type === "warning" ? "yellow" : n.type === "success" ? "green" : "accent"})"></span><div>${esc(n.text)}<span class="notification-time">${esc(n.time)}</span></div></div>`).join("")}
  </div>`;
}

function marketingLayout(content) {
  const signedIn = auth();
  return `<div class="marketing-site">
    <div class="ambient-product-backdrop" aria-hidden="true"><span></span><span></span><span></span></div>
    <header class="marketing-header">
      <a class="marketing-brand" href="/" data-route="/">${logo()}</a>
      <button class="btn-ghost marketing-menu-button" data-marketing-menu type="button" aria-expanded="${state.marketingMenuOpen ? "true" : "false"}">${icon("menu")}Menu</button>
      <div class="marketing-menu ${state.marketingMenuOpen ? "open" : ""}">
        <nav class="marketing-nav" aria-label="Website navigation">
          ${marketingNav.map(([path, label]) => `<a href="${path}" data-route="${path}" class="${state.path === path ? "active" : ""}">${label}</a>`).join("")}
        </nav>
        <div class="marketing-actions">
          <button class="btn-icon" data-theme type="button" aria-label="Switch to ${currentTheme() === "light" ? "dark" : "light"} theme">${icon(currentTheme() === "light" ? "moon" : "sun")}</button>
          <a class="btn-ghost" href="${signedIn ? "/dashboard" : "/login"}" ${signedIn ? 'data-route="/dashboard"' : ""}>${signedIn ? "Open app" : "Sign in"}</a>
          <a class="btn-primary" href="/book-demo" data-route="/book-demo">Book demo</a>
        </div>
      </div>
    </header>
    <main class="marketing-main">${rebrandBanner()}${content}</main>
    <footer class="marketing-footer">
      <div>
        ${logo()}
        <p>Predictive inventory intelligence for retailers that need fewer surprises, cleaner cash flow, and faster replenishment decisions.</p>
        <div class="footer-contact-links">
          <a href="mailto:${companyLinks.email}">${icon("mail")}${companyLinks.email}</a>
          <a href="${companyLinks.linkedin}" target="_blank" rel="noreferrer">${icon("linkedin")}LinkedIn</a>
          <a href="${companyLinks.instagram}" target="_blank" rel="noreferrer">${icon("instagram")}Instagram</a>
        </div>
      </div>
      <div class="marketing-footer-links">
        ${["Platform", "Integrations", "Security", "Pricing", "Documentation", "Contact"].map(label => {
          const path = label === "Documentation" ? "/docs" : `/${label.toLowerCase()}`;
          return `<a href="${path}" data-route="${path}">${label}</a>`;
        }).join("")}
      </div>
    </footer>
  </div>`;
}

function socialLinkStrip() {
  return `<div class="social-link-strip">
    <a href="mailto:${companyLinks.email}">${icon("mail")}Email</a>
    <a href="${companyLinks.linkedin}" target="_blank" rel="noreferrer">${icon("linkedin")}LinkedIn</a>
    <a href="${companyLinks.instagram}" target="_blank" rel="noreferrer">${icon("instagram")}Instagram</a>
  </div>`;
}

function tractionBand({ eyebrow = "June-July check", title = "Early traction is already turning into pilot momentum.", copy = "In the first operating push, LiquidityLink moved from social launch to retailer conversations, recruiting support, and measurable audience growth.", live = false } = {}) {
  return `<section class="traction-band" aria-label="${attr(eyebrow)}"${live ? " data-live-statistics" : ""}>
    <div>
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h2>${esc(title)}</h2>
      <p>${esc(copy)}</p>
      ${live ? `<p class="traction-meta" data-live-stat-status>July launch traction snapshot.</p>` : ""}
      ${socialLinkStrip()}
    </div>
    <div class="traction-grid">
      ${juneJulyMetrics.map(item => `<button class="traction-card" data-traction-detail="${attr(item.detail)}" type="button">
        <strong${live ? ` data-live-stat-value="${attr(item.key)}"` : ""}>${esc(item.value)}</strong>
        <span>${esc(item.label)}</span>
        <em${live ? ` data-live-stat-detail="${attr(item.key)}"` : ""}>${esc(item.detail)}</em>
      </button>`).join("")}
    </div>
  </section>`;
}

function signalPlayground() {
  return `<section class="signal-playground">
    <div>
      <p class="eyebrow">Explore the signal</p>
      <h2>Hover the background panels to see how the product thinks.</h2>
      <p>These lightweight previews add motion and context without hiding the main content: demand lift, cash exposure, transfer fit, and forecast confidence.</p>
    </div>
    <div class="signal-tiles">
      ${[
        ["Demand lift", "+38%", "Headlamps rising over the next 4 weeks."],
        ["Cash exposure", "$39K", "Excess cost surfaced before markdown urgency."],
        ["Transfer fit", "80 units", "West store excess can cover North shortage."],
        ["Confidence", "18%", "Band width narrows as order history grows."],
      ].map(([label, value, detail]) => `<button class="signal-tile" type="button" data-traction-detail="${attr(detail)}"><span>${esc(label)}</span><strong>${esc(value)}</strong><em>${esc(detail)}</em></button>`).join("")}
    </div>
  </section>`;
}

function marketingSection(eyebrow, headline, copy, content = "", extraClass = "") {
  return `<section class="marketing-section ${extraClass}">
    <div class="marketing-section-head">
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h2>${esc(headline)}</h2>
      <p>${esc(copy)}</p>
    </div>
    ${content}
  </section>`;
}

function marketingCards(cards) {
  return `<div class="marketing-card-grid">${cards.map(card => `<article class="marketing-card">
    ${card.kicker ? `<p class="eyebrow">${esc(card.kicker)}</p>` : ""}
    <h3>${esc(card.title)}</h3>
    <p>${esc(card.copy)}</p>
    ${card.metric ? `<strong class="marketing-metric">${esc(card.metric)}</strong>` : ""}
  </article>`).join("")}</div>`;
}

function productFrame(title, art, caption = "", extraClass = "") {
  return `<figure class="product-frame ${extraClass}">
    <div class="browser-chrome"><span></span><span></span><span></span><em>${esc(title)}</em></div>
    <div class="product-frame-art">${art}</div>
    ${caption ? `<figcaption>${esc(caption)}</figcaption>` : ""}
  </figure>`;
}

function dashboardPreview() {
  return `<div class="screen-dashboard">
    <div class="screen-kpis"><span><b>63</b><small>Risk score</small></span><span><b>$39K</b><small>Excess cost</small></span><span><b>18</b><small>Buy actions</small></span></div>
    <div class="screen-grid">
      <div class="screen-chart">${forecastMockup()}</div>
      <div class="screen-list">${skuActionRows()}</div>
    </div>
  </div>`;
}

function glassCommandOverlay() {
  return `<div class="glass-command-overlay" aria-label="Inventory command overlay">
    <div class="glass-command-copy">
      <span class="glass-kicker">Predictive command layer</span>
      <strong>LiquidityLink Control Center</strong>
      <p>Forecast, risk, and transfer signals summarized for the next replenishment decision.</p>
    </div>
    <div class="glass-command-metrics">
      ${[
        ["Risk", "63", "medium"],
        ["Cash at risk", "$39K", "watch"],
        ["Confidence", "87%", "good"],
        ["Transfers", "4", "live"],
      ].map(([label, value, status]) => `<span class="glass-metric glass-metric--${status}"><em>${esc(label)}</em><b>${esc(value)}</b></span>`).join("")}
    </div>
    <div class="glass-signal-strip">
      <span>${icon("chart-line")} Demand rising in footwear</span>
      <span>${icon("boxes")} 80 units available to transfer</span>
      <span>${icon("shield")} Finance view ready</span>
    </div>
  </div>`;
}

function syncMirrorVisual() {
  return `<div class="sync-mirror-visual" aria-label="Shopify data replacement preview">
    <div class="mirror-sidebar">
      ${["Products", "Variants", "Inventory", "Orders", "Locations"].map((item, index) => `<span class="${index === 2 ? "active" : ""}">${esc(item)}</span>`).join("")}
    </div>
    <div class="mirror-main">
      <div class="chart-label"><strong>Shopify operating mirror</strong><span>catalog, stock, and order history</span></div>
      <div class="mirror-kpis">
        <span><strong>30</strong><em>inventory records</em></span>
        <span><strong>2</strong><em>order rows</em></span>
        <span><strong>8</strong><em>forecast weeks</em></span>
      </div>
      <div class="mirror-table">
        ${[
          ["Trail Running Shoes M10", "84 on hand", "BUY", "91% stockout"],
          ["Dry Bag 10L", "63 on hand", "TRANSFER", "West covers North"],
          ["Insulated Bottle 32oz", "512 on hand", "SELL", "$18K excess"],
        ].map(([product, stock, action, note]) => `<div><span><strong>${esc(product)}</strong><em>${esc(stock)}</em></span><b>${esc(action)}</b><small>${esc(note)}</small></div>`).join("")}
      </div>
    </div>
  </div>`;
}

function roleWorkspaceVisual() {
  return `<div class="role-workspace-visual">
    <div class="role-tabs">${["Planner", "Ops", "CFO"].map((role, index) => `<span class="${index === 0 ? "active" : ""}">${role}</span>`).join("")}</div>
    <div class="role-dashboard">
      <div><p class="eyebrow">Planner queue</p><strong>18 actions</strong><span>Ranked by revenue impact</span></div>
      <div><p class="eyebrow">Ops view</p><strong>4 transfers</strong><span>Location-level recovery</span></div>
      <div><p class="eyebrow">Finance</p><strong>$39K</strong><span>Cash exposure flagged</span></div>
    </div>
    <div class="role-flow"><span>SKU risk</span><i></i><span>Role context</span><i></i><span>Decision</span></div>
  </div>`;
}

function categoryHealthVisual() {
  return `<div class="category-health-visual">
    <div class="chart-label"><strong>Category health</strong><span>demand, margin, and coverage</span></div>
    ${[
      ["Footwear", 88, "High stockout pressure"],
      ["Outdoor", 64, "Transfer candidates"],
      ["Apparel", 42, "Markdown watch"],
      ["Home", 28, "Stable coverage"],
    ].map(([label, value, note]) => `<div class="category-row"><span>${esc(label)}</span><i style="--score:${value}%"></i><strong>${value}</strong><em>${esc(note)}</em></div>`).join("")}
  </div>`;
}

function securityControlsVisual() {
  const modes = {
    access: {
      title: "Access control",
      note: "Role-gated workspace routes",
      score: 96,
      rows: [
        ["Admin", "Invite users, manage roles, view demo leads", "allowed"],
        ["Analyst", "Run forecasts, inspect imports, export reports", "allowed"],
        ["Viewer", "Read dashboards and saved reports only", "limited"],
      ],
      activity: ["Session verified", "Workspace role checked", "Route access approved"],
    },
    credentials: {
      title: "Credential handling",
      note: "Provider tokens never render in browser code",
      score: 98,
      rows: [
        ["Shopify OAuth token", "Stored server-side with scoped access", "sealed"],
        ["CSV imports", "Parsed into planning fields only", "minimal"],
        ["Email delivery key", "Read from Render environment variables", "private"],
      ],
      activity: ["Secret loaded from env", "Browser received status only", "Sync job recorded"],
    },
    audit: {
      title: "Audit readiness",
      note: "Every workspace action leaves a reviewable trail",
      score: 91,
      rows: [
        ["Store sync", "Provider, timestamp, and row count captured", "logged"],
        ["Team invite", "Sender, recipient, role, and decision saved", "logged"],
        ["Report export", "Download event tied to workspace user", "logged"],
      ],
      activity: ["Sync completed", "Invite accepted", "Report generated"],
    },
  };
  const active = modes[state.securityControlMode] ? state.securityControlMode : "access";
  const panel = modes[active];
  return `<div class="security-controls-visual security-command-visual">
    <div class="security-command-head">
      <div>
        <div class="chart-label"><strong>${esc(panel.title)}</strong><span>${esc(panel.note)}</span></div>
      </div>
      <div class="security-score-mini"><strong>${panel.score}</strong><span>/100</span></div>
    </div>
    <div class="security-control-tabs">
      ${Object.entries(modes).map(([key, item]) => `<button type="button" data-security-control="${esc(key)}" class="${key === active ? "active" : ""}">${esc(item.title)}</button>`).join("")}
    </div>
    <div class="security-control-body">
      <div class="security-ring" style="--score:${panel.score}%"><strong>${panel.score}</strong><span>control score</span></div>
      <div class="security-rule-stack">
        ${panel.rows.map(([role, detail, status]) => `<div class="security-rule-row"><span>${esc(role)}</span><p>${esc(detail)}</p><b>${esc(status)}</b></div>`).join("")}
      </div>
      <div class="security-audit-feed">
        <span>Live audit sample</span>
        ${panel.activity.map(item => `<p>${icon("shield")}${esc(item)}</p>`).join("")}
      </div>
    </div>
  </div>`;
}

function cleanForecastVisual() {
  const models = [
    ["holt", "Holt trend"],
    ["arima", "ARIMA"],
    ["xgboost", "XGBoost"],
    ["montecarlo", "Monte Carlo"],
    ["ensemble", "Ensemble"],
  ];
  const active = models.some(([key]) => key === state.marketingForecastModel) ? state.marketingForecastModel : "ensemble";
  return `<div class="clean-forecast-visual">
    <div class="chart-label"><strong>Forecast lab</strong><span>baseline, boosted trees, and ensemble</span></div>
    ${forecastMockup(active)}
    <div class="model-pill-row">${models.map(([key, label]) => `<button class="${key === active ? "active" : ""}" data-forecast-model="${key}" type="button">${esc(label)}</button>`).join("")}</div>
  </div>`;
}

function queueRows(mode = "understock") {
  const rows = {
    understock: [
      ["Trail Running Shoes M10", "Stockout risk 91% · 8 days cover", "buy", "Recommended next step: place a 240-unit buy before the next replenishment window closes."],
      ["Merino Base Layer L", "Lead-time gap 74% · supplier ETA 21 days", "buy", "Recommended next step: pull forward the supplier order and reserve safety stock for top stores."],
      ["Headlamp 350 Lumen", "Forecast demand +38% next 4 weeks", "buy", "Recommended next step: increase reorder quantity because observed velocity is outrunning current stock."],
      ["Dry Bag 10L", "North store shortage · West has excess", "transfer", "Recommended next step: transfer 80 units from West to North before buying more inventory."],
    ],
    overstock: [
      ["Insulated Bottle 32oz", "Overstock risk 78% · $18K tied up", "sell", "Recommended next step: run a targeted markdown before carrying cost compounds next month."],
      ["Packable Rain Jacket S", "Markdown window closing · 64 days cover", "sell", "Recommended next step: move surplus into a 14-day promotion while weather demand is still active."],
      ["Camp Towel Large", "Slow velocity · 3.2x target cover", "discount", "Recommended next step: discount long-tail stock and stop replenishment until cover returns to target."],
      ["Fleece Pullover XL", "Transfer 80 units to ecommerce demand", "transfer", "Recommended next step: transfer excess store units to ecommerce where forecasted demand is stronger."],
    ],
  };
  return rows[mode] || rows.understock;
}

function skuActionRows(rows = queueRows("understock")) {
  return `<div class="sku-action-list">
    ${rows.map(([name, note, action, detail]) => `<button class="sku-action-row" data-queue-detail="${attr(detail || note)}" type="button" aria-expanded="false">
      <span><strong>${esc(name)}</strong><em>${esc(note)}</em></span><b class="badge badge--${action}">${action}</b>
    </button>`).join("")}
  </div>`;
}

function queuePanel(mode = "understock", caption = "Understock mode highlights stockout exposure; overstock mode switches to cash, markdown, and transfer candidates.") {
  return `<div class="queue-panel" data-queue-panel>
    <div class="hero-toggle" role="tablist" aria-label="Inventory queue mode">
      ${["understock", "overstock"].map(tab => `<button class="${tab === mode ? "active" : ""}" data-queue-tab="${tab}" type="button" role="tab" aria-selected="${tab === mode}">${tab === "understock" ? "Understock" : "Overstock"}</button>`).join("")}
    </div>
    <div data-queue-rows>${skuActionRows(queueRows(mode))}</div>
    <div class="queue-detail" data-queue-detail-output>Click a SKU row to preview the recommended next step.</div>
    <p class="chart-caption">${esc(caption)}</p>
  </div>`;
}

function pageInteractive(title, copy, mode = "understock") {
  return `<section class="interactive-band">
    <div>
      <p class="eyebrow">Interactive model</p>
      <h2>${esc(title)}</h2>
      <p>${esc(copy)}</p>
    </div>
    <div class="interactive-surface">${queuePanel(mode)}<div class="hero-forecast">${forecastMockup()}</div></div>
  </section>`;
}

function statBand(stats) {
  return `<div class="stat-band">${stats.map(([value, label]) => `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join("")}</div>`;
}

function pageHero(eyebrow, title, copy, art, mood = "") {
  return `<section class="marketing-page-hero page-hero-${mood} ${art ? "" : "marketing-page-hero--no-art"}">
    <div>
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h1>${esc(title)}</h1>
      <p>${esc(copy)}</p>
      <div class="hero-actions">
        <a class="btn-primary" href="/book-demo" data-route="/book-demo">Book demo</a>
        <a class="btn-ghost" href="/login">Open app</a>
      </div>
    </div>
    ${art || ""}
  </section>`;
}

function marketingPage(title, copy, cards, eyebrow = "LiquidityLink") {
  return `${pageHero(eyebrow, title, copy, "", eyebrow.toLowerCase().replace(/\s+/g, "-"))}
  <section class="mixed-card-band">${cards.map((card, index) => insightCard(card, index % 3 === 0 ? "bars" : index % 3 === 1 ? "gauge" : "rows")).join("")}</section>`;
}

function insightCard(card, visual = "bars") {
  const points = card.points || [["W1", 42], ["W2", 68], ["W3", 56], ["W4", 88]];
  const visuals = {
    bars: chartBlock(card.measure || "Weekly demand index", card.scale || "units", points, card.caption || "Bars show indexed demand by week; taller bars indicate stronger expected pull."),
    gauge: gaugeBlock(card.metric || "74", card.measure || "Inventory Health Score", "out of 100", card.caption || "Scores above 70 indicate a healthier operating band."),
    rows: skuActionRows(card.rows || queueRows("understock")),
    map: marketplaceMockup(),
    cash: cashExposureVisual(),
    routes: transferRouteVisual(),
    growth: growthImpactVisual(),
  };
  return `<article class="marketing-card visual-card">
    ${card.kicker ? `<p class="eyebrow">${esc(card.kicker)}</p>` : ""}
    <h3>${esc(card.title)}</h3>
    <p>${esc(card.copy)}</p>
    ${visuals[visual] || visuals.bars}
  </article>`;
}

function gaugeBlock(value, label, scale, caption) {
  return `<div class="chart-block"><div class="chart-label"><strong>${esc(label)}</strong><span>${esc(scale)}</span></div><div class="mini-gauge" style="--score:${Math.max(0, Math.min(100, Number(value) || 0))}%"><b>${esc(value)}</b><span></span></div><p class="chart-caption">${esc(caption)}</p></div>`;
}

function chartBlock(label, unit, points, caption) {
  const max = Math.max(1, ...points.map(point => Number(point[1]) || 0));
  return `<div class="chart-block"><div class="chart-label"><strong>${esc(label)}</strong><span>${esc(unit)}</span></div><div class="mini-bars">${points.map(([name, value]) => `<span tabindex="0" title="${attr(`${name}: ${value} ${unit}`)}" style="height:${Math.max(28, (value / max) * 100)}%"><b>${esc(value)}</b><em>${esc(name)}</em></span>`).join("")}</div><p class="chart-caption">${esc(caption)}</p></div>`;
}

function cashExposureVisual() {
  return `<div class="persona-visual"><div class="chart-label"><strong>Working-capital exposure</strong><span>dollars by SKU</span></div>${[
    ["Rain Jacket S", "$42K tied up", "sell"],
    ["Bottle 32oz", "$18K markdown risk", "sell"],
    ["Camp Towel", "$9K carrying cost", "discount"],
  ].map(row => `<div class="persona-row"><span><strong>${row[0]}</strong><em>${row[1]}</em></span><b class="badge badge--${row[2]}">${row[2]}</b></div>`).join("")}<p class="chart-caption">CFO view translates inventory exceptions into cash exposure and margin protection.</p></div>`;
}

function transferRouteVisual() {
  return `<div class="persona-visual"><div class="chart-label"><strong>Transfer routes</strong><span>units by location</span></div>${[
    ["West DC → North Store", "80 units · Dry Bag 10L", "transfer"],
    ["Ecommerce → Downtown", "45 units · Headlamp 350", "transfer"],
    ["South Store → Airport", "30 units · Trail Socks", "hold"],
  ].map(row => `<div class="persona-row"><span><strong>${row[0]}</strong><em>${row[1]}</em></span><b class="badge badge--${row[2]}">${row[2]}</b></div>`).join("")}<p class="chart-caption">CSCO view emphasizes banner, store, and route-level standardization.</p></div>`;
}

function growthImpactVisual() {
  return chartBlock("Category revenue impact", "forecast lift", [["Footwear", 22], ["Outdoor", 17], ["Apparel", 11], ["Home", 7]], "CEO view rolls SKU health into growth and margin impact by category.");
}

function pricingModelVisual() {
  const selected = pricingTiers.find(tier => tier.name === state.selectedPricingTier) || pricingTiers.find(tier => tier.featured) || pricingTiers[0];
  return `<div class="pricing-visual">
    <div class="chart-label"><strong>Pricing model</strong><span>monthly subscription tiers</span></div>
    <div class="pricing-tier-strip">
      ${pricingTiers.map(tier => `<button class="${tier.name === selected.name ? "active" : tier.featured ? "featured" : ""}" data-pricing-preview="${attr(tier.name)}" type="button" aria-pressed="${tier.name === selected.name ? "true" : "false"}"><strong>${esc(tier.name)}</strong><em>${esc(tier.price)}${tier.cadence ? esc(tier.cadence) : ""}</em></button>`).join("")}
    </div>
    <div class="pricing-preview-detail">
      <div>
        <p class="eyebrow">Selected tier</p>
        <h3>${esc(selected.name)}</h3>
        <p>${esc(selected.summary)}</p>
      </div>
      <div class="pricing-preview-price"><strong>${esc(selected.price)}${selected.cadence ? esc(selected.cadence) : ""}</strong><span>${esc(selected.annual)}</span></div>
      <ul>${selected.features.slice(0, 6).map(feature => `<li>${esc(feature)}</li>`).join("")}</ul>
    </div>
    <p class="chart-caption">Click a tier to preview who it is for, what it costs, and the first features included.</p>
  </div>`;
}

function pricingCards() {
  return `<section class="pricing-grid marketing-pricing-grid">
    ${pricingTiers.map(tier => `<article class="pricing-card ${tier.featured ? "pricing-card--featured" : ""}">
      ${tier.featured ? `<span class="badge badge--info pricing-featured-badge">Most Popular</span>` : ""}
      <div>
        <p class="eyebrow">Best for ${esc(tier.size)}</p>
        <h2 class="text-lg">${esc(tier.name)}</h2>
        <p class="pricing-summary">${esc(tier.summary)}</p>
      </div>
      <div class="pricing-price"><strong>${esc(tier.price)}</strong>${tier.cadence ? `<span>${esc(tier.cadence)}</span>` : ""}</div>
      <p class="pricing-annual">${esc(tier.annual)}</p>
      <ul class="pricing-feature-list">${tier.features.map(feature => `<li>${esc(feature)}</li>`).join("")}</ul>
      <a class="${tier.featured ? "btn-primary" : "btn-ghost"}" href="/book-demo" data-route="/book-demo">${esc(tier.cta)}</a>
    </article>`).join("")}
  </section>`;
}

function pricingComparisonTable() {
  const plans = ["Starter", "Growth", "Professional", "Enterprise"];
  const visibleRows = state.pricingComparisonExpanded ? pricingComparisonRows : pricingComparisonRows.slice(0, 12);
  const hiddenCount = pricingComparisonRows.length - visibleRows.length;
  return `<section class="pricing-comparison-section">
    <div class="section-head">
      <p class="eyebrow">Feature comparison</p>
      <h2>Compare every plan.</h2>
      <p>The table starts collapsed so the page stays easier to scan. Expand it when you want the full feature-by-feature breakdown.</p>
      <button class="btn-ghost" data-pricing-comparison-toggle type="button" aria-expanded="${state.pricingComparisonExpanded ? "true" : "false"}">${state.pricingComparisonExpanded ? "Collapse comparison" : `Expand full comparison (${hiddenCount} more)`}</button>
    </div>
    <div class="pricing-comparison-wrap">
      <table class="pricing-comparison-table">
        <thead><tr><th>Feature</th>${plans.map(plan => `<th>${esc(plan)}</th>`).join("")}</tr></thead>
        <tbody>${visibleRows.map(row => `<tr>
          <td>${esc(row[0])}</td>
          ${row.slice(1).map(value => `<td><span class="${value ? "comparison-check" : "comparison-dash"}">${value ? "✓" : "—"}</span></td>`).join("")}
        </tr>`).join("")}</tbody>
      </table>
    </div>
    ${state.pricingComparisonExpanded ? "" : `<p class="chart-caption">Showing ${visibleRows.length} core features. Expand to see Professional and Enterprise-only services.</p>`}
  </section>`;
}

function executiveMockup() {
  return `<div class="marketing-mockup" aria-label="Inventory intelligence preview">
    <div class="mockup-row"><span>Inventory risk</span><strong>63 / 100</strong><em>Medium</em></div>
    <div class="mockup-row"><span>8-week demand</span><strong>48 units</strong><em>Live</em></div>
    <div class="mockup-row"><span>Revenue at risk</span><strong>$1K</strong><em>Down from $39K excess</em></div>
    <div class="mockup-chart"><span></span><span></span><span></span><span></span><span></span></div>
  </div>`;
}

function homePage() {
  return `<section class="marketing-hero">
    <div class="marketing-hero-copy">
      <p class="eyebrow">Inventory intelligence for enterprise retail</p>
      <h1>Prevent stockouts, overstocks, and cash-flow surprises before they happen.</h1>
      <p>LiquidityLink gives retail leaders a predictive operating layer for demand, inventory risk, replenishment, supplier exposure, and marketplace coordination.</p>
      <div class="hero-actions">
        <a class="btn-primary" href="/book-demo" data-route="/book-demo">Book demo</a>
        <a class="btn-ghost" href="/platform" data-route="/platform">See platform</a>
      </div>
      <div class="proof-strip">
        <span>Built for supply chain teams</span>
        <span>POS and commerce data</span>
        <span>Executive-ready reporting</span>
      </div>
    </div>
    <div class="hero-command-surface" aria-label="Live action queue preview">
      <div class="surface-label"><span>Live action queue</span><b>Planner preview</b></div>
      ${glassCommandOverlay()}
      <div class="hero-interactive">${queuePanel()}<div class="hero-forecast">${forecastMockup()}</div></div>
    </div>
  </section>
  ${tractionBand({
    eyebrow: "Live statistics",
    title: "July momentum, refreshed from live channels where possible.",
    copy: "The homepage now shows the July launch proof investors and pilots ask for first: audience growth, retailer interest, recruiting support, and LinkedIn reach.",
    live: true,
  })}
  ${pageInteractive("A planner can move between shortage risk and excess recovery.", "The full-width queue demonstrates the same operating motion inside the app: switch the mode, review the ranked SKUs, then act with context.", "understock")}
  ${signalPlayground()}
  ${enterpriseFaq()}
  <section class="marketing-cta">
    <p class="eyebrow">Get started</p>
    <h2>Run a focused inventory intelligence pilot.</h2>
    <p>Connect one data source, pick a category, and measure the value of better replenishment decisions.</p>
    <a class="btn-primary" href="/book-demo" data-route="/book-demo">Book demo</a>
  </section>`;
}

function enterpriseFaq() {
  return marketingSection("FAQ", "Answers for enterprise buyers.", "Clear responses to the objections that slow down evaluations.", `<div class="marketing-faq">
    ${enterpriseFaqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
  </div>`);
}

function platformPage() {
  return `${pageHero("Platform", "A predictive operating layer for retail inventory.", "Unify sales, inventory, and supplier signals so every team can work from the same forward-looking plan.", productFrame("Shopify mirror", syncMirrorVisual(), "Product, variant, inventory, order, and location data in one planning surface."), "platform")}
  ${pageInteractive("Switch from shortage response to overstock recovery.", "The same operating layer can move from urgent replenishment to cash-release planning without changing tools.", "overstock")}
  ${marketingSection("Operating model", "From source data to decision queue.", "LiquidityLink normalizes commerce and POS data, models forward demand, then ranks the actions most likely to protect revenue and cash.", `<div class="process-lane">${["Connect", "Normalize", "Forecast", "Prioritize", "Report"].map((step, i) => `<div><b>${String(i + 1).padStart(2, "0")}</b><strong>${step}</strong><span>${["Shopify, Clover, Square, CSV", "SKU, location, cost, price", "Demand bands and confidence", "Buy, sell, hold, transfer", "Executive-ready summaries"][i]}</span></div>`).join("")}</div>`)}
  ${statBand([["8-week", "forecast horizon"], ["SKU + location", "planning grain"], ["Buy/sell/transfer", "action model"]])}`;
}

function featuresPage() {
  const features = [
    ["Stockout prediction", "Identify items likely to miss demand before they become revenue leakage.", inventoryMockup()],
    ["Overstock detection", "Rank excess inventory by value, carrying cost, and markdown urgency.", skuActionRows()],
    ["Forecast confidence", "Show planners when history is thin and when the model has enough evidence to be precise.", forecastMockup()],
    ["Marketplace signals", "Surface nearby retail partners and transfer opportunities when internal stock is imbalanced.", marketplaceMockup()],
  ];
  return `${pageHero("Features", "Features that turn inventory data into action.", "Everything is organized around decisions: what to buy, what to move, what to reduce, and where cash is exposed.", productFrame("Forecast lab", cleanForecastVisual(), "A cleaner model lab with inspectable forecasts and risk signals."), "features")}
  ${pageInteractive("Compare actions before planners commit.", "Use the queue mode to switch between lost-sales prevention and markdown/cash-release workflows.", "understock")}
  <section class="feature-zigzag">${features.map(([title, copy, art], i) => `<article class="${i % 2 ? "flip" : ""}"><div><p class="eyebrow">Feature ${i + 1}</p><h2>${esc(title)}</h2><p>${esc(copy)}</p></div>${productFrame(title, art)}</article>`).join("")}</section>`;
}

function solutionsPage() {
  const cards = [
    { title: "Supply Chain Managers", copy: "Prioritize risk by location, SKU, supplier, and forecast window.", kicker: "Operator", metric: "61", measure: "Network Risk Score", caption: "Lower scores indicate more urgent location and supplier exposure." },
    { title: "Inventory Planners", copy: "Move from spreadsheet checks to daily exception management.", kicker: "Operator", rows: queueRows("understock") },
    { title: "Operations Directors", copy: "See regional exposure and coordinate stores before stockouts spread.", kicker: "Operator", metric: "73", measure: "Regional Service Score", caption: "This score tracks store-level fulfillment readiness out of 100." },
    { title: "CFOs", copy: "Quantify working-capital impact, carrying cost, and avoidable revenue leakage.", kicker: "Executive" },
    { title: "Chief Supply Chain Officers", copy: "Standardize planning intelligence across banners, categories, and geographies.", kicker: "Executive" },
    { title: "CEOs", copy: "Understand inventory health as a growth, margin, and customer experience driver.", kicker: "Executive" },
  ];
  return `${pageHero("Solutions", "Solutions for every inventory decision maker.", "LiquidityLink gives each role the level of detail they need without forcing everyone into the same dashboard.", productFrame("Role-based workspace", roleWorkspaceVisual()), "solutions")}
  ${pageInteractive("Each role can inspect the same signal differently.", "Switch the action queue to see how planners and executives move between shortage and surplus priorities.", "understock")}
  <section class="role-matrix">${cards.map((card, i) => insightCard(card, i === 3 ? "cash" : i === 4 ? "routes" : i === 5 ? "growth" : i % 3 === 0 ? "gauge" : i % 3 === 1 ? "rows" : "bars")).join("")}</section>`;
}

function resourcesPage() {
  return `${pageHero("Resources", "Resources for evaluating inventory intelligence.", "Buyer guides, pilot templates, and executive narratives that help teams decide where to start.", "", "resources")}
  <section class="editorial-grid">${[
    { title: "Pilot playbook", copy: "How to define scope, connect data, and measure impact in the first 30 days." },
    { title: "Inventory risk score guide", copy: "The components behind demand gaps, stock position, and revenue exposure." },
    { title: "Executive business case", copy: "A template for connecting forecast accuracy to cash flow and margin." },
    { title: "Integration checklist", copy: "What to prepare before connecting POS, commerce, and warehouse data." },
  ].map((card, i) => `<article><div class="resource-thumb">${i % 2 ? inventoryMockup() : forecastMockup()}</div><p class="eyebrow">${i === 0 ? "Playbook" : i === 1 ? "Guide" : i === 2 ? "Template" : "Checklist"}</p><h2>${esc(card.title)}</h2><p>${esc(card.copy)}</p></article>`).join("")}</section>`;
}

function blogPage() {
  return marketingPage("Thinking for modern inventory teams.", "Executive-level writing on forecasting, stockout prevention, working capital, and retail operating discipline.", [
    { title: "Why stockouts are a finance problem", copy: "How availability failures quietly damage margin, retention, and inventory trust." },
    { title: "The limits of reorder points", copy: "Why static thresholds break down when demand changes faster than planning cycles." },
    { title: "How to run an inventory AI pilot", copy: "A practical sequence for proving value without a full platform migration." },
  ], "Blog");
}

function documentationPage() {
  return marketingPage("Documentation for implementation teams.", "Technical guidance for connecting data sources, validating imports, and understanding model outputs.", [
    { title: "CSV import format", copy: "Required fields: SKU, date, quantity sold, and location." },
    { title: "Shopify setup", copy: "OAuth connection, required scopes, sync status, and protected customer data requirements." },
    { title: "Clover setup", copy: "Sandbox and production app configuration, callback path, and merchant installation flow." },
    { title: "Model outputs", copy: "Definitions for risk score, 8-week demand, revenue at risk, and recommendation logic." },
  ], "Documentation");
}

function securityPage() {
  const controls = [
    { title: "Access control", copy: "Authenticated sessions, role-based workspaces, protected app routes, and admin-only team management.", status: "Active" },
    { title: "Credential handling", copy: "Provider secrets, API keys, OAuth tokens, and email credentials stay server-side in environment variables.", status: "Active" },
    { title: "Audit readiness", copy: "Connection status, sync errors, imports, invitations, and admin activity are organized for operational review.", status: "Active" },
    { title: "Data minimization", copy: "LiquidityLink uses SKU, order, location, and inventory signals needed for planning instead of broad customer profiles.", status: "Active" },
    { title: "Enterprise roadmap", copy: "SSO, SOC 2 readiness, custom retention, private deployments, and procurement workflows can be prioritized for larger accounts.", status: "Planned" },
    { title: "Transparent models", copy: "Forecast pages show inputs, assumptions, confidence ranges, comparison models, and recommended actions.", status: "Active" },
  ];
  return `${pageHero("Security", "Security built for enterprise evaluation.", "LiquidityLink is structured so procurement, IT, and operations can understand how data is handled before a pilot expands.", productFrame("Security control center", securityControlsVisual()), "security")}
  <section class="security-assurance">
    <div class="assurance-summary">
      <p class="eyebrow">Security posture</p>
      <h2>Controls are shown as operating evidence, not decorative badges.</h2>
      <p>Use this page to explain how LiquidityLink protects connected retail data during a pilot: who can access it, where credentials live, and what activity is reviewable.</p>
      <div class="assurance-metrics">
        <span><strong>0</strong><em>secrets exposed in browser</em></span>
        <span><strong>3</strong><em>workspace roles</em></span>
        <span><strong>6</strong><em>review areas</em></span>
      </div>
    </div>
    <div class="assurance-list">
      ${controls.map(card => `<article>
        <span>${icon("shield")}</span>
        <div><h3>${esc(card.title)}</h3><p>${esc(card.copy)}</p></div>
        <b class="${card.status === "Planned" ? "planned" : ""}">${esc(card.status)}</b>
      </article>`).join("")}
    </div>
  </section>`;
}

function integrationsPage() {
  return marketingPage("Connect the systems that already run your stores.", "Start with CSV, Shopify, Clover, or Square, then expand into ERPs, data warehouses, and private APIs.", [
    { title: "CSV upload", copy: "Fastest path to a pilot when historical sales data is already available." },
    { title: "Shopify", copy: "Pull products, orders, inventory levels, and store metadata through OAuth." },
    { title: "Clover", copy: "Connect POS merchant data for item, order, and inventory signals." },
    { title: "Square", copy: "Planned POS connection for sellers using Square locations and catalog data." },
    { title: "Enterprise APIs", copy: "Private integration path for ERPs, OMS, WMS, and data lake environments." },
    { title: "Marketplace data", copy: "Public business listings can support outreach, while private inventory requires store participation." },
  ], "Integrations");
}

function aboutPage() {
  return marketingPage("Built for retailers that cannot afford reactive inventory planning.", "LiquidityLink exists to make inventory decisions earlier, clearer, and easier to defend.", [
    { title: "Mission", copy: "Help retailers convert operational uncertainty into measurable inventory action." },
    { title: "Advisor program", copy: "A structured path for operators, supply chain leaders, and finance executives to shape the product." },
    { title: "Customer success", copy: "Pilots focus on one category, one measurable target, and one executive readout." },
    { title: "Competition wins", copy: "Where BI reports stop at visibility, LiquidityLink prioritizes decisions and action." },
  ], "About");
}

function contactPage() {
  return `${pageHero("Contact", "Talk to the LiquidityLink team.", "Use this page for enterprise evaluations, security reviews, partner integrations, or pilot scoping.", "", "contact")}
  <section class="contact-band">
    <div>
      <p class="eyebrow">Direct contact</p>
      <h2>Reach us where you already are.</h2>
      <p>Email us for pilots, retailer partnerships, product feedback, security questions, or integration planning. We will route the conversation to the right person.</p>
    </div>
    ${socialLinkStrip()}
  </section>
  <section class="contact-routing">
    ${[
      ["Sales", "Discuss pricing, rollout scope, category priorities, and pilot timing.", "Book demo"],
      ["Security", "Review data handling, access controls, credentials, and enterprise requirements.", "Email us"],
      ["Partnerships", "Explore integrations, marketplace participation, and private data connections.", "Email us"],
    ].map(([title, copy, action]) => `<article><span>${icon("mail")}</span><h3>${esc(title)}</h3><p>${esc(copy)}</p><a href="${action === "Book demo" ? "/book-demo" : "mailto:liquiditylink@gmail.com"}" ${action === "Book demo" ? 'data-route="/book-demo"' : ""}>${esc(action)}</a></article>`).join("")}
  </section>`;
}

function bookDemoPage() {
  return `<section class="marketing-page-hero demo-hero">
    <div>
      <p class="eyebrow">Book demo</p>
      <h1>Plan an inventory intelligence pilot.</h1>
      <p>Tell us your retail footprint, core inventory pain, and data source. We will shape the first pilot around measurable business impact.</p>
    </div>
    <div class="demo-hero-visual">${forecastMockup()}</div>
  </section>
  <section class="marketing-demo-grid">
    <form class="marketing-form" data-demo-form>
      <input class="hidden" name="website" tabindex="-1" autocomplete="off" />
      <label>Work email<input class="input" name="email" type="email" required placeholder="you@company.com" /></label>
      <label>Company<input class="input" name="company" required placeholder="Retail organization" /></label>
      <label>Store count<select class="input" name="stores" required><option value="">Choose range</option><option>1-5 stores</option><option>5-50 stores</option><option>50+ stores</option><option>Enterprise network</option></select></label>
      <label>What do you want to improve?<textarea class="input" name="goal" rows="5" required placeholder="Stockouts, excess inventory, cash flow, replenishment, marketplace coordination..."></textarea></label>
      <button class="btn-primary" type="submit" ${state.demoBusy ? "disabled" : ""}>${state.demoBusy ? spinner("Sending...") : "Request demo"}</button>
      ${state.demoMessage ? `<p class="form-status form-status--${esc(state.demoMessageType)}">${esc(state.demoMessage)}</p>` : ""}
    </form>
    <article class="marketing-card pilot-structure-card">
      <div class="pilot-card-logo">
        <img src="assets/liquiditylink-logo.png?v=9" alt="" aria-hidden="true" />
        <span>LiquidityLink</span>
      </div>
      <p class="eyebrow">Pilot structure</p>
      <h3>One data source. One category. One executive readout.</h3>
      <p>We recommend starting with a narrow operating question, then measuring forecast quality, avoidable stockout risk, and inventory cost exposure.</p>
      <div class="pilot-steps" aria-label="Pilot steps">
        <span>Connect data</span>
        <span>Model risk</span>
        <span>Review actions</span>
      </div>
    </article>
  </section>`;
}

function loginPage() {
  const mode = state.authMode;
  const isReset = mode === "reset";
  const title = ({ signin: "Sign in to LiquidityLink", signup: "Create your LiquidityLink account", forgot: "Reset your password", reset: "Choose a new password", mfa: "Enter your verification code" })[mode];
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
      <div class="auth-preview" aria-label="Interactive product preview">
        ${queuePanel("understock", "Switch the tabs or click a SKU to see how LiquidityLink explains the next action before you sign in.")}
        <div class="hero-forecast">${forecastMockup()}</div>
      </div>
      <p class="mono text-sm">LiquidityLink demo workspace</p>
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
        </div>
        <div class="auth-divider"><span>or use email</span></div>` : ""}
        ${authForm(mode)}
        ${!canUseAppRoutes() ? `<p class="auth-message auth-message--warning">${esc(authUnavailableMessage())}</p>` : ""}
        ${state.authMessage ? `<p class="auth-message">${esc(state.authMessage)}</p>` : ""}
      </section>
    </main>
  </section>`;
}

function socialButton(provider, label) {
  return `<button class="btn-ghost social-btn" data-social-auth="${provider}" type="button" ${state.authBusy ? "disabled" : ""} aria-label="Continue with ${label}"><span class="social-mark">${label[0]}</span>${label}</button>`;
}

function authInputClass(name) {
  return state.authFieldError?.field === name && authRoutes.has(location.pathname) ? " input--error" : "";
}

function authInlineError(name) {
  return state.authFieldError?.field === name && authRoutes.has(location.pathname)
    ? `<span class="input-error-msg">${esc(state.authFieldError.message)}</span>`
    : "";
}

function passwordField(id, name, label, autocomplete) {
  return `<div class="field"><label for="${id}">${label}</label><div class="password-wrap"><input id="${id}" class="input${authInputClass(name)}" name="${name}" type="password" autocomplete="${autocomplete}" /><button class="btn-icon password-toggle" data-toggle-password="${id}" type="button" aria-label="Show ${label.toLowerCase()}">${icon("eye")}</button></div>${authInlineError(name)}</div>`;
}

function authForm(mode) {
  if (mode === "signup") {
    return `<form class="form-stack" data-auth-form="signup" novalidate>
      <div class="auth-name-grid">
        <div class="field"><label for="firstName">First name</label><input id="firstName" class="input${authInputClass("firstName")}" name="firstName" autocomplete="given-name" />${authInlineError("firstName")}</div>
        <div class="field"><label for="lastName">Last name</label><input id="lastName" class="input${authInputClass("lastName")}" name="lastName" autocomplete="family-name" />${authInlineError("lastName")}</div>
      </div>
      <div class="field"><label for="signupCompany">Company</label><input id="signupCompany" class="input" name="company" autocomplete="organization" /></div>
      <div class="field"><label for="signupEmail">Work email</label><input id="signupEmail" class="input${authInputClass("email")}" name="email" type="email" autocomplete="email" />${authInlineError("email")}</div>
      ${passwordField("signupPassword", "password", "Password", "new-password")}
      ${passwordField("confirmPassword", "confirmPassword", "Confirm password", "new-password")}
      <p class="password-policy">Minimum 8 characters with uppercase, number, and special character.</p>
      <button class="btn-primary" type="submit" ${state.authBusy ? "disabled" : ""}>${state.authBusy ? spinner("Creating account...") : "Create account"}</button>
    </form>`;
  }
  if (mode === "forgot") {
    return `<form class="form-stack" data-auth-form="forgot" novalidate>
      <div class="field"><label for="forgotEmail">Work email</label><input id="forgotEmail" class="input${authInputClass("email")}" name="email" type="email" autocomplete="email" />${authInlineError("email")}</div>
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
      <div class="field"><label for="mfaCode">Verification code</label><input id="mfaCode" class="input${authInputClass("code")}" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" />${authInlineError("code")}</div>
      <button class="btn-primary" type="submit" ${state.authBusy ? "disabled" : ""}>${state.authBusy ? spinner("Verifying...") : "Verify and sign in"}</button>
      <button class="btn-ghost" data-auth-mode="signin" type="button">Back to sign in</button>
    </form>`;
  }
  return `<form class="form-stack" data-auth-form="signin" novalidate>
    <div class="field"><label for="email">Work email</label><input id="email" class="input${authInputClass("email")}" name="email" type="email" autocomplete="email" />${authInlineError("email")}</div>
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

function forecastMockup(activeModel = "ensemble") {
  const models = {
    holt: { label: "Holt trend", color: "var(--green)", note: "Smoothed short-history trend", values: [62, 86, 104, 126, 137, 146, 153, 158] },
    arima: { label: "ARIMA", color: "var(--text-muted)", note: "Recurring demand baseline", values: [50, 62, 70, 82, 104, 118, 126, 137] },
    xgboost: { label: "XGBoost", color: "var(--blue)", note: "Inventory and signal adjusted", values: [58, 82, 96, 116, 132, 141, 158, 166] },
    montecarlo: { label: "Monte Carlo", color: "var(--yellow)", note: "Risk-weighted scenario median", values: [54, 74, 89, 110, 124, 134, 149, 156] },
    ensemble: { label: "Ensemble", color: "var(--accent)", note: "Recommended operating forecast", values: [68, 91, 107, 132, 143, 156, 172, 184] },
  };
  const active = models[activeModel] ? activeModel : "ensemble";
  const baseline = models.arima;
  const selected = models[active];
  const w = 520, h = 230;
  const pad = { l: 44, r: 24, t: 54, b: 34 };
  const allValues = [...baseline.values, ...selected.values];
  const min = Math.max(0, Math.min(...allValues) - 18);
  const max = Math.max(...allValues) + 24;
  const x = index => pad.l + index * ((w - pad.l - pad.r) / 7);
  const y = value => h - pad.b - ((value - min) / (max - min)) * (h - pad.t - pad.b);
  const pathFor = values => values.map((value, index) => `${index ? "L" : "M"}${x(index)},${y(value)}`).join(" ");
  const bandTop = selected.values.map(value => Math.round(value * 1.1));
  const bandBottom = selected.values.map(value => Math.round(value * 0.9));
  const area = `${bandTop.map((value, index) => `${index ? "L" : "M"}${x(index)},${y(value)}`).join(" ")} ${[...bandBottom].reverse().map((value, reverseIndex) => `L${x(7 - reverseIndex)},${y(value)}`).join(" ")} Z`;
  const points = selected.values.map((value, index) => {
    const tip = `<strong>Wk ${index + 1} · ${selected.label}</strong><span>Projected demand: ${fmt(value)}K units</span><span>${selected.note}</span><span>Confidence band: ${fmt(Math.round(value * 0.9))}K-${fmt(Math.round(value * 1.1))}K</span>`;
    return `<g class="chart-point" tabindex="0" data-chart-tip="${attr(tip)}"><circle cx="${x(index)}" cy="${y(value)}" r="13" fill="var(--bg-base)" opacity="0.001"/><circle cx="${x(index)}" cy="${y(value)}" r="${index === 5 ? 8 : 4}" fill="${selected.color}"/></g>`;
  }).join("");
  return `<svg class="forecast-mockup-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${attr(`${selected.label} forecast chart demo`)}">
    <rect width="${w}" height="${h}" rx="8" fill="var(--bg-elevated)"/>
    <text x="${pad.l}" y="28" fill="var(--text-primary)" font-weight="700">8-week demand forecast</text>
    <text x="${pad.l}" y="46" fill="var(--text-muted)">${selected.label} · ${selected.note}</text>
    ${[0, 1, 2, 3].map(i => {
      const gy = pad.t + i * 38;
      const value = Math.round(max - ((max - min) * i) / 3);
      return `<line x1="${pad.l}" x2="${w - pad.r}" y1="${gy}" y2="${gy}" class="chart-grid"/><text x="14" y="${gy + 4}" fill="var(--text-muted)">${value}</text>`;
    }).join("")}
    <path d="${area}" fill="var(--accent-dim)" opacity=".55"/>
    ${active !== "arima" ? `<path d="${pathFor(baseline.values)}" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="5 6" stroke-linecap="round" opacity=".58"/>` : ""}
    <path d="${pathFor(selected.values)}" fill="none" stroke="${selected.color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    ${points}
    <rect x="${w - 182}" y="16" width="150" height="44" rx="7" fill="var(--bg-surface)" stroke="var(--border-default)"/>
    <text x="${w - 168}" y="36" fill="var(--text-primary)">Wk 6: ${fmt(selected.values[5])}K</text>
    <text x="${w - 168}" y="52" fill="var(--text-muted)">${active === "arima" ? "baseline model" : `${selected.values[5] - baseline.values[5] >= 0 ? "+" : ""}${fmt(selected.values[5] - baseline.values[5])}K vs ARIMA`}</text>
    ${[0, 2, 4, 7].map(index => `<text x="${x(index)}" y="${h - 11}" text-anchor="middle" fill="var(--text-muted)">W${index + 1}</text>`).join("")}
    <circle cx="${pad.l}" cy="${h - 22}" r="4" fill="${selected.color}"/><text x="${pad.l + 10}" y="${h - 18}" fill="var(--text-muted)">${selected.label}</text>
    ${active !== "arima" ? `<circle cx="${pad.l + 128}" cy="${h - 22}" r="4" fill="var(--text-muted)"/><text x="${pad.l + 138}" y="${h - 18}" fill="var(--text-muted)">ARIMA</text>` : ""}
  </svg>`;
}

function inventoryMockup() {
  return `<svg viewBox="0 0 520 280" role="img" aria-label="Inventory recommendations demo">
    <rect width="520" height="280" rx="8" fill="var(--bg-elevated)"/>
    <text x="34" y="27" fill="var(--text-primary)" font-weight="700">SKU recommendation queue</text>
    <text x="34" y="45" fill="var(--text-muted)">Risk percent, action tag, and planner priority</text>
    ${[
      ["Trail Running Shoes", "91% stockout", "buy", "var(--red)"],
      ["Insulated Bottle", "78% overstock", "sell", "var(--yellow)"],
      ["Dry Bag 10L", "transfer match", "transfer", "var(--blue)"],
    ].map((row, i) => {
      const y = 68 + i * 58;
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
    <text x="28" y="28" fill="var(--text-primary)" font-weight="700">Nearby transfer marketplace</text>
    <text x="28" y="46" fill="var(--text-muted)">Distance and inventory match score by partner</text>
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
  const products = activeSkuData();
  const hasLiveData = Boolean(state.salesRecords.length || state.inventoryItems.length);
  const dataSourceCopy = state.salesRecords.length
    ? `${state.salesRecords.length} imported sales rows and ${products.length} analyzed SKUs from ${state.inventoryItems.length} Shopify inventory records powering this view.`
    : state.inventoryItems.length
      ? `${products.length} analyzed SKUs from ${state.inventoryItems.length} Shopify inventory records. Sync orders or upload CSV history to forecast demand.`
    : "Import CSV sales data or sync Shopify to replace the starter sample.";
  const importedMetrics = hasLiveData ? importedDashboardMetrics(products) : null;
  const quality = state.advancedAnalytics?.summary || {};
  const qualityBanners = hasLiveData ? `${quality.sampleCatalogDetected ? `<div class="data-warning"><strong>Sample catalog detected.</strong> ${fmt(quality.excludedSampleSkus)} Shopify default product${quality.excludedSampleSkus === 1 ? " was" : "s were"} excluded from analysis.</div>` : ""}${quality.enoughData === false ? `<div class="data-warning"><strong>Not enough data for reliable forecasting.</strong> Current outputs are directional only. Import at least 20 transactions across 3 selling SKUs.</div>` : ""}` : "";
  const cards = importedMetrics?.cards || [
    ["Inventory Risk Score", state.riskScore, "HIGH RISK", "↑ 8pts vs last week", "3 transfers recommended to reduce to medium.", "bad", "accent", "high"],
    ["Total Inventory Value", "$12.8M", "", "↑ 2.1%", "Across all connected stores.", "good", "", "success"],
    ["Revenue at Risk", `$${Math.round(state.revenueRisk / 1000)}K`, "9 SKUs", "↑ $48K", "Likely stockout loss this week.", "bad", "", "warning"],
    ["Excess Cost", "$312K", "", "↓ $12K", "Markdown and carrying cost.", "good", "", "success"],
  ];
  const chartData = importedForecastData(products);
  return pageShell("Dashboard", state.lastUpdated, `
    ${qualityBanners}
    <div class="toolbar-spread"><p class="muted">${esc(dataSourceCopy)}</p><button class="btn-primary" data-refresh type="button" ${state.refreshing ? "disabled" : ""}>${state.refreshing ? spinner("Refreshing...") : `${icon("chart-line")}Refresh analysis`}</button></div>
    <section class="kpi-grid">${cards.map((c, i) => kpiCard(c, i)).join("")}</section>
    ${shopifyOperatingHub(products)}
    <section class="grid-2">
      <article class="card"><div class="toolbar-spread"><div><p class="eyebrow">Forecast</p><h2 class="text-lg">8-week demand outlook</h2></div><div class="legend"><span><i style="background:var(--accent)"></i>Ensemble</span><span><i style="background:var(--blue)"></i>XGBoost</span><span><i style="background:var(--text-muted)"></i>ARIMA</span></div></div><div class="chart">${lineChart(chartData, 820, 280)}</div><p class="chart-caption"><strong>Demand forecast</strong> Weekly unit projection by model; the shaded band shows lower and upper confidence bounds.</p></article>
      <article class="card"><p class="eyebrow">Recommendations</p><h2 class="text-lg">Action queue</h2><div class="report-list">${products.slice(0, 5).map(s => `<div class="report-row"><span>${esc(s.product)}</span><span class="badge badge--${s.action}">${s.action}</span></div>`).join("")}</div></article>
    </section>
  `);
}

function kpiCard([label, value, badge, trend, subtext, trendClass, accent, badgeTone], index) {
  if (state.refreshing) return `<article class="card kpi-card ${accent ? "card--accent" : ""}"><div class="skeleton skel-line"></div><div class="skeleton skel-line" style="height:38px;width:70%"></div><div class="skeleton skel-line" style="width:85%"></div></article>`;
  const tone = badgeTone || (index === 0 ? "high" : "warning");
  return `<article class="card kpi-card ${accent ? "card--accent" : ""}">
    <div class="kpi-top"><p class="eyebrow">${label}</p>${badge ? `<span class="badge badge--${tone}">${badge}</span>` : ""}</div>
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
  const sources = ["csv", "shopify", "clover", "square"];
  return pageShell("Connect Store", "Link systems, import data, and run the first analysis.", `
    <section class="connection-status-grid">${sources.map(connectionCard).join("")}</section>
    <section class="grid-2">
      <article class="card"><p class="eyebrow">Selected integration</p><h2 class="text-lg">${providerName(state.selectedProvider)}</h2>${integrationPanel()}</article>
      <article class="card"><p class="eyebrow">Providers</p><div class="connector-grid">${sources.map(p => `<button class="btn-ghost connector-card ${state.selectedProvider === p ? "selected" : ""}" data-provider="${p}" type="button">${providerName(p)}</button>`).join("")}</div></article>
    </section>
    <article class="card">${complete ? `<div class="card card--accent" style="margin-bottom:var(--space-4)">Setup complete. Your first analysis is ready. <a data-route="/" href="/">View Dashboard →</a></div>` : ""}<p class="eyebrow">Setup checklist</p><div class="checklist">${checkRows()}</div></article>
  `);
}

function connectionCard(provider) {
  const status = state.connectionStatus[provider] || {};
  const label = providerName(provider);
  const tone = ({ connected: "success", error: "high", needs_reauth: "warning", not_connected: "info" })[status.status] || "info";
  const statusLabel = String(status.status || "not_connected").replace("_", " ");
  const lastSync = status.lastSyncedAt ? `Last sync ${new Date(status.lastSyncedAt).toLocaleString()}` : "No sync yet";
  return `<article class="card connection-card">
    <div class="toolbar-spread"><div><p class="eyebrow">${label}</p><h2 class="text-md">${esc(statusLabel)}</h2></div><span class="badge badge--${tone}">${esc(statusLabel)}</span></div>
    <p>${esc(status.detail || "")}</p>
    <p class="muted mono">${esc(lastSync)}</p>
    <div class="toolbar-spread"><button class="btn-ghost" data-provider="${provider}" type="button">Manage</button><button class="btn-primary" data-sync-source="${provider}" type="button" ${state.connectionsBusy === provider ? "disabled" : ""}>${state.connectionsBusy === provider ? spinner("Syncing...") : "Sync now"}</button></div>
  </article>`;
}

function providerName(key) {
  return ({ shopify: "Shopify", square: "Square", lightspeed: "Lightspeed", clover: "Clover", netsuite: "NetSuite", sap: "SAP", csv: "CSV Upload", instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook Page" })[key] || titleCase(key || "Provider");
}

function integrationPanel() {
  if (state.selectedProvider === "csv") {
    const errors = state.csv?.errors || [];
    const validCount = state.csv?.records?.length || 0;
    return `<div class="form-stack">
      <label class="drop-zone" data-drop><input class="hidden" data-csv type="file" accept=".csv" />${icon("upload")}<span>Drop a .csv file here, or click to browse</span></label>
      <div class="card connection-help csv-help">
        <div>
          <p class="eyebrow">Accepted CSV format</p>
          <p>Upload a plain <strong>.csv</strong> file exported from Shopify, a POS, or a spreadsheet. The first row must contain column headers.</p>
        </div>
        <div class="csv-schema-grid">
          <span><strong>sku</strong><em>Also accepts Shopify Lineitem SKU / Variant SKU</em></span>
          <span><strong>date</strong><em>Also accepts Created at, Paid at, or Order Date</em></span>
          <span><strong>quantity sold</strong><em>Also accepts Lineitem quantity or Net quantity</em></span>
          <span><strong>location</strong><em>Optional for Shopify exports; defaults to Shopify export</em></span>
        </div>
        <button class="btn-ghost" data-sample-csv type="button">${icon("download")}Download sample CSV</button>
      </div>
      ${state.csv?.loading ? `<div class="progress"><span></span></div>` : ""}
      ${state.csv?.name && !state.csv.loading ? `<p class="muted">File loaded: ${esc(state.csv.name)}. ${validCount} valid rows ready${errors.length ? `, ${errors.length} rows need fixes` : ""}.</p>` : ""}
      ${state.csv?.rows ? previewTable(state.csv.rows) : ""}
      ${errors.length ? `<div class="error-list"><strong>Rows to fix</strong>${errors.slice(0, 8).map(e => `<p>Row ${e.row}: ${esc(e.errors.join(" "))}</p>`).join("")}${errors.length > 8 ? `<p>And ${errors.length - 8} more...</p>` : ""}</div>` : ""}
      ${state.csv?.records?.length ? `<button class="btn-primary" data-import-csv type="button" ${state.providerBusy ? "disabled" : ""}>${state.providerBusy ? spinner("Importing...") : "Import CSV"}</button>` : ""}
    </div>`;
  }
  const status = state.connectionStatus[state.selectedProvider] || {};
  if (state.selectedProvider === "shopify") {
    return `<form class="form-stack" data-shopify-connect>
      <p>${esc(status.detail || "Connect a Shopify store to sync orders into forecasts.")}</p>
      <div class="field">
        <label for="shopifyShop">Shopify store domain</label>
        <input id="shopifyShop" class="input" name="shop" value="${esc(state.shopifyShop || status.externalAccount || "")}" placeholder="your-store.myshopify.com" autocomplete="off" />
      </div>
      <details class="connection-instructions">
        <summary>${icon("help")}<span>How do I connect Shopify?</span></summary>
        <ol class="instruction-list">
          <li><strong>Find your Shopify store domain.</strong> In Shopify Admin, look at the browser address or store settings and copy the domain that ends in <code>.myshopify.com</code>, such as <code>your-store.myshopify.com</code>. Do not paste <code>admin.shopify.com/store/...</code> or a customer-facing domain like <code>yourstore.com</code>.</li>
          <li><strong>Click Connect Shopify.</strong> LiquidityLink opens Shopify's approval screen. The word “app” here means the Shopify integration connection that lets LiquidityLink read store data after the store owner approves it.</li>
          <li><strong>Approve the requested read-only permissions.</strong> The integration needs <code>read_orders</code>, <code>read_products</code>, <code>read_inventory</code>, and <code>read_locations</code>. These let LiquidityLink read order history, product and variant SKUs, inventory quantities, and store locations.</li>
          <li><strong>Return to LiquidityLink.</strong> Shopify redirects back to this site after approval. LiquidityLink stores the access token server-side, not in the browser.</li>
          <li><strong>Press Sync now.</strong> Sync imports Shopify products, variants, inventory levels, locations, and recent orders into the dashboard, forecasts, inventory table, and advanced analytics.</li>
          <li><strong>If forecasts still look empty, check order history.</strong> Inventory can sync without enough sales history. Add or sync completed Shopify orders for the SKUs you want forecasted, then press <strong>Sync now</strong> again.</li>
        </ol>
      </details>
      <div class="card connection-help">
        <p class="eyebrow">Required Shopify scopes</p>
        <p>In the Shopify developer dashboard for the LiquidityLink integration, enable <code>read_orders</code>, <code>read_products</code>, <code>read_inventory</code>, and <code>read_locations</code>. The callback URL must be <code>/api/integrations/shopify/callback</code> on this site.</p>
      </div>
      <div class="card connection-help">
        <p class="eyebrow">Pilot fallback</p>
        <p>If Shopify app distribution is still pending, ask the store owner to create a Shopify custom app with the same read-only Admin API scopes, then paste the Admin API access token here. LiquidityLink stores it server-side and uses the same Sync now flow.</p>
        <div class="field">
          <label for="shopifyAccessToken">Admin API access token</label>
          <input id="shopifyAccessToken" class="input" name="accessToken" type="password" placeholder="shpat_..." autocomplete="off" />
        </div>
        <button class="btn-ghost" data-shopify-token type="button" ${state.connectionsBusy === "shopify-token" ? "disabled" : ""}>${state.connectionsBusy === "shopify-token" ? spinner("Connecting...") : "Connect with token"}</button>
      </div>
      <div class="toolbar">
        <button class="btn-primary" type="submit" ${state.connectionsBusy === "shopify" ? "disabled" : ""}>${state.connectionsBusy === "shopify" ? spinner("Opening Shopify...") : "Connect Shopify"}</button>
        <button class="btn-ghost" data-sync-source="shopify" type="button" ${state.connectionsBusy === "shopify" ? "disabled" : ""}>Sync now</button>
      </div>
    </form>`;
  }
  if (state.selectedProvider === "clover") {
    const cloverMerchantValue = state.cloverMerchantId || (status.status === "needs_reauth" ? "" : status.externalAccount || "");
    return `<form class="form-stack" data-clover-connect>
      <p>${esc(status.detail || "Connect a Clover merchant to sync orders and inventory into forecasts.")}</p>
      <div class="field">
        <label for="cloverMerchantId">Clover merchant ID</label>
        <input id="cloverMerchantId" class="input" name="merchantId" value="${esc(cloverMerchantValue)}" placeholder="Optional: leave blank to choose in Clover" autocomplete="off" />
      </div>
      <details class="connection-instructions">
        <summary>${icon("help")}<span>How do I connect Clover?</span></summary>
        <ol class="instruction-list">
          <li>Create a Clover developer app and add the redirect URL <code>${location.origin}/api/integrations/clover/callback</code>.</li>
          <li>Add <code>CLOVER_CLIENT_ID</code>, <code>CLOVER_CLIENT_SECRET</code>, and <code>CLOVER_ENV</code> to Render environment variables.</li>
          <li>Paste your Clover merchant ID if you have it, or leave the field blank and choose the merchant on Clover's authorization screen.</li>
          <li>Press <strong>Connect Clover</strong>, approve the app, then return here and press <strong>Sync now</strong>.</li>
          <li>The Clover app needs permission to read inventory/items and orders.</li>
        </ol>
      </details>
      <div class="card connection-help">
        <p class="eyebrow">Clover data imported</p>
        <p>LiquidityLink imports Clover items as inventory and Clover order line items as sales history.</p>
      </div>
      <div class="toolbar">
        <button class="btn-primary" type="submit" ${state.connectionsBusy === "clover" ? "disabled" : ""}>${state.connectionsBusy === "clover" ? spinner("Opening Clover...") : status.status === "needs_reauth" ? "Reconnect Clover" : "Connect Clover"}</button>
        <button class="btn-ghost" data-sync-source="clover" type="button" ${state.connectionsBusy === "clover" ? "disabled" : ""}>Sync now</button>
      </div>
    </form>`;
  }
  return `<div class="form-stack">
    <p>${esc(status.detail || `${providerName(state.selectedProvider)} is not connected yet.`)}</p>
    <div class="card connection-help">
      <p class="eyebrow">OAuth setup required</p>
      <p>To enable live ${providerName(state.selectedProvider)} imports, create a developer app for this provider, add the client ID and secret to Render environment variables, then deploy again.</p>
    </div>
    <button class="btn-primary" data-sync-source="${state.selectedProvider}" type="button" ${state.connectionsBusy === state.selectedProvider ? "disabled" : ""}>${state.connectionsBusy === state.selectedProvider ? spinner("Checking...") : `Check ${providerName(state.selectedProvider)} connection`}</button>
  </div>`;
}

function previewTable(rows) {
  return `<div class="table-wrap"><table class="data-table"><tbody>${rows.slice(0, 6).map(r => `<tr>${r.slice(0, 5).map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function socialSignalsPage() {
  const providers = ["instagram", "tiktok", "facebook"];
  const promotions = state.socialPromotions || [];
  const totalLift = promotions.reduce((sum, promo) => sum + Number(promo.estimatedLiftPct || 0), 0);
  const avgLift = promotions.length ? Math.round(totalLift / promotions.length) : 0;
  const buyIntent = promotions.reduce((sum, promo) => sum + Number(promo.buyIntentCount || 0), 0);
  return pageShell("Social Signals", "Connect social channels and measure how promotions change SKU-level demand.", `
    <section class="social-signal-hero">
      <article class="card card--accent">
        <p class="eyebrow">Promotion-aware forecasting</p>
        <h2 class="text-lg">Turn posts, comments, and engagement into demand signals.</h2>
        <p>LiquidityLink will use authorized social data to compare promotion response against Shopify or CSV sales. Until API keys are added, use the manual promotion form to start collecting the same model inputs.</p>
      </article>
      <article class="card social-signal-kpis">
        <span><strong>${fmt(promotions.length)}</strong><em>tracked promotions</em></span>
        <span><strong>${fmt(avgLift)}%</strong><em>average demand lift</em></span>
        <span><strong>${fmt(buyIntent)}</strong><em>buy-intent comments</em></span>
      </article>
    </section>
    <section class="connection-status-grid social-provider-grid">${providers.map(socialConnectionCard).join("")}</section>
    <section class="grid-2">
      <article class="card">
        <p class="eyebrow">Manual promotion signal</p>
        <h2 class="text-lg">Add a post before API access is live</h2>
        <form class="form-stack" data-social-promotion-form>
          <div class="grid-2 compact-form-grid">
            <div class="field"><label for="socialProvider">Channel</label><select id="socialProvider" class="input" name="provider">${providers.map(p => `<option value="${p}">${providerName(p)}</option>`).join("")}</select></div>
            <div class="field"><label for="socialSku">Product / SKU promoted</label><input id="socialSku" class="input" name="sku" placeholder="Golden Hour Dress or SKU-001" required /></div>
          </div>
          <div class="field"><label for="socialUrl">Post URL</label><input id="socialUrl" class="input" name="postUrl" placeholder="https://www.instagram.com/p/..." /></div>
          <div class="field"><label for="socialCaption">Caption or campaign note</label><textarea id="socialCaption" class="input" name="caption" rows="3" placeholder="Caption text, promotion theme, product drop details..."></textarea></div>
          <div class="grid-3 compact-form-grid">
            <div class="field"><label for="socialPostDate">Post date</label><input id="socialPostDate" class="input" name="postDate" type="date" required /></div>
            <div class="field"><label for="socialLikes">Likes</label><input id="socialLikes" class="input" name="likes" type="number" min="0" value="0" /></div>
            <div class="field"><label for="socialComments">Comments</label><input id="socialComments" class="input" name="comments" type="number" min="0" value="0" /></div>
          </div>
          <div class="grid-3 compact-form-grid">
            <div class="field"><label for="socialShares">Shares</label><input id="socialShares" class="input" name="shares" type="number" min="0" value="0" /></div>
            <div class="field"><label for="socialSaves">Saves</label><input id="socialSaves" class="input" name="saves" type="number" min="0" value="0" /></div>
            <div class="field"><label for="socialBuyIntent">Buy-intent comments</label><input id="socialBuyIntent" class="input" name="buyIntentCount" type="number" min="0" value="0" /></div>
          </div>
          <div class="field"><label for="socialExpectedLift">Expected demand lift %</label><input id="socialExpectedLift" class="input" name="expectedLiftPct" type="number" min="0" placeholder="Example: 35" /></div>
          <button class="btn-primary" type="submit" ${state.socialPromotionBusy ? "disabled" : ""}>${state.socialPromotionBusy ? spinner("Saving...") : "Save promotion signal"}</button>
        </form>
      </article>
      <article class="card">
        <p class="eyebrow">Tomorrow's API setup</p>
        <h2 class="text-lg">Environment variables to add on Render</h2>
        <div class="env-list">
          <span><strong>INSTAGRAM_CLIENT_ID</strong><em>Meta app ID</em></span>
          <span><strong>INSTAGRAM_CLIENT_SECRET</strong><em>Meta app secret</em></span>
          <span><strong>TIKTOK_CLIENT_KEY</strong><em>TikTok app client key</em></span>
          <span><strong>TIKTOK_CLIENT_SECRET</strong><em>TikTok app secret</em></span>
          <span><strong>FACEBOOK_CLIENT_ID</strong><em>Optional page connection</em></span>
          <span><strong>FACEBOOK_CLIENT_SECRET</strong><em>Optional page connection</em></span>
        </div>
        <p class="muted">Callback URLs use this pattern: <span class="mono">${location.origin}/api/integrations/social/:provider/callback</span></p>
      </article>
    </section>
    <article class="card">
      <div class="toolbar-spread">
        <div><p class="eyebrow">Promotion impact log</p><h2 class="text-lg">Saved social demand signals</h2></div>
        <button class="btn-ghost" data-refresh-social type="button">Refresh</button>
      </div>
      ${socialPromotionTable(promotions)}
    </article>
  `);
}

function socialConnectionCard(provider) {
  const status = state.connectionStatus[provider] || {};
  const tone = ({ connected: "success", error: "high", needs_reauth: "warning", not_connected: "info" })[status.status] || "info";
  const statusLabel = String(status.status || "not_connected").replace("_", " ");
  const busy = state.socialProviderBusy === provider;
  return `<article class="card connection-card social-provider-card">
    <div class="toolbar-spread"><div><p class="eyebrow">${providerName(provider)}</p><h2 class="text-md">${esc(statusLabel)}</h2></div><span class="badge badge--${tone}">${esc(statusLabel)}</span></div>
    <p>${esc(status.detail || "")}</p>
    <p class="muted mono">${status.externalAccount ? esc(status.externalAccount) : "No social account linked yet"}</p>
    <div class="toolbar">
      <button class="btn-primary" data-social-connect="${provider}" type="button" ${busy ? "disabled" : ""}>${busy ? spinner("Checking...") : `Connect ${providerName(provider)}`}</button>
      <button class="btn-ghost" data-sync-source="${provider}" type="button" ${state.connectionsBusy === provider ? "disabled" : ""}>${state.connectionsBusy === provider ? spinner("Syncing...") : "Sync posts"}</button>
    </div>
  </article>`;
}

function socialPromotionTable(promotions) {
  if (!promotions.length) return `<div class="empty-state">No promotion signals saved yet. Add one manually or connect a social account after API credentials are configured.</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr><th>Channel</th><th>Product / SKU</th><th>Post date</th><th>Engagement</th><th>Demand lift</th><th>Signal</th></tr></thead>
    <tbody>${promotions.map(promo => `<tr>
      <td><strong>${esc(providerName(promo.provider))}</strong><br><span class="muted mono">${promo.postUrl ? `<a href="${attr(promo.postUrl)}" target="_blank" rel="noreferrer">open post</a>` : "manual signal"}</span></td>
      <td>${esc(promo.sku || "Unmatched product")}<br><span class="muted">${esc(promo.caption || "")}</span></td>
      <td>${esc(promo.postDate || "")}</td>
      <td>${fmt(promo.likes || 0)} likes / ${fmt(promo.comments || 0)} comments</td>
      <td><span class="badge badge--info">${fmt(promo.estimatedLiftPct || 0)}%</span></td>
      <td>${fmt(promo.buyIntentCount || 0)} buy-intent comments</td>
    </tr>`).join("")}</tbody>
  </table></div>`;
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
  const products = activeSkuData();
  const chartData = importedForecastData(products);
  const summary = forecastSummary(chartData);
  const quality = state.advancedAnalytics?.summary || {};
  const dataNote = state.salesRecords.length
    ? `${state.salesRecords.length} synced sales rows and ${products.length} analyzed SKUs from ${state.inventoryItems.length} Shopify inventory records. Forecast confidence improves as more order history syncs.`
    : state.inventoryItems.length
      ? `${products.length} analyzed SKUs from ${state.inventoryItems.length} Shopify inventory records. Sync orders or upload CSV history to enable demand forecasts.`
    : "Starter sample forecast. Connect Shopify or upload CSV for store-specific output.";
  const modelNotes = state.salesRecords.length
    ? accordion("ARIMA", "Observed baseline", ["Uses synced Shopify order quantities grouped by SKU", "Calculates observed weekly demand from available order history", "Output: conservative demand baseline until more history is available"], "Shopify orders", "Weekly baseline")
      + accordion("Holt trend", "Sparse-history stabilizer", ["Smooths weekly demand when Shopify history is short", "Prevents a one-order spike from becoming the whole forecast", "Output: trend-safe weekly demand path"], "Recent weekly units", "Trend forecast")
      + accordion("XGBoost", "Inventory-adjusted forecast", ["Uses synced Shopify inventory on hand and variant prices", "Compares 8-week demand against current stock", "Output: demand adjustment for buy, hold, sell, or transfer recommendations"], "Sales + inventory", "Adjusted demand")
      + accordion("Monte Carlo", "Demand stress test", ["Simulates upside and downside demand scenarios from the confidence band", "Highlights stockout and overstock exposure under uncertainty", "Output: risk-band width and confidence penalty"], "Forecast band", "Risk distribution")
      + accordion("Ensemble", "Operational forecast", ["Blends the baseline demand forecast with inventory-adjusted signals", "Uses a wider confidence band while synced order history is limited", "Output: final forecast and SKU action recommendation"], "ARIMA + XGBoost", "Forecast + action")
    : accordion("ARIMA", "Demand baseline", ["Uses 24 months of daily sales data to detect seasonality", "Removes trend to isolate repeatable demand cycles", "Output: weekly baseline forecast ±8% confidence band"], "Daily sales", "Weekly baseline")
      + accordion("Holt trend", "Trend smoothing", ["Responds to recent movement without overreacting to one week", "Works as a fallback for short product histories", "Output: smoothed demand trajectory"], "Weekly units", "Trend forecast")
      + accordion("XGBoost", "Signal adjustment", ["Uses promotions, holidays, stock levels, and regional signals", "Ranks demand drivers by predictive lift", "Output: demand-adjusted forecast"], "Sales + external signals", "Adjusted demand")
      + accordion("Monte Carlo", "Risk simulation", ["Samples demand around the forecast confidence interval", "Quantifies stockout probability and excess exposure", "Output: risk distribution for planning"], "Forecast range", "Scenario risk")
      + accordion("Ensemble", "Operational forecast", ["Blends statistical baseline with ML adjustment", "Weights models by recent forecast error", "Output: SKU action recommendations"], "ARIMA + XGBoost", "Buy, sell, hold, transfer");
  return pageShell("Forecasts", "Model output, confidence bands, and seasonal demand.", `
    ${quality.enoughData === false ? `<div class="data-warning"><strong>Low-confidence forecast.</strong> Flat lines reflect limited order history, not stable demand. Add at least 20 transactions across 3 selling SKUs before using this forecast for purchasing.</div>` : ""}
    <p class="muted">${esc(dataNote)}</p>
    <section class="grid-3">
      <article class="card"><p class="eyebrow">${state.salesRecords.length ? "Observed baseline" : "ARIMA"}</p><div class="metric-value">${fmt(summary.arima)}</div><p class="muted">${esc(summary.label)}</p></article>
      <article class="card"><p class="eyebrow">${state.salesRecords.length ? "Adjusted forecast" : "XGBoost"}</p><div class="metric-value">${fmt(summary.xgboost)}</div><p class="muted">${esc(summary.xgbLabel)}</p></article>
      <article class="card card--accent"><p class="eyebrow">Ensemble</p><div class="metric-value">${fmt(summary.ensemble)}</div><p class="muted">${esc(summary.ensembleLabel)}</p></article>
    </section>
    ${modelDiagnosticsGrid(chartData, products)}
    <section class="card"><div class="toolbar-spread"><div><p class="eyebrow">8-week demand forecast</p><h2 class="text-lg">Forecast blend</h2></div><div class="legend"><span><i style="background:var(--accent)"></i>Ensemble</span><span><i style="background:var(--blue)"></i>Adjusted</span><span><i style="background:var(--text-muted)"></i>Baseline</span></div></div><div id="forecastChart" class="chart">${lineChart(chartData, 900, 280)}</div><p class="chart-caption"><strong>Unit forecast</strong> The x-axis is forecast week and the y-axis is projected demand units.</p></section>
    <section class="grid-2"><article class="card"><p class="eyebrow">${state.salesRecords.length ? "Forecast confidence" : "Monte Carlo simulation"}</p><div id="mcChart" class="chart chart-small">${areaChart(chartData)}</div><p class="chart-caption"><strong>Uncertainty band</strong> ${state.salesRecords.length < 20 ? "Limited order history widens the range; treat the forecast as directional." : "Range is estimated from observed weekly demand variance."}</p></article><article class="card"><p class="eyebrow">Seasonal demand</p><div id="seasonChart" class="chart chart-tiny">${barChart(seasonalDemandData())}</div><p class="chart-caption"><strong>Monthly demand</strong> Bars show units by month so buyers can see seasonal lift and troughs.</p></article></section>
    ${riskModelWorkbench(products)}
    <section class="card"><p class="eyebrow">How each model works</p><div class="accordion">${modelNotes}</div></section>
  `);
}

function accordion(title, sub, bullets, input, output) {
  return `<div class="accordion-item"><button class="accordion-trigger" data-accordion type="button"><span><strong>${title}</strong> <span class="muted">${sub}</span></span><span>expand</span></button><div class="accordion-body"><div class="accordion-content"><ul>${bullets.map(b => `<li>${b}</li>`).join("")}</ul><div class="io-grid"><div><p class="eyebrow">Inputs</p><span class="mono">${input}</span></div><div><p class="eyebrow">Output</p><span class="mono">${output}</span></div></div></div></div></div>`;
}

function inventoryPage() {
  if (state.loading) return pageShell("Inventory", "SKU-level recommendations and risk signals.", skeletonPage("table"), "SKU RECOMMENDATIONS");
  const q = state.inventoryFilter.toLowerCase();
  const products = activeSkuData();
  const filtered = products.filter(s => (state.actionFilter === "all" || s.action === state.actionFilter) && (s.product.toLowerCase().includes(q) || s.sku.toLowerCase().includes(q)));
  const sorters = { risk_desc: (a,b) => b.stockout-a.stockout, stock_desc: (a,b) => b.current-a.current, demand_desc: (a,b) => b.forecast-a.forecast, name_asc: (a,b) => a.product.localeCompare(b.product) };
  const sorted = [...filtered].sort(sorters[state.inventorySort] || sorters.risk_desc);
  const pages = Math.max(1, Math.ceil(sorted.length / state.inventoryPageSize));
  state.inventoryPage = Math.min(state.inventoryPage, pages);
  const rows = sorted.slice((state.inventoryPage - 1) * state.inventoryPageSize, state.inventoryPage * state.inventoryPageSize);
  return pageShell("Inventory", `Showing ${rows.length} of ${filtered.length} matching products`, `
    <div class="toolbar"><input class="input" data-inventory-search style="max-width:240px" value="${esc(state.inventoryFilter)}" placeholder="Search name or SKU" /><select class="select" data-inventory-sort><option value="risk_desc">Highest risk</option><option value="stock_desc">Most stock</option><option value="demand_desc">Highest demand</option><option value="name_asc">Product name</option></select>${["all", "buy", "sell", "hold", "transfer"].map(a => `<button class="btn-ghost ${state.actionFilter === a ? "active" : ""}" data-action-filter="${a}" type="button">${a[0].toUpperCase() + a.slice(1)}</button>`).join("")}</div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Product + SKU</th><th>Current Stock</th><th>Forecasted Demand</th><th>Stockout %</th><th>Overstock %</th><th>Data quality</th><th>Action</th></tr></thead><tbody>${rows.length ? rows.map(skuRow).join("") : `<tr><td colspan="7"><div class="empty-state">${icon("search")}No products match. Try a different name or SKU.</div></td></tr>`}</tbody></table></div>
    <div class="pagination"><button class="btn-ghost" data-inventory-page="${state.inventoryPage - 1}" ${state.inventoryPage <= 1 ? "disabled" : ""}>Previous</button><span class="mono">Page ${state.inventoryPage} of ${pages}</span><button class="btn-ghost" data-inventory-page="${state.inventoryPage + 1}" ${state.inventoryPage >= pages ? "disabled" : ""}>Next</button></div>
  `, "SKU RECOMMENDATIONS");
}

function skuRow(s) {
  const flags = [s.missingCost ? "Missing cost" : "", s.missingPrice ? "Missing price" : "", !s.soldUnits ? "No sales history" : ""].filter(Boolean);
  return `<tr id="sku-${s.id}" class="${state.highlightedSku === s.id ? "highlight-row" : ""}"><td><strong>${esc(s.product)}</strong><br><span class="mono muted">${s.sku}</span></td><td class="mono">${s.current}</td><td class="mono">${s.forecast}</td><td class="mono ${severity(s.stockout)}">${fmtDecimal(s.stockout, 1)}%</td><td class="mono ${severity(s.overstock)}">${fmtDecimal(s.overstock, 1)}%</td><td>${flags.length ? flags.map(flag => `<span class="badge badge--warning">${esc(flag)}</span>`).join(" ") : `<span class="badge badge--success">Complete</span>`}</td><td><span class="badge badge--${s.action}">${s.action}</span></td></tr>`;
}

function severity(n) {
  return n > 70 ? "severity-high" : n >= 40 ? "severity-medium" : "severity-low";
}

function marketplaceListings() {
  return state.marketplaceListings.length ? state.marketplaceListings : listings;
}

function marketplaceMessage() {
  const retailer = state.selectedRetailer;
  if (!retailer) return "";
  if (isDirectoryListing(retailer)) {
    return `Public listing note for ${retailer.retailer}: this business is nearby, but private inventory and transfer requests require them to join LiquidityLink or connect their store. Use the website/phone if available for manual outreach.`;
  }
  return `Hi ${retailer.retailer}, we're interested in discussing a transfer of ${retailer.product}. Can you confirm availability and pricing for ${retailer.qty} units?`;
}

function isDirectoryListing(listing = {}) {
  return listing.type === "directory" || String(listing.source || "").toLowerCase().includes("openstreetmap") || String(listing.source || "").toLowerCase().includes("directory");
}

function marketplacePage() {
  const activeListings = marketplaceListings();
  const query = state.marketplaceBusinessQuery.trim().toLowerCase();
  const city = state.marketplaceCityFilter.trim().toLowerCase();
  const stateName = state.marketplaceStateFilter.trim().toLowerCase();
  const baseFiltered = activeListings.filter(l => {
    const distance = Number(l.dist);
    return (state.typeFilter === "all" || l.type === state.typeFilter)
      && (state.catFilter === "all" || l.cat === state.catFilter)
      && (!Number.isFinite(distance) || distance <= state.distFilter);
  });
  const strictFiltered = baseFiltered.filter(l => {
    const haystack = `${l.retailer || ""} ${l.product || ""} ${l.address || ""} ${l.brand || ""}`.toLowerCase();
    const stateMatches = !stateName || haystack.includes(stateName) || (stateName === "texas" && /\btx\b/.test(haystack));
    return (!query || haystack.includes(query))
      && (!city || haystack.includes(city))
      && stateMatches;
  });
  const textFilterMiss = !strictFiltered.length && baseFiltered.length && Boolean(query || city || stateName);
  const filtered = textFilterMiss ? baseFiltered : strictFiltered;
  const rankedFiltered = [...filtered].sort((a, b) => listingRecommendationScore(b) - listingRecommendationScore(a) || Number(a.dist || 999) - Number(b.dist || 999) || String(a.retailer).localeCompare(String(b.retailer)));
  const outreachRows = rankedFiltered.length ? rankedFiltered : activeListings;
  const hasRealResults = state.marketplaceListings.length > 0;
  const msg = marketplaceMessage();
  const subtitle = hasRealResults
    ? `${filtered.length} nearby public business listing${filtered.length === 1 ? "" : "s"} from OpenStreetMap`
    : `Showing ${filtered.length} of ${listings.length} demo partners`;
  return pageShell("Marketplace", subtitle, `
    <p class="eyebrow">PARTNER NETWORK</p>
    <section class="card marketplace-search-card">
      <form class="marketplace-search" data-marketplace-search>
        <label class="field"><span>Find real nearby businesses</span><input class="input" name="location" value="${attr(state.marketplaceLocation)}" placeholder="City, ZIP, or street address" autocomplete="off"></label>
        <label class="field"><span>Business name</span><input class="input" name="business" value="${attr(state.marketplaceBusinessQuery)}" placeholder="Optional name search" autocomplete="off"></label>
        <label class="field"><span>City</span><input class="input" name="city" value="${attr(state.marketplaceCityFilter)}" placeholder="Optional city" autocomplete="off"></label>
        <label class="field"><span>State</span><input class="input" name="state" value="${attr(state.marketplaceStateFilter)}" placeholder="Optional state" autocomplete="off"></label>
        <label class="field"><span>Category</span><select class="select" name="category"><option value="all">All retail</option><option value="food">Food and grocery</option><option value="apparel">Apparel and outdoor</option><option value="electronics">Electronics</option><option value="home">Home and hardware</option><option value="health">Health and beauty</option></select></label>
        <label class="field"><span>Radius</span><select class="select" name="radius"><option value="10">10 miles</option><option value="25">25 miles</option><option value="50">50 miles</option><option value="100">100 miles</option></select></label>
        <button class="btn-ghost marketplace-location-btn" data-use-location type="button">${icon("map-pin")} Use my location</button>
        <button class="btn-primary" type="submit" ${state.marketplaceSearchBusy ? "disabled" : ""}>${state.marketplaceSearchBusy ? spinner("Searching...") : "Search nearby"}</button>
      </form>
      <p class="muted marketplace-note">${state.marketplaceDirectoryNote ? esc(state.marketplaceDirectoryNote) : "Search uses public OpenStreetMap business listings, so loading nearby stores can take a little time. These businesses do not expose private inventory unless they join or connect a store."}</p>
      ${textFilterMiss ? `<p class="severity-medium">No exact match for your business/city text filters, so showing the broader nearby results returned by the public directory.</p>` : ""}
      ${state.marketplaceError ? `<p class="severity-high">${esc(state.marketplaceError)}</p>` : ""}
    </section>
    <article class="card map-panel">${mapSvg(rankedFiltered)}</article>
    <div class="toolbar">
      <select class="select" data-market-filter="typeFilter" style="max-width:190px"><option value="all">All listing types</option><option value="directory">Nearby directory</option><option value="excess">Demo excess</option><option value="shortage">Demo shortage</option></select>
      <select class="select" data-market-filter="catFilter" style="max-width:210px"><option value="all">All categories</option><option value="retail">General retail</option><option value="food">Food and grocery</option><option value="apparel">Apparel and outdoor</option><option value="electronics">Electronics</option><option value="home">Home and hardware</option><option value="health">Health and beauty</option><option value="footwear">Demo footwear</option><option value="outdoor">Demo outdoor</option></select>
      <select class="select" data-market-filter="distFilter" style="max-width:160px"><option value="10">10 miles</option><option value="25">25 miles</option><option value="50">50 miles</option><option value="100">100 miles</option></select>
      <input class="input" data-market-text-filter="marketplaceBusinessQuery" style="max-width:240px" value="${attr(state.marketplaceBusinessQuery)}" placeholder="Filter business name" />
      <input class="input" data-market-text-filter="marketplaceCityFilter" style="max-width:180px" value="${attr(state.marketplaceCityFilter)}" placeholder="Filter city" />
      <input class="input" data-market-text-filter="marketplaceStateFilter" style="max-width:150px" value="${attr(state.marketplaceStateFilter)}" placeholder="Filter state" />
    </div>
    ${marketplaceInsights(rankedFiltered)}
    <section class="listing-grid">${rankedFiltered.length ? rankedFiltered.map((l, index) => listingCard(l, rankedFiltered, index)).join("") : `<article class="card empty-state">No businesses match your filters. Try a broader category, radius, or nearby city.</article>`}</section>
    <section class="card message-layout"><div>${outreachRows.map(l => `<button class="btn-ghost retailer-row ${String(state.selectedRetailer?.id) === String(l.id) ? "selected" : ""}" data-retailer="${attr(l.id)}" type="button"><span>${esc(l.retailer)}</span><span class="mono">${l.dist ?? "?"} mi</span></button>`).join("")}</div><form class="form-stack" data-message><textarea class="textarea" name="message">${esc(msg)}</textarea><button class="btn-primary" type="submit" ${state.marketplaceBusy ? "disabled" : ""}>${state.marketplaceBusy ? spinner("Sending...") : state.selectedRetailer?.source === "OpenStreetMap" ? "Save outreach note" : "Send request"}</button>${state.messageSent ? `<p class="severity-low">${esc(state.messageSent)}</p>` : ""}</form></section>
  `);
}

function marketplaceInsights(items) {
  if (!items.length) return "";
  const sorted = [...items].sort((a, b) => listingRecommendationScore(b) - listingRecommendationScore(a));
  const recommended = sorted[0];
  const contactable = items.filter(item => item.phone || item.website).length;
  const distances = items.map(item => Number(item.dist)).filter(Number.isFinite);
  const closest = distances.length ? Math.min(...distances) : null;
  const source = state.marketplaceListings.length ? "Live public directory" : "Demo partner data";
  return `<section class="marketplace-insights">
    <article class="card insight-card"><span class="eyebrow">TOP MATCH</span><strong>${esc(recommended.retailer)}</strong><span class="muted">Score ${Math.round(listingRecommendationScore(recommended))} from distance, category, and contact signals.</span></article>
    <article class="card insight-card"><span class="eyebrow">CONTACT READY</span><strong>${contactable}/${items.length}</strong><span class="muted">Listings with a phone or website available on the card.</span></article>
    <article class="card insight-card"><span class="eyebrow">CLOSEST</span><strong>${closest === null ? "n/a" : `${closest} mi`}</strong><span class="muted">${esc(source)}. Inventory is private unless the business joins.</span></article>
  </section>`;
}

function listingRecommendationScore(l) {
  const distance = Number(l.dist);
  const distanceScore = Number.isFinite(distance) ? Math.max(0, 100 - distance) : 0;
  const contactScore = (listingWebsite(l) ? 18 : 0) + (phoneLink(l.phone) ? 12 : 0);
  const categoryScore = state.catFilter !== "all" && l.cat === state.catFilter ? 16 : 0;
  const demoScore = l.source === "OpenStreetMap" ? 0 : (l.urgency === "high" ? 24 : l.urgency === "medium" ? 12 : 0);
  return distanceScore + contactScore + categoryScore + demoScore;
}

function listingSignalBadges(l, rankedListings, index) {
  const isDirectory = l.source === "OpenStreetMap";
  const distances = rankedListings.map(item => Number(item.dist)).filter(Number.isFinite);
  const closest = distances.length ? Math.min(...distances) : null;
  const bestScore = rankedListings.length ? Math.max(...rankedListings.map(listingRecommendationScore)) : 0;
  const sameCategoryDemoPrices = rankedListings
    .filter(item => item.source !== "OpenStreetMap" && item.cat === l.cat && Number.isFinite(Number(item.price)))
    .map(item => Number(item.price));
  const bestDemoPrice = sameCategoryDemoPrices.length ? Math.min(...sameCategoryDemoPrices) : null;
  const badges = [];
  const add = (label, tone = "info") => {
    if (!badges.some(b => b.label === label)) badges.push({ label, tone });
  };

  if (isDirectory) {
    if (index === 0 || Math.round(listingRecommendationScore(l)) === Math.round(bestScore)) add("Recommended", "success");
    if (closest !== null && Number(l.dist) === closest) add("Closest", "success");
    if (state.catFilter !== "all" && l.cat === state.catFilter) add("Category match", "info");
    if (listingWebsite(l) || phoneLink(l.phone)) add(listingWebsite(l) ? "Best contact" : "Phone listed", "info");
    if (Number(l.dist) <= 3) add("Nearby", "success");
  } else {
    if (index === 0 || l.urgency === "high") add("Recommended", l.urgency);
    if (bestDemoPrice !== null && Number(l.price) === bestDemoPrice) add("Best price", "success");
    if (closest !== null && Number(l.dist) === closest) add("Closest", "info");
    add(l.type === "excess" ? "Excess stock" : "Need match", l.urgency);
  }

  return badges.slice(0, 3);
}

function listingCard(l, rankedListings = [l], index = 0) {
  const isDirectory = isDirectoryListing(l);
  const signals = listingSignalBadges(l, rankedListings, index);
  const signalMarkup = signals.length
    ? `<div class="recommendation-badges">${signals.map(b => `<span class="badge badge--${attr(b.tone)}">${esc(b.label)}</span>`).join("")}</div>`
    : "";
  return `<article class="card listing-card">
    ${listingPreview(l)}
    <div class="listing-top"><strong>${esc(l.retailer)}</strong><span class="badge badge--info">${l.dist ?? "?"} mi</span></div>
    ${signalMarkup}
    <div><p class="text-md">${esc(l.product)}</p>${listingDetails(l, isDirectory)}</div>
    <div class="listing-meta"><span class="badge badge--${l.urgency}">${isDirectory ? "directory" : l.urgency}</span><span class="source-pill">${esc(l.source || "LiquidityLink")}</span><span class="source-pill">match ${Math.round(listingRecommendationScore(l))}</span></div>
    ${listingActions(l, isDirectory)}
  </article>`;
}

function listingPreview(l) {
  const directImage = normalizeExternalUrl(l.imageUrl);
  if (directImage) return `<div class="listing-preview has-image"><img src="${attr(directImage)}" alt="${attr(l.retailer)} storefront" loading="lazy" referrerpolicy="no-referrer"></div>`;
  const domain = listingDomain(l);
  const logoUrl = domain ? faviconUrl(domain) : "";
  const mapUrl = listingMapPreview(l);
  const imageStyle = mapUrl ? ` style="--preview-image: url(&quot;${attr(mapUrl)}&quot;)"` : "";
  const label = domain ? "Official logo" : mapUrl ? "Map preview" : `${displayCategory(l.cat)} preview`;
  return `<div class="listing-preview listing-preview--brand preview--${attr(normalizedCategory(l.cat))}"${imageStyle}>
    ${mapUrl ? `<span class="listing-preview-bg" aria-hidden="true"></span>` : ""}
    <span class="listing-logo-tile">
      ${logoUrl ? `<img src="${attr(logoUrl)}" alt="${attr(l.retailer)} logo" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false">` : ""}
      <strong ${logoUrl ? "hidden" : ""}>${esc(initials(l.retailer))}</strong>
    </span>
    <div class="listing-preview-copy">
      <small>${esc(label)}</small>
      <b>${esc(domain || displayCategory(l.cat))}</b>
    </div>
  </div>`;
}

function listingDetails(l, isDirectory) {
  if (!isDirectory) {
    return `<div class="listing-detail-grid">
      <span>Quantity</span><strong>${Number(l.qty || 0).toLocaleString()} units</strong>
      <span>Price</span><strong>$${Number(l.price || 0).toLocaleString()}/unit</strong>
      <span>Category</span><strong>${esc(displayCategory(l.cat))}</strong>
      <span>Email</span>${emailLink(l.email) ? `<a href="${attr(emailLink(l.email))}">${esc(l.email)}</a>` : `<strong>Not listed</strong>`}
    </div>`;
  }
  const phoneHref = phoneLink(l.phone);
  const emailHref = emailLink(l.email);
  const website = listingWebsite(l);
  return `<div class="listing-detail-grid">
    <span>Address</span><strong>${esc(l.address || "Address not listed")}</strong>
    <span>Phone</span>${phoneHref ? `<a href="${attr(phoneHref)}">${esc(l.phone)}</a>` : `<strong>Not listed</strong>`}
    <span>Email</span>${emailHref ? `<a href="${attr(emailHref)}">${esc(l.email)}</a>` : `<strong>Not listed</strong>`}
    <span>Website</span>${website ? `<a href="${attr(website)}" target="_blank" rel="noreferrer">${esc(shortUrl(website))}</a>` : `<strong>Not listed</strong>`}
  </div>`;
}

function listingActions(l, isDirectory) {
  const actions = [];
  const phoneHref = phoneLink(l.phone);
  const emailHref = emailLink(l.email);
  const website = listingWebsite(l);
  if (phoneHref) actions.push(`<a class="btn-ghost contact-action" href="${attr(phoneHref)}">${icon("phone")}Call</a>`);
  if (emailHref) actions.push(`<a class="btn-ghost contact-action" href="${attr(emailHref)}">${icon("mail")}Email</a>`);
  if (website) actions.push(`<a class="btn-ghost contact-action" href="${attr(website)}" target="_blank" rel="noreferrer">${icon("globe-2")}Website</a>`);
  if (l.osmUrl) actions.push(`<a class="btn-ghost contact-action" href="${attr(l.osmUrl)}" target="_blank" rel="noreferrer">${icon("map-pin")}Map</a>`);
  actions.push(`<button class="btn-primary contact-action" data-contact="${attr(l.id)}" type="button">${isDirectory ? "Select" : "Contact"}</button>`);
  return `<div class="contact-actions">${actions.join("")}</div>`;
}

const knownBrandDomains = [
  ["academy sports", "academy.com"],
  ["academy sports + outdoors", "academy.com"],
  ["academy sports & outdoors", "academy.com"],
  ["at&t", "att.com"],
  ["boost mobile", "boostmobile.com"],
  ["verizon", "verizon.com"],
  ["best buy", "bestbuy.com"],
  ["northern tool", "northerntool.com"],
  ["target", "target.com"],
  ["walmart", "walmart.com"],
  ["the home depot", "homedepot.com"],
  ["home depot", "homedepot.com"],
  ["lowe's", "lowes.com"],
  ["lowes", "lowes.com"],
  ["cvs", "cvs.com"],
  ["walgreens", "walgreens.com"],
  ["kroger", "kroger.com"],
  ["heb", "heb.com"],
  ["h-e-b", "heb.com"],
  ["costco", "costco.com"],
  ["sam's club", "samsclub.com"],
  ["dollar general", "dollargeneral.com"],
  ["dollar tree", "dollartree.com"],
  ["family dollar", "familydollar.com"],
  ["petsmart", "petsmart.com"],
  ["petco", "petco.com"],
  ["autozone", "autozone.com"],
  ["o'reilly", "oreillyauto.com"],
  ["advance auto parts", "advanceautoparts.com"],
  ["dick's sporting goods", "dickssportinggoods.com"],
  ["five below", "fivebelow.com"],
  ["kohl's", "kohls.com"],
  ["macys", "macys.com"],
  ["macy's", "macys.com"],
  ["jcpenney", "jcpenney.com"],
  ["ulta", "ulta.com"],
  ["sephora", "sephora.com"],
  ["starbucks", "starbucks.com"],
  ["mcdonald", "mcdonalds.com"],
  ["subway", "subway.com"],
  ["chipotle", "chipotle.com"],
  ["chick-fil-a", "chick-fil-a.com"],
  ["gamestop", "gamestop.com"],
  ["t-mobile", "t-mobile.com"],
  ["cricket wireless", "cricketwireless.com"],
  ["metro by t-mobile", "metrobyt-mobile.com"],
  ["apple", "apple.com"],
  ["nike", "nike.com"],
  ["adidas", "adidas.com"],
  ["foot locker", "footlocker.com"],
  ["whole foods", "wholefoodsmarket.com"],
  ["trader joe", "traderjoes.com"],
  ["aldi", "aldi.us"],
];

function listingWebsite(l) {
  const explicit = normalizeExternalUrl(l.website || l.url || l.contactWebsite || l.brandWebsite);
  if (explicit) return explicit;
  const domain = knownBrandDomain(l.retailer) || knownBrandDomain(l.brand);
  return domain ? `https://${domain}` : "";
}

function listingDomain(l) {
  return domainFromUrl(l.website || l.url || l.contactWebsite || l.brandWebsite) || knownBrandDomain(l.retailer) || knownBrandDomain(l.brand);
}

function knownBrandDomain(name) {
  const value = String(name || "").toLowerCase();
  const match = knownBrandDomains.find(([brand]) => value.includes(brand));
  return match ? match[1] : "";
}

function normalizeExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.href;
  } catch {
    return "";
  }
}

function domainFromUrl(value) {
  const url = normalizeExternalUrl(value);
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function faviconUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

function listingMapPreview(l) {
  const lat = Number(l.lat ?? l.latitude ?? l.location?.lat);
  const lon = Number(l.lon ?? l.lng ?? l.longitude ?? l.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return "";
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=16&size=640x240&markers=${lat},${lon},red-pushpin`;
}

function normalizedCategory(value) {
  return String(value || "retail").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function displayCategory(value) {
  const labels = { food: "Food", apparel: "Apparel", electronics: "Electronics", home: "Home", health: "Health", footwear: "Footwear", outdoor: "Outdoor", retail: "Retail" };
  return labels[String(value || "").toLowerCase()] || "Retail";
}

function categoryIcon(value) {
  return ({ food: "store", apparel: "tag", electronics: "plug", home: "boxes", health: "shield", footwear: "store", outdoor: "map-pin" })[String(value || "").toLowerCase()] || "store";
}

function initials(value) {
  return String(value || "LL").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "LL";
}

function phoneLink(value) {
  const cleaned = String(value || "").replace(/[^\d+]/g, "");
  return cleaned.length >= 7 ? `tel:${cleaned}` : "";
}

function emailLink(value) {
  const email = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : "";
}

function shortUrl(value) {
  try {
    const url = new URL(String(value).startsWith("http") ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function mapSvg(items = marketplaceListings()) {
  const visibleItems = items.slice(0, 7);
  const pins = visibleItems.map((item, index) => {
    const x = 174 + ((index * 131) % 600);
    const y = 50 + ((index * 47) % 112);
    const color = item.source === "OpenStreetMap" ? "var(--green)" : index % 2 ? "var(--blue)" : "var(--yellow)";
    const distance = Number.isFinite(Number(item.dist)) ? `${Number(item.dist)} mi` : "nearby";
    return pin(x, y, color, `${shortRetailerName(item.retailer)} · ${distance}`, 6, index + 1);
  }).join("");
  const list = visibleItems.map((item, index) => `<li><span>${index + 1}</span><strong>${esc(item.retailer)}</strong><em>${Number.isFinite(Number(item.dist)) ? `${Number(item.dist)} mi` : "nearby"}</em></li>`).join("");
  return `<div class="market-map">
    <svg viewBox="0 0 900 220" role="img" aria-label="Nearby partner map">
      <defs><pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="var(--border-default)" stroke-width="1"/></pattern></defs>
      <rect width="900" height="220" fill="url(#grid)"/>
      <g font-family="var(--font-mono)" font-size="11">${pin(450, 110, "var(--accent)", workspaceName(), 8, "LL")}${pins}</g>
    </svg>
    <div class="map-overlay">
      <span class="eyebrow">LIVE PARTNER MAP</span>
      <strong>${visibleItems.length ? `${visibleItems.length} visible listings` : "No listings in view"}</strong>
      <p>${state.marketplaceListings.length ? "Public directory results near your search." : "Demo partner map. Search nearby for live businesses."}</p>
      ${list ? `<ol>${list}</ol>` : ""}
    </div>
  </div>`;
}
function shortRetailerName(value) {
  const text = String(value || "Retailer").replace(/\s+/g, " ").trim();
  return text.length > 24 ? `${text.slice(0, 21)}...` : text;
}
function pin(x, y, color, label, r, number = "") {
  const safeLabel = shortRetailerName(label);
  const labelWidth = Math.max(64, Math.min(210, safeLabel.length * 7 + 24));
  return `<g class="map-pin-group">
    <circle class="map-pin-halo" cx="${x}" cy="${y}" r="${r + 10}" fill="${color}" opacity=".18"/>
    <circle class="map-pin" cx="${x}" cy="${y}" r="${r}" fill="${color}"/>
    <text class="map-pin-number" x="${x}" y="${y + 3}" text-anchor="middle" fill="var(--bg-base)">${esc(number)}</text>
    <rect class="map-label-bg" x="${x + 13}" y="${y - 19}" width="${labelWidth}" height="25" rx="12"/>
    <text class="map-label" x="${x + 25}" y="${y - 2}" fill="var(--text-primary)">${esc(safeLabel)}</text>
  </g>`;
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

function analyticsData() {
  return state.advancedAnalytics || { summary: {}, assumptions: {}, formulas: [], abc: [], skus: [] };
}

function analyticsMetric(label, value, badge, body, tone = "info") {
  const badgeTone = tone === "bad" ? "error" : tone === "good" ? "success" : tone === "warning" ? "warning" : "info";
  return `<article class="card analytics-metric-card">
    <div class="kpi-top">
      <p class="eyebrow">${esc(label)}</p>
      ${badge ? `<span class="badge badge--${badgeTone}">${esc(badge)}</span>` : ""}
    </div>
    <strong class="metric-value">${esc(value)}</strong>
    <p class="analytics-note">${esc(body)}</p>
  </article>`;
}

function analyticsValue(value, formatter, suffix = "") {
  return value === null || value === undefined ? "Insufficient data" : `${formatter(value)}${suffix}`;
}

function actionBadge(action) {
  const safeAction = action || "hold";
  const tone = safeAction === "buy" ? "success" : safeAction === "sell" ? "error" : safeAction === "transfer" ? "info" : "warning";
  return `<span class="badge badge--${tone}">${esc(safeAction)}</span>`;
}

function advancedAnalyticsPage() {
  const data = analyticsData();
  const summary = data.summary || {};
  const assumptions = data.assumptions || {};
  const hasData = Number(summary.analyzedSkus) > 0;
  if (!hasData) {
    return pageShell("Advanced Analytics", "GMROI, service levels, reorder points, and SKU diagnostics.", `
      <article class="card empty-state">
        <div>
          <p class="eyebrow">Waiting for connected data</p>
          <h2 class="text-lg">Connect Shopify, Clover, Square, or CSV sales to unlock advanced analytics.</h2>
          <p class="muted">Once sales and inventory sync, this page calculates SKU-level reorder points, safety stock, days of cover, GMROI, and ABC ranking.</p>
          <button class="btn-primary" data-route="/connect" type="button">Connect data</button>
        </div>
      </article>
    `);
  }
  const actionCounts = summary.actionCounts || {};
  const topSkus = (data.skus || []).slice(0, 12);
  const abcGroups = ["A", "B", "C"].map(group => ({
    group,
    items: (data.abc || []).filter(item => (item.group || item.class) === group).slice(0, 5),
  }));
  const percentAssumption = value => {
    const numericValue = finiteNumber(value);
    return fmtPercent(numericValue <= 1 ? numericValue * 100 : numericValue);
  };
  return pageShell("Advanced Analytics", "GMROI, service levels, reorder math, and SKU diagnostics from connected data.", `
    ${summary.sampleCatalogDetected ? `<div class="data-warning"><strong>Shopify sample products excluded.</strong> ${fmt(summary.excludedSampleSkus)} default catalog item${summary.excludedSampleSkus === 1 ? " was" : "s were"} removed from all metrics.</div>` : ""}
    ${summary.enoughData === false ? `<div class="data-warning"><strong>Low statistical confidence.</strong> Forecast and service metrics need at least 20 transactions across 3 selling SKUs.</div>` : ""}
    <section class="analytics-metric-grid">
      ${analyticsMetric("Service Level", analyticsValue(summary.serviceLevel, value => fmtPercent(value)), `${fmt(summary.highRiskSkus || 0)} high risk`, "Projected fulfilled demand divided by forecast demand.", summary.serviceLevel === null ? "warning" : summary.serviceLevel >= 90 ? "good" : summary.serviceLevel >= 70 ? "warning" : "bad")}
      ${analyticsMetric("GMROI", analyticsValue(summary.gmroi, value => fmtDecimal(value, 2), "x"), `${fmt(summary.missingCostSkus || 0)} missing cost`, "Gross margin dollars divided by inventory cost; incomplete SKUs are excluded.", summary.gmroi === null ? "warning" : summary.gmroi >= 2 ? "good" : summary.gmroi >= 1 ? "warning" : "bad")}
      ${analyticsMetric("Inventory Turnover", analyticsValue(summary.inventoryTurnover, value => fmtDecimal(value, 2), "x"), `${fmt(summary.totalOnHand || 0)} on hand`, "Annualized COGS divided by inventory cost; requires unit cost.", summary.inventoryTurnover === null ? "warning" : summary.inventoryTurnover >= 4 ? "good" : summary.inventoryTurnover >= 1 ? "warning" : "bad")}
      ${analyticsMetric("Demand Volatility", fmtPercent(summary.demandVolatility), `${fmtDecimal(summary.avgDaysCover, 1)} days cover`, "Coefficient of variation across SKU weekly demand.", (summary.demandVolatility || 0) <= 45 ? "good" : (summary.demandVolatility || 0) <= 90 ? "warning" : "bad")}
    </section>

    <section class="grid-2 analytics-section-grid">
      <article class="card">
        <p class="eyebrow">Formula library</p>
        <h2 class="text-lg">What the backend is calculating</h2>
        <div class="formula-grid">${(data.formulas || []).map(formula => `<div class="formula-card">
          <strong>${esc(formula.name)}</strong>
          <p class="formula-equation">${esc(formula.equation || formula.expression || "")}</p>
          <p class="muted">${esc(formula.description || "Calculated from synced sales, inventory, price, and cost data.")}</p>
        </div>`).join("")}</div>
      </article>
      <article class="card">
        <p class="eyebrow">Planning assumptions</p>
        <h2 class="text-lg">Current model settings</h2>
        <div class="assumption-grid">
          <div class="assumption-chip"><span>Lead time</span><strong>${fmt(assumptions.leadTimeDays || 0)} days</strong></div>
          <div class="assumption-chip"><span>Service target</span><strong>${percentAssumption(assumptions.targetServiceLevel)}</strong></div>
          <div class="assumption-chip"><span>Safety stock z-score</span><strong>${fmtDecimal(assumptions.zScore, 2)}</strong></div>
          <div class="assumption-chip"><span>Carrying cost</span><strong>${percentAssumption(assumptions.carryingCostRate)}</strong></div>
          <div class="assumption-chip"><span>Gross margin</span><strong>${percentAssumption(assumptions.grossMarginRate)}</strong></div>
          <div class="assumption-chip"><span>Forecast horizon</span><strong>${fmt(assumptions.forecastHorizonWeeks || 0)} weeks</strong></div>
        </div>
        <div class="report-list analytics-actions">
          <div class="report-row"><span>Buy actions</span><span class="mono">${fmt(actionCounts.buy || 0)}</span></div>
          <div class="report-row"><span>Hold actions</span><span class="mono">${fmt(actionCounts.hold || 0)}</span></div>
          <div class="report-row"><span>Sell actions</span><span class="mono">${fmt(actionCounts.sell || 0)}</span></div>
        </div>
      </article>
    </section>

    <article class="card">
      <div class="toolbar-spread">
        <div>
          <p class="eyebrow">SKU diagnostics</p>
          <h2 class="text-lg">Reorder point, safety stock, and margin risk</h2>
        </div>
        <span class="badge badge--info">${fmt(summary.analyzedSkus || 0)} analyzed SKUs</span>
      </div>
      <div class="table-wrap" style="margin-top:var(--space-4)">
        <table class="data-table">
          <thead><tr><th>Product</th><th>Action</th><th>On hand</th><th>8-week demand</th><th>Reorder point</th><th>Safety stock</th><th>Days cover</th><th>GMROI</th><th>Risk</th></tr></thead>
          <tbody>${topSkus.map(item => `<tr>
            <td><span class="diagnostic-product"><strong>${esc(item.product || item.sku)}</strong><span class="mono muted">${esc(item.sku)}</span></span></td>
            <td>${actionBadge(item.action)}</td>
            <td class="mono">${fmt(item.current)}</td>
            <td class="mono">${fmt(item.forecast30d ?? sumNumbers(item.forecast8w))}</td>
            <td class="mono">${fmt(item.reorderPoint)}</td>
            <td class="mono">${fmt(item.safetyStock)}</td>
            <td class="mono">${fmtDecimal(item.daysCover, 1)}</td>
            <td class="mono">${item.gmroi === null ? `<span class="badge badge--warning">Missing cost</span>` : `${fmtDecimal(item.gmroi, 2)}x`}</td>
            <td class="mono severity-${item.riskScore >= 70 ? "high" : item.riskScore >= 40 ? "medium" : "low"}">${fmt(item.riskScore)}</td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
    </article>

    <section class="abc-grid">
      ${abcGroups.map(group => `<article class="card">
        <p class="eyebrow">ABC class ${group.group}</p>
        <h2 class="text-lg">${group.group === "A" ? "Highest value movers" : group.group === "B" ? "Mid-value contributors" : "Long-tail SKUs"}</h2>
        <div class="abc-list">${group.items.length ? group.items.map(item => `<div class="abc-row"><span>${esc(item.product || item.sku)}</span><strong class="mono">${fmtPercent(item.cumulativeShare ?? item.contribution)}</strong></div>`).join("") : `<p class="muted">No SKUs in this class yet.</p>`}</div>
      </article>`).join("")}
    </section>
    ${analyticsDecisionVisuals(data)}
  `);
}

function analyticsDecisionVisuals(data) {
  const skus = (data.skus || []).slice(0, 12);
  const excess = [...skus].filter(item => Number(item.excessCost) > 0).sort((a,b) => b.excessCost-a.excessCost).slice(0, 6);
  const maxExcess = Math.max(1, ...excess.map(item => Number(item.excessCost) || 0));
  return `<section class="analytics-visual-grid">
    <article class="card"><p class="eyebrow">Risk heatmap</p><h2 class="text-lg">SKU risk across the next 8 weeks</h2><div class="risk-heatmap">${skus.map(item => `<div class="heat-row"><strong title="${attr(item.product)}">${esc(item.sku)}</strong>${Array.from({length:8},(_,week) => { const risk=Math.min(100, Number(item.riskScore||0)*(0.72+week*0.04)); return `<span class="heat-cell" style="--risk:${risk}%" title="Week ${week+1}: ${Math.round(risk)}% risk"></span>`; }).join("")}</div>`).join("")}</div><p class="chart-caption"><strong>Risk percent by week</strong> Darker cells indicate higher stockout or excess exposure for each SKU.</p></article>
    <article class="card"><p class="eyebrow">Excess cost waterfall</p><h2 class="text-lg">What is driving carrying cost</h2>${excess.length ? `<div class="waterfall">${excess.map(item => `<div class="waterfall-row"><span>${esc(item.product)}</span><i style="width:${Math.max(4,(item.excessCost/maxExcess)*100)}%"></i><strong>${moneyShort(item.excessCost)}</strong></div>`).join("")}</div><p class="chart-caption"><strong>Carrying cost dollars</strong> Bar width is scaled to the largest excess-cost SKU in this view.</p>` : `<p class="muted">Insufficient cost data. Sync Shopify inventory-item cost or add costs manually.</p>`}</article>
    <article class="card scenario-card"><p class="eyebrow">Scenario planner</p><h2 class="text-lg">Discount elasticity what-if</h2><label class="field"><span>Discount <strong data-discount-output>10%</strong></span><input type="range" min="0" max="50" value="10" step="5" data-discount-slider></label><div class="scenario-result"><span>Estimated demand lift</span><strong data-demand-lift>8%</strong></div><p class="muted">Uses a configurable demonstration elasticity of 0.8 until promotion-response history is available.</p></article>
    <article class="card"><p class="eyebrow">Peer benchmark</p><h2 class="text-lg">Operating context</h2><div class="benchmark-list"><div><span>Service level</span><strong>${analyticsValue(data.summary?.serviceLevel, v => fmtPercent(v))}</strong><small>Peer target 95%</small></div><div><span>GMROI</span><strong>${analyticsValue(data.summary?.gmroi, v => fmtDecimal(v,2), "x")}</strong><small>Illustrative peer 2.5x</small></div><div><span>Turnover</span><strong>${analyticsValue(data.summary?.inventoryTurnover, v => fmtDecimal(v,2), "x")}</strong><small>Illustrative peer 4.0x</small></div></div><p class="muted">Peer values are labeled illustrative until a licensed anonymized benchmark dataset is connected.</p></article>
  </section>`;
}

function reportsPage() {
  const rows = executiveSummaryRows();
  const advanced = state.advancedAnalytics?.summary;
  const advancedRows = advanced ? [
    ["Service Level", analyticsValue(advanced.serviceLevel, value => fmtPercent(value))],
    ["GMROI", analyticsValue(advanced.gmroi, value => fmtDecimal(value, 2), "x")],
    ["Inventory Turnover", analyticsValue(advanced.inventoryTurnover, value => fmtDecimal(value, 2), "x")],
    ["Average Days Cover", `${fmtDecimal(advanced.avgDaysCover, 1)} days`],
    ["Demand Volatility", fmtPercent(advanced.demandVolatility)],
  ] : [];
  return pageShell("Reports", "Executive summary and exportable metrics.", `
    <article class="card"><div class="toolbar-spread"><div><p class="eyebrow">Executive report</p><h2 class="text-lg">Inventory Health Summary</h2></div><button class="btn-primary" data-download type="button">${state.reportBusy ? spinner("Exporting...") : "Download report"}</button></div><div class="report-list" style="margin-top:var(--space-6)">${rows.map(([a, b]) => `<div class="report-row"><span>${a}</span><span class="mono">${b}</span></div>`).join("")}</div></article>
    ${advancedRows.length ? `<article class="card"><p class="eyebrow">Advanced metrics</p><h2 class="text-lg">Operating quality signals</h2><div class="report-list" style="margin-top:var(--space-4)">${advancedRows.map(([a, b]) => `<div class="report-row"><span>${a}</span><span class="mono">${b}</span></div>`).join("")}</div></article>` : ""}
  `);
}

function pricingPage() {
  return pageShell("Pricing", "Tiered subscriptions that scale with retailer size and operational complexity.", `
    <section class="pricing-hero card card--accent">
      <div>
        <p class="eyebrow">Subscription model</p>
        <h2>Plans built for inventory teams from one store to enterprise networks.</h2>
        <p>Start at $79/month for core forecasting and alerts, then scale into marketplace coordination, collaboration, executive analytics, and enterprise onboarding as your retail network grows.</p>
      </div>
      <div class="pricing-hero-stat">
        <span class="mono">Starting price</span>
        <strong>$79/month</strong>
        <p>Starter includes Shopify, ERP/IMS, CSV, ARIMA, XGBoost, Monte Carlo, risk scoring, dashboards, alerts, reports, and email support.</p>
      </div>
    </section>
    ${pricingCards()}
    ${pricingComparisonTable()}
  `);
}

function marketingPricingPage() {
  return `
    <section class="marketing-page-hero">
      <div>
        <p class="eyebrow">Pricing</p>
        <h1>Pricing that scales with store complexity, not seat count.</h1>
        <p>Choose the operating tier that matches your retail footprint today, then expand into marketplace coordination, team collaboration, executive analytics, and enterprise onboarding as your inventory network grows.</p>
        <div class="hero-actions">
          <a class="btn-primary" href="/book-demo" data-route="/book-demo">Book demo</a>
          <a class="btn-ghost" href="/contact" data-route="/contact">Talk to sales</a>
        </div>
      </div>
      ${productFrame("Pricing model", pricingModelVisual())}
    </section>
    ${pricingCards()}
    ${pricingComparisonTable()}
  `;
}

function adminPage() {
  const enterprise = state.enterprise || {};
  const overview = enterprise.overview || {};
  const counts = overview.counts || {};
  const organization = overview.organization || {};
  const workspaces = enterprise.workspaces || [];
  const pendingInvites = enterprise.pendingInvites || [];
  const providers = overview.providers || [];
  const users = enterprise.users || [];
  const alerts = enterprise.alerts || [];
  const apiKeys = enterprise.apiKeys || [];
  const activity = enterprise.activity || [];
  const demoRequests = enterprise.demoRequests || [];
  const settings = enterprise.settings?.config || {};
  const alertThresholds = settings.alertThresholds || {};
  const marketplaceSettings = settings.marketplace || {};
  const members = Number(counts.members || users.length || 0);
  const openAlerts = alerts.filter(a => a.status !== "resolved").length;
  const activeKeys = apiKeys.filter(k => !k.revoked).length;
  const canManageUsers = (overview.permissions || []).includes("users:manage");
  const currentUserId = state.authUser?.id || state.authUser?.sub || "";
  const ownerInboxEmail = "shreyaschoudhury23@gmail.com";
  const canViewDemoRequests = String(state.authUser?.email || "").trim().toLowerCase() === ownerInboxEmail;
  const activeWorkspace = workspaces.find(workspace => workspace.id === state.enterprise.activeWorkspaceId) || {};
  const activeWorkspaceRole = activeWorkspace.roleName || activeWorkspace.role_name || organization.role_name || "";
  const canRenameWorkspace = ["owner", "admin"].includes(activeWorkspaceRole);
  const roleOptions = ["viewer", "member", "analyst", "admin"];
  const providerRows = providers.length ? providers.map(provider => `
    <tr>
      <td><strong>${esc(provider.provider)}</strong><br><span class="muted mono">${esc(provider.externalAccount || "No account linked")}</span></td>
      <td><span class="badge badge--${provider.status === "connected" ? "success" : provider.status === "error" ? "high" : "info"}">${esc(provider.status || "unknown")}</span></td>
      <td>${esc(provider.lastSync ? new Date(provider.lastSync).toLocaleString() : "No sync yet")}</td>
      <td>${esc(provider.detail || "No detail")}</td>
    </tr>
  `).join("") : `<tr><td colspan="4" class="muted">No integrations have reported status yet.</td></tr>`;
  const userRows = users.length ? users.map(user => {
    const isSelf = user.id === currentUserId;
    const isOwner = user.role === "owner";
    const roleCell = canManageUsers && !isSelf && !isOwner
      ? `<select class="select compact-select" data-member-role="${attr(user.id)}" aria-label="Change ${attr(user.email)} role">
          ${roleOptions.map(role => `<option value="${role}" ${user.role === role ? "selected" : ""}>${role[0].toUpperCase()}${role.slice(1)}</option>`).join("")}
        </select>`
      : `<span class="badge badge--info">${esc(user.role || "viewer")}</span>`;
    const actionCell = canManageUsers && !isSelf && !isOwner
      ? `<button class="btn-ghost btn-compact danger-btn-inline" data-remove-member="${attr(user.id)}" data-member-email="${attr(user.email)}" type="button">Remove</button>`
      : `<span class="muted">${isSelf ? "You" : "Protected"}</span>`;
    return `
    <tr>
      <td><strong>${esc(`${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email)}</strong><br><span class="muted mono">${esc(user.email)}</span></td>
      <td>${roleCell}</td>
      <td>${user.emailVerified ? "Verified" : "Unverified"}</td>
      <td>${esc(user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "No login recorded")}</td>
      <td>${actionCell}</td>
    </tr>
  `;
  }).join("") : `<tr><td colspan="5" class="muted">No team members found.</td></tr>`;
  const alertRows = alerts.length ? alerts.map(alert => `
    <tr>
      <td><strong>${esc(alert.title)}</strong><br><span class="muted">${esc(alert.message || "")}</span></td>
      <td><span class="badge badge--${alert.severity === "critical" || alert.severity === "high" ? "high" : "info"}">${esc(alert.severity)}</span></td>
      <td>${esc(alert.status)}</td>
      <td>${esc(new Date(alert.createdAt).toLocaleString())}</td>
    </tr>
  `).join("") : `<tr><td colspan="4" class="muted">No alerts yet. Threshold breaches will appear here.</td></tr>`;
  const keyRows = apiKeys.length ? apiKeys.map(key => `
    <tr>
      <td><strong>${esc(key.name)}</strong><br><span class="muted mono">${esc(key.prefix || "")}</span></td>
      <td>${(key.scopes || []).map(scope => `<span class="source-pill">${esc(scope)}</span>`).join("") || `<span class="muted">No scopes</span>`}</td>
      <td><span class="badge badge--${key.revoked ? "high" : "success"}">${key.revoked ? "revoked" : "active"}</span></td>
      <td>${esc(key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never used")}</td>
    </tr>
  `).join("") : `<tr><td colspan="4" class="muted">No API keys created yet.</td></tr>`;
  const activityRows = activity.length ? activity.slice(0, 8).map(item => `
    <div class="report-row"><span><strong>${esc(item.action)}</strong><br><span class="muted">${esc(item.entityType || "system")}</span></span><span class="mono">${esc(new Date(item.createdAt).toLocaleString())}</span></div>
  `).join("") : `<p class="muted">No activity has been recorded yet.</p>`;
  const demoRows = demoRequests.length ? demoRequests.map(item => {
    const createdAt = item.createdAt || item.created_at;
    const delivery = item.emailDelivery || item.email_delivery || "pending";
    return `<tr>
      <td><strong>${esc(item.company)}</strong><br><span class="muted mono">${esc(item.email)}</span></td>
      <td>${esc(item.stores)}</td>
      <td>${esc(item.goal)}</td>
      <td><span class="badge badge--${delivery === "sent" ? "success" : delivery === "failed" ? "warning" : "info"}">${esc(delivery.replaceAll("_", " "))}</span><br><span class="muted">${esc(createdAt ? new Date(createdAt).toLocaleString() : "No timestamp")}</span></td>
    </tr>`;
  }).join("") : `<tr><td colspan="4" class="muted">No demo requests yet. New Book Demo submissions will appear here.</td></tr>`;
  const workspaceRows = workspaces.length ? workspaces.map(workspace => `
    <div class="workspace-row ${workspace.id === state.enterprise.activeWorkspaceId ? "active" : ""}">
      <div>
        <strong>${esc(workspace.name)}</strong>
        <span class="muted">${esc(workspace.roleName || workspace.role_name || "member")} · ${esc(workspace.plan || "trial")}</span>
      </div>
      <div class="workspace-actions">
        <button class="btn-ghost" data-workspace-select="${attr(workspace.id)}" type="button" ${workspace.id === state.enterprise.activeWorkspaceId ? "disabled" : ""}>${workspace.id === state.enterprise.activeWorkspaceId ? "Current" : "Switch"}</button>
        <button class="btn-ghost danger-btn-inline" data-workspace-remove="${attr(workspace.id)}" data-workspace-name="${attr(workspace.name)}" data-workspace-role="${attr(workspace.roleName || workspace.role_name || "member")}" type="button">${(workspace.roleName || workspace.role_name) === "owner" ? "Remove" : "Leave"}</button>
      </div>
    </div>
  `).join("") : `<p class="muted">Your personal workspace will appear here after sign-in.</p>`;
  const inviteRows = pendingInvites.length ? pendingInvites.map(invite => `
    <div class="workspace-row">
      <div>
        <strong>${esc(invite.name)}</strong>
        <span class="muted">Invited as ${esc(invite.roleName || invite.role_name || "viewer")}</span>
      </div>
      <div class="workspace-actions">
        <button class="btn-primary" data-invite-action="accept" data-invite-org="${attr(invite.id)}" type="button">Accept</button>
        <button class="btn-ghost" data-invite-action="decline" data-invite-org="${attr(invite.id)}" type="button">Decline</button>
      </div>
    </div>
  `).join("") : `<p class="muted">No pending workspace invites. Email invites also appear here after the invitee signs in with the same email.</p>`;
  const workspaceSettingsCard = canRenameWorkspace ? `
      <article class="card">
        <p class="eyebrow">Workspace identity</p>
        <h2 class="text-lg">Rename workspace</h2>
        <p class="muted admin-card-note">This changes the workspace name in the sidebar, switcher, reports, and teammate views.</p>
        <form class="form-stack" data-workspace-rename>
          <input class="input" name="name" value="${attr(activeWorkspace.name || organization.name || workspaceName())}" maxlength="90" required />
          <button class="btn-primary" type="submit" ${state.adminBusy ? "disabled" : ""}>${state.adminBusy ? spinner("Saving...") : "Save workspace name"}</button>
        </form>
      </article>` : "";
  const demoRequestsCard = canViewDemoRequests ? `
      <article class="card">
        <p class="eyebrow">Marketing leads</p>
        <h2 class="text-lg">Demo requests</h2>
        <p class="muted admin-card-note">Book Demo form submissions are private to ${ownerInboxEmail} and are emailed there when SendGrid is configured.</p>
        <div class="table-wrap"><table><thead><tr><th>Company</th><th>Stores</th><th>Goal</th><th>Status</th></tr></thead><tbody>${demoRows}</tbody></table></div>
      </article>` : "";

  return pageShell("Admin", "Production controls for users, permissions, alerts, integrations, API access, and audit history.", `
    ${state.enterpriseError ? `<article class="card"><p class="form-error">${esc(state.enterpriseError)}</p></article>` : ""}
    <div class="toolbar-spread">
      <div>
        <p class="eyebrow">Workspace</p>
        <h2 class="text-lg">${esc(organization.name || workspaceName())}</h2>
      </div>
      <button class="btn-primary" data-refresh-admin type="button" ${state.adminBusy ? "disabled" : ""}>${state.adminBusy ? spinner("Refreshing...") : "Refresh admin data"}</button>
    </div>

    <section class="kpi-grid">
      ${kpiCard("Plan", esc(organization.plan || "starter"), "Current subscription tier.", "info", "", false)}
      ${kpiCard("Team members", fmt(members), "RBAC-backed users in this workspace.", "success", `${fmt(members)} users`, false)}
      ${kpiCard("Sales rows", fmt(counts.salesRows || 0), "Imported rows feeding forecasts.", "success", "live data", false)}
      ${kpiCard("Inventory records", fmt(counts.inventoryRows || 0), "SKU-location inventory records.", "info", "warehouse", false)}
      ${kpiCard("Open alerts", fmt(openAlerts), "Unresolved threshold and integration alerts.", openAlerts ? "high" : "success", openAlerts ? "review" : "clear", false)}
      ${kpiCard("API keys", fmt(activeKeys), "Active integration keys for partner systems.", "info", "secure", false)}
    </section>

    <section class="admin-explainer-grid">
      <article class="card admin-explainer">
        <p class="eyebrow">What this page controls</p>
        <h2 class="text-lg">Admin is the operating control room for the workspace.</h2>
        <p class="muted">Use it to invite teammates, review who can see the data, switch between workspaces, check whether Shopify/CSV syncs are healthy, track demo requests, and audit important workspace activity.</p>
      </article>
      <article class="card admin-explainer">
        <p class="eyebrow">Invite collaborators</p>
        <h2 class="text-lg">Give teammates access to the same planning data.</h2>
        <form class="admin-invite-form" data-invite-user>
          <input class="input" name="email" type="email" placeholder="teammate@company.com" required />
          <select class="select" name="roleName">
            <option value="viewer">Viewer</option>
            <option value="member">Member</option>
            <option value="analyst">Analyst</option>
            <option value="admin">Admin</option>
          </select>
          <button class="btn-primary" type="submit" ${state.inviteBusy ? "disabled" : ""}>${state.inviteBusy ? spinner("Inviting...") : "Invite"}</button>
        </form>
        <p class="muted">Viewers can inspect dashboards and reports. Analysts and members are intended for people working with forecasts and inventory. Admins can manage users and settings.</p>
        <p class="muted">Invite emails send through SendGrid when configured. Either way, the invitee can sign in with the invited email and accept or decline the workspace invite here.</p>
        ${state.inviteMessage ? `<p class="${state.inviteMessageType === "error" ? "form-error" : "severity-low"}">${esc(state.inviteMessage)}</p>` : ""}
      </article>
    </section>

    <section class="admin-section-grid">
      <article class="card">
        <p class="eyebrow">Workspace management</p>
        <h2 class="text-lg">Your workspaces</h2>
        <p class="muted admin-card-note">Switch between your own dashboard and workspaces you have accepted from other teams.</p>
        <div class="workspace-list">${workspaceRows}</div>
      </article>
      ${workspaceSettingsCard}
      <article class="card">
        <p class="eyebrow">Pending access</p>
        <h2 class="text-lg">Workspace invites</h2>
        <p class="muted admin-card-note">Invites stay here until accepted or declined. Accepting adds the workspace to your switcher.</p>
        <div class="workspace-list">${inviteRows}</div>
      </article>
    </section>

    <section class="admin-section-grid">
      <article class="card">
        <p class="eyebrow">Team and roles</p>
        <h2 class="text-lg">Access control</h2>
        <p class="muted admin-card-note">Who can view or manage LiquidityLink data for this workspace.</p>
        <div class="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Email</th><th>Last login</th><th>Actions</th></tr></thead><tbody>${userRows}</tbody></table></div>
      </article>
      <article class="card">
        <p class="eyebrow">Integrations</p>
        <h2 class="text-lg">Provider health</h2>
        <p class="muted admin-card-note">Connection status for Shopify, CSV, and other providers feeding forecasts.</p>
        <div class="table-wrap"><table><thead><tr><th>Provider</th><th>Status</th><th>Last sync</th><th>Detail</th></tr></thead><tbody>${providerRows}</tbody></table></div>
      </article>
    </section>

    <section class="admin-section-grid">
      <article class="card">
        <p class="eyebrow">Alerting</p>
        <h2 class="text-lg">Operational alerts</h2>
        <p class="muted admin-card-note">Threshold breaches and integration problems show up here.</p>
        <div class="table-wrap"><table><thead><tr><th>Alert</th><th>Severity</th><th>Status</th><th>Created</th></tr></thead><tbody>${alertRows}</tbody></table></div>
      </article>
      <article class="card">
        <p class="eyebrow">API access</p>
        <h2 class="text-lg">Keys and scopes</h2>
        <p class="muted admin-card-note">Controls for future partner APIs and private system connections.</p>
        <div class="table-wrap"><table><thead><tr><th>Key</th><th>Scopes</th><th>Status</th><th>Last used</th></tr></thead><tbody>${keyRows}</tbody></table></div>
      </article>
    </section>

    <section class="admin-section-grid">
      ${demoRequestsCard}
      <article class="card">
        <p class="eyebrow">Settings</p>
        <h2 class="text-lg">Forecast and risk configuration</h2>
        <div class="report-list" style="margin-top:var(--space-4)">
          <div class="report-row"><span>Forecast horizon</span><span class="mono">${fmt(settings.forecastHorizonWeeks || 8)} weeks</span></div>
          <div class="report-row"><span>Lead time</span><span class="mono">${fmt(settings.leadTimeDays || 14)} days</span></div>
          <div class="report-row"><span>Target service level</span><span class="mono">${fmtPercent((settings.targetServiceLevel || 0.95) * 100)}</span></div>
          <div class="report-row"><span>Carrying cost rate</span><span class="mono">${fmtPercent((settings.carryingCostRate || 0.25) * 100)}</span></div>
          <div class="report-row"><span>Stockout alert threshold</span><span class="mono">${fmt(alertThresholds.stockoutRisk || 70)}</span></div>
          <div class="report-row"><span>Marketplace radius</span><span class="mono">${fmt(marketplaceSettings.radiusMiles || 100)} mi</span></div>
        </div>
      </article>
      <article class="card">
        <p class="eyebrow">Audit log</p>
        <h2 class="text-lg">Recent activity</h2>
        <p class="muted admin-card-note">Recent system events such as invites, imports, syncs, and settings changes.</p>
        <div class="report-list" style="margin-top:var(--space-4)">${activityRows}</div>
      </article>
    </section>
  `, "Production architecture");
}

function profilePage() {
  const user = state.authUser || {};
  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "LL";
  const mfaLabel = user.twoFactorEnabled ? `${user.twoFactorMethod === "phone" ? "Phone" : "Email"} verification enabled` : "Not enabled";
  const name = workspaceName();
  return pageShell("Profile", "Manage your account, password, and session.", `
    <section class="grid-2 account-grid">
      <article class="card account-summary">
        <div class="profile-avatar">${esc(initials)}</div>
        <div>
          <p class="eyebrow">Signed in as</p>
          <h2 class="text-lg">${esc(`${user.firstName || ""} ${user.lastName || ""}`.trim() || "LiquidityLink user")}</h2>
          <p class="muted">${esc(user.email || "")}</p>
        </div>
        <div class="account-facts">
          <div><span>Email status</span><strong>${user.emailVerified ? "Verified" : "Unverified"}</strong></div>
          <div><span>Two-factor auth</span><strong>${esc(mfaLabel)}</strong></div>
          <div><span>Workspace</span><strong>${esc(name)}</strong></div>
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
  if (authRoutes.has(location.pathname)) {
    app.innerHTML = loginPage();
    bind();
    return;
  }
  const publicViews = { "/": homePage, "/platform": platformPage, "/features": featuresPage, "/solutions": solutionsPage, "/pricing": marketingPricingPage, "/resources": resourcesPage, "/blog": blogPage, "/docs": documentationPage, "/security": securityPage, "/integrations": integrationsPage, "/about": aboutPage, "/contact": contactPage, "/book-demo": bookDemoPage };
  if (publicRoutes.has(state.path)) {
    app.innerHTML = marketingLayout((publicViews[state.path] || homePage)());
    bind();
    return;
  }
  if (!auth()) {
    app.innerHTML = loginPage();
    bind();
    return;
  }
  const views = { "/dashboard": dashboard, "/connect": connectPage, "/forecasts": forecastsPage, "/inventory": inventoryPage, "/analytics": advancedAnalyticsPage, "/marketplace": marketplacePage, "/social": socialSignalsPage, "/community": communityPage, "/admin": adminPage, "/reports": reportsPage, "/profile": profilePage };
  app.innerHTML = layout((views[state.path] || dashboard)());
  bind();
}

function bind() {
  document.querySelectorAll("[data-route]").forEach(el => el.addEventListener("click", e => { e.preventDefault(); navigate(el.getAttribute("data-route")); }));
  document.querySelectorAll("button[data-theme]").forEach(el => el.addEventListener("click", toggleTheme));
  document.querySelectorAll("[data-auth-mode]").forEach(el => el.addEventListener("click", () => {
    state.authMode = el.dataset.authMode;
    state.authMessage = "";
    state.authFieldError = null;
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
  document.querySelector("[data-refresh-admin]")?.addEventListener("click", async () => {
    state.adminBusy = true;
    render();
    await loadEnterpriseData();
    state.adminBusy = false;
    render();
    if (!state.enterpriseError) showToast("Admin data refreshed", "success");
  });
  document.querySelectorAll("[data-download]").forEach(el => el.addEventListener("click", downloadReport));
  document.querySelector("[data-global-search]")?.addEventListener("input", e => { clearTimeout(window.llSearchTimer); window.llSearchTimer = setTimeout(() => { state.search = e.target.value; state.searchOpen = true; render(); }, 200); });
  document.querySelector("[data-global-search]")?.addEventListener("keydown", e => { if (e.key === "Escape") { state.searchOpen = false; render(); } });
  document.querySelectorAll("[data-search-sku]").forEach(el => el.addEventListener("click", () => { state.highlightedSku = Number(el.dataset.searchSku); sessionStorage.setItem("ll_highlight_sku", state.highlightedSku); navigate("/inventory"); }));
  document.querySelector("[data-notifications]")?.addEventListener("click", () => { state.notificationsOpen = !state.notificationsOpen; render(); });
  document.querySelector("[data-mark-read]")?.addEventListener("click", () => { state.notifications = state.notifications.map(n => ({ ...n, read: true })); render(); });
  document.querySelectorAll("[data-provider]").forEach(el => el.addEventListener("click", () => { state.selectedProvider = el.dataset.provider; render(); }));
  document.querySelector("[data-connect-form]")?.addEventListener("submit", connectProvider);
  document.querySelector("[data-shopify-connect]")?.addEventListener("submit", startShopifyConnect);
  document.querySelector("[data-shopify-token]")?.addEventListener("click", connectShopifyToken);
  document.querySelector("[data-clover-connect]")?.addEventListener("submit", startCloverConnect);
  document.querySelectorAll("[data-sync-source]").forEach(el => el.addEventListener("click", () => syncSource(el.dataset.syncSource)));
  document.querySelectorAll("[data-social-connect]").forEach(el => el.addEventListener("click", () => startSocialConnection(el.dataset.socialConnect)));
  document.querySelector("[data-social-promotion-form]")?.addEventListener("submit", saveSocialPromotion);
  document.querySelector("[data-refresh-social]")?.addEventListener("click", async () => {
    await loadConnectionData();
    render();
    showToast("Social signals refreshed.", "success");
  });
  document.querySelector("[data-csv]")?.addEventListener("change", handleCsvFile);
  document.querySelector("[data-sample-csv]")?.addEventListener("click", downloadSampleCsv);
  document.querySelector("[data-drop]")?.addEventListener("dragover", e => e.preventDefault());
  document.querySelector("[data-drop]")?.addEventListener("drop", e => {
    e.preventDefault();
    loadCsvFile(e.dataTransfer.files[0]);
  });
  document.querySelector("[data-import-csv]")?.addEventListener("click", importCsv);
  document.querySelector("[data-invite-user]")?.addEventListener("submit", inviteUser);
  document.querySelector("[data-workspace-rename]")?.addEventListener("submit", renameWorkspace);
  document.querySelector("[data-marketing-menu]")?.addEventListener("click", () => {
    state.marketingMenuOpen = !state.marketingMenuOpen;
    render();
  });
  document.querySelectorAll("[data-security-control]").forEach(el => el.addEventListener("click", () => {
    state.securityControlMode = el.dataset.securityControl;
    render();
  }));
  document.querySelector("[data-workspace-switch]")?.addEventListener("change", e => switchWorkspace(e.target.value));
  document.querySelectorAll("[data-workspace-select]").forEach(el => el.addEventListener("click", () => switchWorkspace(el.dataset.workspaceSelect)));
  document.querySelectorAll("[data-workspace-remove]").forEach(el => el.addEventListener("click", () => removeWorkspaceMembership(el.dataset.workspaceRemove, el.dataset.workspaceName, el.dataset.workspaceRole)));
  document.querySelectorAll("[data-invite-action]").forEach(el => el.addEventListener("click", () => respondToWorkspaceInvite(el.dataset.inviteOrg, el.dataset.inviteAction)));
  document.querySelectorAll("[data-member-role]").forEach(el => el.addEventListener("change", () => updateMemberRole(el.dataset.memberRole, el.value)));
  document.querySelectorAll("[data-remove-member]").forEach(el => el.addEventListener("click", () => removeMember(el.dataset.removeMember, el.dataset.memberEmail)));
  document.querySelectorAll("[data-check]").forEach(el => el.addEventListener("click", () => runChecklist(el.dataset.check)));
  document.querySelector("[data-inventory-search]")?.addEventListener("input", e => { state.inventoryFilter = e.target.value; state.inventoryPage = 1; render(); });
  document.querySelector("[data-inventory-sort]")?.addEventListener("change", e => { state.inventorySort = e.target.value; state.inventoryPage = 1; render(); });
  const inventorySort = document.querySelector("[data-inventory-sort]");
  if (inventorySort) inventorySort.value = state.inventorySort;
  document.querySelectorAll("[data-inventory-page]").forEach(el => el.addEventListener("click", () => { state.inventoryPage = Number(el.dataset.inventoryPage); render(); }));
  document.querySelectorAll("[data-action-filter]").forEach(el => el.addEventListener("click", () => { state.actionFilter = el.dataset.actionFilter; state.inventoryPage = 1; render(); }));
  document.querySelector("[data-discount-slider]")?.addEventListener("input", e => {
    const discount = Number(e.target.value) || 0;
    const output = document.querySelector("[data-discount-output]");
    const lift = document.querySelector("[data-demand-lift]");
    if (output) output.textContent = `${discount}%`;
    if (lift) lift.textContent = `${Math.round(discount * 0.8)}%`;
  });
  document.querySelectorAll("[data-market-filter]").forEach(el => { el.value = state[el.dataset.marketFilter]; el.addEventListener("change", () => { state[el.dataset.marketFilter] = el.dataset.marketFilter === "distFilter" ? Number(el.value) : el.value; render(); }); });
  document.querySelectorAll("[data-market-text-filter]").forEach(el => el.addEventListener("input", e => {
    const key = e.currentTarget.dataset.marketTextFilter;
    clearTimeout(window.llMarketFilterTimer);
    window.llMarketFilterTimer = setTimeout(() => {
      state[key] = e.currentTarget.value;
      render();
    }, 180);
  }));
  document.querySelector("[data-use-location]")?.addEventListener("click", useMarketplaceLocation);
  document.querySelector("[data-marketplace-search]")?.addEventListener("submit", searchMarketplaceBusinesses);
  const marketplaceSearchForm = document.querySelector("[data-marketplace-search]");
  if (marketplaceSearchForm) {
    marketplaceSearchForm.category.value = ["all", "food", "apparel", "electronics", "home", "health"].includes(state.catFilter) ? state.catFilter : "all";
    marketplaceSearchForm.radius.value = String(state.distFilter);
  }
  document.querySelectorAll("[data-contact], [data-retailer]").forEach(el => el.addEventListener("click", () => {
    const id = el.dataset.contact || el.dataset.retailer;
    state.selectedRetailer = marketplaceListings().find(l => String(l.id) === String(id)) || listings[0];
    state.messageSent = "";
    render();
  }));
  document.querySelector("[data-message]")?.addEventListener("submit", sendMessage);
  document.querySelectorAll("[data-topic]").forEach(el => el.addEventListener("click", () => { state.selectedTopic = el.dataset.topic; render(); }));
  document.querySelector("[data-post]")?.addEventListener("submit", postCommunity);
  document.querySelectorAll("[data-pricing-plan]").forEach(el => el.addEventListener("click", () => showToast(`${el.dataset.pricingPlan} checkout is ready for payment backend wiring.`, "success")));
  document.querySelectorAll("[data-pricing-preview]").forEach(el => el.addEventListener("click", () => {
    state.selectedPricingTier = el.dataset.pricingPreview || "Growth";
    localStorage.setItem("ll_selected_pricing_tier", state.selectedPricingTier);
    render();
  }));
  document.querySelector("[data-pricing-comparison-toggle]")?.addEventListener("click", () => {
    state.pricingComparisonExpanded = !state.pricingComparisonExpanded;
    render();
  });
  document.querySelectorAll("[data-forecast-model]").forEach(el => el.addEventListener("click", () => {
    state.marketingForecastModel = el.dataset.forecastModel || "ensemble";
    localStorage.setItem("ll_marketing_forecast_model", state.marketingForecastModel);
    render();
  }));
  document.querySelectorAll("[data-queue-tab]").forEach(el => el.addEventListener("click", handleQueueTab));
  document.querySelectorAll("[data-queue-detail]").forEach(el => el.addEventListener("click", handleQueueRowPreview));
  document.querySelectorAll("[data-traction-detail]").forEach(el => el.addEventListener("click", () => showToast(el.dataset.tractionDetail, "info")));
  document.querySelector("[data-demo-form]")?.addEventListener("submit", submitDemoRequest);
  document.querySelector("[data-profile-form]")?.addEventListener("submit", updateProfile);
  document.querySelector("[data-password-form]")?.addEventListener("submit", changePassword);
  document.querySelector("[data-send-profile-reset]")?.addEventListener("click", sendProfileReset);
  document.querySelector("[data-mfa-method]")?.addEventListener("change", e => { state.mfaSetupMethod = e.target.value; render(); });
  document.querySelector("[data-mfa-start-form]")?.addEventListener("submit", startMfaSetup);
  document.querySelector("[data-mfa-confirm-form]")?.addEventListener("submit", confirmMfaSetup);
  document.querySelector("[data-disable-mfa]")?.addEventListener("click", disableMfa);
  document.querySelectorAll("[data-accordion]").forEach(el => el.addEventListener("click", () => el.closest(".accordion-item").classList.toggle("open")));
  bindMarketingBackground();
  loadLiveStatistics();
  setupReveals();
  bindChartTips();
}

async function loadLiveStatistics() {
  const container = document.querySelector("[data-live-statistics]");
  if (!container || window.llLiveStatsLoading) return;
  window.llLiveStatsLoading = true;
  const status = container.querySelector("[data-live-stat-status]");
  try {
    const response = await fetch("/api/live-statistics", { credentials: "same-origin" });
    const payload = await response.json().catch(() => ({}));
    const stats = payload.data || {};
    const followerValue = container.querySelector('[data-live-stat-value="instagramFollowers"]');
    const followerDetail = container.querySelector('[data-live-stat-detail="instagramFollowers"]');
    if (stats.instagramFollowers && followerValue) followerValue.textContent = stats.instagramFollowers;
    if (followerDetail) {
      followerDetail.textContent = stats.instagramFollowersSource === "instagram_graph_api"
        ? `Current follower count from ${companyLinks.instagram}. Updated ${new Date(stats.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`
        : "Followers since the first LiquidityLink Instagram launch posts in July.";
    }
    if (status) {
      status.textContent = stats.instagramFollowersSource === "instagram_graph_api"
        ? "Instagram follower count is current."
        : "July launch traction snapshot.";
    }
  } catch {
    if (status) status.textContent = "July launch traction snapshot.";
  } finally {
    window.llLiveStatsLoading = false;
  }
}

function setupReveals() {
  const targets = [...document.querySelectorAll(".marketing-main > section, .marketing-main > .feature-zigzag > article, .marketing-card, .product-frame, .chart, .chart-block, .screen-chart, .hero-forecast")];
  if (!targets.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    targets.forEach(el => el.classList.add("revealed"));
    return;
  }
  targets.forEach(el => el.classList.add("reveal"));
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("revealed");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.14 });
  targets.forEach(el => observer.observe(el));
}

function handleQueueTab(e) {
  e.preventDefault();
  e.stopPropagation();
  const button = e.currentTarget;
  const panel = button.closest("[data-queue-panel]");
  const target = panel?.querySelector("[data-queue-rows]");
  if (!panel || !target || button.classList.contains("active")) return;
  panel.querySelectorAll("[data-queue-tab]").forEach(tab => {
    const selected = tab === button;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  target.innerHTML = skuActionRows(queueRows(button.dataset.queueTab));
  panel.querySelector("[data-queue-detail-output]").textContent = "Click a SKU row to preview the recommended next step.";
  target.querySelectorAll("[data-queue-detail]").forEach(el => el.addEventListener("click", handleQueueRowPreview));
}

function handleQueueRowPreview(e) {
  const row = e.currentTarget;
  const panel = row.closest("[data-queue-panel]");
  const output = panel?.querySelector("[data-queue-detail-output]");
  if (!output) return;
  panel.querySelectorAll("[data-queue-detail]").forEach(item => {
    const selected = item === row;
    item.classList.toggle("selected", selected);
    item.setAttribute("aria-expanded", String(selected));
  });
  output.textContent = row.dataset.queueDetail || "Review the recommended action and supporting forecast context.";
}

function bindMarketingBackground() {
  const site = document.querySelector(".marketing-site");
  if (!site || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let frame = 0;
  site.addEventListener("pointermove", event => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      const rect = site.getBoundingClientRect();
      site.style.setProperty("--glow-x", `${Math.round(((event.clientX - rect.left) / Math.max(1, rect.width)) * 100)}%`);
      site.style.setProperty("--glow-y", `${Math.round(((event.clientY - rect.top) / Math.max(1, rect.height)) * 100)}%`);
      frame = 0;
    });
  }, { passive: true });
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
    throw new Error("The authentication server is not reachable. Start the LiquidityLink backend and open http://localhost:4174.");
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
  state.authFieldError = null;
  render();
  try {
    const status = await authStatus();
    if (!status.providers?.[provider]) {
      throw new Error("Google sign-in is not configured yet. Add the client ID and secret to .env, then restart the backend.");
    }
    const redirectTo = encodeURIComponent(sessionStorage.getItem("ll_redirect_after_login") || "/dashboard");
    location.href = `/api/auth/oauth/${provider}?redirectTo=${redirectTo}`;
  } catch (err) {
    state.authBusy = false;
    state.authMessage = err.message;
    state.authFieldError = null;
    render();
  }
}

async function submitDemoRequest(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  state.demoBusy = true;
  state.demoMessage = "";
  render();
  try {
    const response = await fetch("/api/demo-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not send the demo request. Please try again.");
    state.demoMessageType = "success";
    state.demoMessage = "Demo request sent. We will follow up by email.";
    showToast("Demo request sent.", "success");
  } catch (err) {
    state.demoMessageType = "error";
    state.demoMessage = err.message;
    showToast(err.message, "error");
  } finally {
    state.demoBusy = false;
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
    headers: authedHeaders({ "Content-Type": "application/json" }),
    credentials: "same-origin",
    body: JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || "Request failed. Please try again.");
    err.code = data.code;
    err.status = data.status;
    throw err;
  }
  return data;
}

async function apiAuthedPost(path, body) {
  if (!state.accessToken) throw new Error("Sign in required.");
  const response = await fetch(path, {
    method: "POST",
    headers: authedHeaders({ "Content-Type": "application/json" }),
    credentials: "same-origin",
    body: JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || "Request failed. Please try again.");
    err.code = data.code;
    err.status = data.status;
    throw err;
  }
  return data;
}

async function apiAuthedPut(path, body) {
  if (!state.accessToken) throw new Error("Sign in required.");
  const response = await fetch(path, {
    method: "PUT",
    headers: authedHeaders({ "Content-Type": "application/json" }),
    credentials: "same-origin",
    body: JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || "Request failed. Please try again.");
    err.code = data.code;
    err.status = data.status;
    throw err;
  }
  return data;
}

async function apiAuthedPatch(path, body) {
  if (!state.accessToken) throw new Error("Sign in required.");
  const response = await fetch(path, {
    method: "PATCH",
    headers: authedHeaders({ "Content-Type": "application/json" }),
    credentials: "same-origin",
    body: JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || "Request failed. Please try again.");
    err.code = data.code;
    err.status = data.status;
    throw err;
  }
  return data;
}

async function apiAuthedDelete(path) {
  if (!state.accessToken) throw new Error("Sign in required.");
  const response = await fetch(path, {
    method: "DELETE",
    headers: authedHeaders(),
    credentials: "same-origin",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || "Request failed. Please try again.");
    err.code = data.code;
    err.status = data.status;
    throw err;
  }
  return data;
}

async function apiAuthedGet(path) {
  if (!state.accessToken) throw new Error("Sign in required.");
  const response = await fetch(path, {
    headers: authedHeaders(),
    credentials: "same-origin",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || "Request failed. Please try again.");
    err.code = data.code;
    err.status = data.status;
    throw err;
  }
  return data;
}

function authedHeaders(extra = {}) {
  return {
    ...extra,
    Authorization: `Bearer ${state.accessToken}`,
    ...(state.enterprise?.activeWorkspaceId ? { "X-Organization-Id": state.enterprise.activeWorkspaceId } : {}),
  };
}

function apiPayload(response, key) {
  const data = response?.data || response || {};
  return key ? (data[key] || []) : data;
}

function normalizeWorkspace(row = {}) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    billingStatus: row.billingStatus || row.billing_status,
    ownerUserId: row.ownerUserId || row.owner_user_id,
    roleName: row.roleName || row.role_name,
    status: row.status,
    createdAt: row.createdAt || row.created_at,
  };
}

function normalizeMember(row = {}) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName || row.first_name,
    lastName: row.lastName || row.last_name,
    emailVerified: Boolean(row.emailVerified ?? row.email_verified),
    role: row.role || row.roleName || row.role_name,
    status: row.status,
    lastLogin: row.lastLogin || row.last_login,
    createdAt: row.createdAt || row.created_at,
  };
}

function normalizeNotification(row = {}) {
  const createdAt = row.createdAt || row.created_at;
  return {
    id: row.id,
    type: row.type || "info",
    text: row.text || row.message || row.title || "Notification",
    time: row.time || (createdAt ? new Date(createdAt).toLocaleString() : "just now"),
    read: Boolean(row.read ?? row.read_at),
  };
}

async function loadEnterpriseData() {
  if (!state.accessToken) return;
  try {
    const [workspacesResponse, overview, users, alerts, notifications, settings, apiKeys, activity, demoRequests] = await Promise.all([
      apiAuthedGet("/api/workspaces"),
      apiAuthedGet("/api/admin/overview"),
      apiAuthedGet("/api/users"),
      apiAuthedGet("/api/alerts"),
      apiAuthedGet("/api/notifications"),
      apiAuthedGet("/api/settings"),
      apiAuthedGet("/api/api-keys"),
      apiAuthedGet("/api/activity?limit=25"),
      apiAuthedGet("/api/demo-requests?limit=25").catch(err => err.code === "DEMO_REQUESTS_PRIVATE" ? { data: { demoRequests: [] } } : Promise.reject(err)),
    ]);
    const workspacePayload = apiPayload(workspacesResponse);
    const workspaces = (workspacePayload.workspaces || []).map(normalizeWorkspace);
    const pendingInvites = (workspacePayload.pendingInvites || []).map(normalizeWorkspace);
    const activeWorkspaceId = workspacePayload.activeWorkspaceId || state.enterprise.activeWorkspaceId || workspaces[0]?.id || "";
    if (activeWorkspaceId) localStorage.setItem("ll_active_workspace_id", activeWorkspaceId);
    state.enterprise = {
      overview: apiPayload(overview),
      workspaces,
      pendingInvites,
      activeWorkspaceId,
      users: apiPayload(users, "users").map(normalizeMember),
      alerts: apiPayload(alerts, "alerts"),
      notifications: apiPayload(notifications, "notifications").map(normalizeNotification),
      settings: apiPayload(settings, "settings"),
      apiKeys: apiPayload(apiKeys, "apiKeys"),
      activity: apiPayload(activity, "activity"),
      demoRequests: apiPayload(demoRequests, "demoRequests"),
    };
    state.enterpriseError = "";
  } catch (err) {
    state.enterpriseError = err.message || "Admin data could not be loaded.";
    console.warn("Could not load enterprise data:", err);
  }
}

async function loadConnectionData() {
  if (!state.accessToken) return;
  try {
    const [statusData, salesData, advancedData, socialData] = await Promise.all([
      apiAuthedGet("/api/integrations/status"),
      apiAuthedGet("/api/integrations/sales"),
      apiAuthedGet("/api/planning/overview").catch(() => apiAuthedGet("/api/analytics/advanced")),
      apiAuthedGet("/api/social/promotions").catch(() => ({ data: { promotions: [] } })),
    ]);
    const providers = apiPayload(statusData, "providers");
    const salesPayload = apiPayload(salesData);
    const advancedPayload = apiPayload(advancedData);
    for (const provider of providers || []) state.connectionStatus[provider.provider] = provider;
    state.salesRecords = salesPayload.records || [];
    state.inventoryItems = salesPayload.inventory || [];
    state.advancedAnalytics = advancedPayload.analytics || advancedPayload;
    state.socialPromotions = apiPayload(socialData, "promotions") || [];
    const hasPlanningData = Boolean(state.advancedAnalytics?.summary?.salesRows || state.advancedAnalytics?.summary?.inventoryRows);
    if (state.salesRecords.length || hasPlanningData) {
      state.checklist.sales = true;
      state.checklist.inventory = true;
      state.checklist.analysis = true;
    }
    await loadEnterpriseData();
  } catch (err) {
    console.warn("Could not load connection data:", err);
  }
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
  state.authFieldError = null;
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
      await loadConnectionData();
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
    await loadConnectionData();
    const next = sessionStorage.getItem("ll_redirect_after_login") || "/dashboard";
    sessionStorage.removeItem("ll_redirect_after_login");
    replacePath(next);
    state.path = next in routes ? next : "/dashboard";
    render();
    showToast(mode === "signup" ? "Account created." : "Signed in.", "success");
  } catch (err) {
    state.authBusy = false;
    if (mode === "signup" && err.code === "EMAIL_EXISTS") {
      goToAuth("signin", "That email already has a LiquidityLink account. Sign in instead, or use Forgot password if you need a reset link.");
      showToast("Account already exists. Use sign in.", "info");
      return;
    }
    state.authFieldError = authFieldErrorFor(mode, err);
    state.authMessage = state.authFieldError ? "" : err.message;
    render();
  }
}

function authFieldErrorFor(mode, err) {
  const message = err.message || "Please check this field and try again.";
  const byCode = {
    INVALID_EMAIL: "email",
    EMAIL_NOT_FOUND: "email",
    EMAIL_EXISTS: "email",
    SOCIAL_ACCOUNT: "email",
    WEAK_PASSWORD: "password",
    WRONG_PASSWORD: "password",
    PASSWORD_MISMATCH: "confirmPassword",
    NAME_REQUIRED: "firstName",
    INVALID_MFA_CODE: "code",
    MFA_CHALLENGE_EXPIRED: "code",
  };
  const field = byCode[err.code] || (mode === "mfa" ? "code" : "");
  return field ? { field, message } : null;
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
  state.salesRecords = [];
  state.inventoryItems = [];
  state.advancedAnalytics = null;
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
  const finish = () => {
    state.lastUpdated = "Updated just now";
    state.refreshing = false;
    state.syncing = false;
    render();
    showToast("Analysis refreshed", "success");
  };
  if (state.accessToken && state.salesRecords.length) {
    loadConnectionData().finally(finish);
    return;
  }
  setTimeout(() => {
    state.riskScore = Math.max(0, Math.min(100, 76 + Math.round(Math.random() * 6 - 3)));
    state.revenueRisk = 684000 + Math.round(Math.random() * 24000 - 12000);
    finish();
  }, 1600);
}

async function connectProvider(e) {
  e.preventDefault();
  await syncSource(state.selectedProvider);
}

function handleCsvFile(e) {
  loadCsvFile(e.target.files[0]);
}

function loadCsvFile(file) {
  if (!file) return;
  if (!/\.csv$/i.test(file.name)) return showToast("Choose a CSV file.", "error");
  state.csv = { name: file.name, loading: true, rows: null, records: [], errors: [] };
  render();
  file.text().then(text => setTimeout(() => {
    const parsed = parseSalesCsv(text);
    if (!parsed.rows.length) {
      state.csv = null;
      render();
      showToast("CSV file is empty.", "error");
      return;
    }
    state.csv = { name: file.name, ...parsed };
    render();
    if (parsed.errors.length) showToast(`Found ${parsed.errors.length} CSV row issue${parsed.errors.length === 1 ? "" : "s"}.`, "error");
  }, 1200)).catch(() => {
    state.csv = null;
    render();
    showToast("Could not read that CSV file.", "error");
  });
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function parseSalesCsv(text) {
  const rows = parseCsvRows(text);
  if (!rows.length) return { rows: [], records: [], errors: [] };
  const headers = rows[0].map(normalizeHeader);
  const findHeader = names => headers.findIndex(header => names.includes(header));
  const hasAnyHeader = names => names.some(name => headers.includes(name));
  const looksLikeShopifyProductExport = hasAnyHeader(["handle", "option1 name", "variant inventory qty", "variant price", "variant sku"])
    && !hasAnyHeader(["lineitem quantity", "line item quantity", "paid at", "created at", "processed at", "name"]);
  const indexes = {
    sku: findHeader(["sku", "product sku", "item sku", "lineitem sku", "line item sku", "variant sku", "product variant sku"]),
    productName: findHeader(["lineitem name", "line item name", "product name", "product", "item name", "title"]),
    date: findHeader(["date", "sale date", "sold date", "order date", "created at", "paid at", "processed at", "fulfilled at"]),
    quantity: findHeader(["quantity sold", "quantity", "qty", "units sold", "lineitem quantity", "line item quantity", "net quantity", "ordered quantity"]),
    location: findHeader(["location", "store", "warehouse", "site", "fulfillment location", "location name", "source name", "pos location", "outlet", "order location"]),
  };
  const missing = Object.entries(indexes)
    .filter(([key, index]) => key !== "location" && key !== "productName" && index < 0)
    .map(([key]) => key === "quantity" ? "quantity sold" : key);
  if (indexes.sku < 0 && indexes.productName < 0) missing.push("sku or product name");
  if (missing.length) {
    const guidance = looksLikeShopifyProductExport
      ? " This looks like a Shopify Products/Inventory CSV. For forecasts, upload Shopify Admin > Orders > Export CSV because LiquidityLink needs order dates and line item quantities."
      : " Upload a Shopify Orders CSV or a sales CSV with SKU/product name, date, and quantity sold columns.";
    return {
      rows,
      records: [],
      errors: [{ row: 1, errors: [`Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.${guidance}`] }],
    };
  }
  const records = [];
  const errors = [];
  let lastOrderDate = "";
  let lastOrderLocation = "";
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sku = String((indexes.sku >= 0 ? row[indexes.sku] : "") || (indexes.productName >= 0 ? row[indexes.productName] : "") || "").trim();
    const currentDateCell = String(row[indexes.date] || "").trim();
    const rawDate = currentDateCell || lastOrderDate;
    const datePrefix = rawDate.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
    const parsedDate = new Date(rawDate);
    const date = datePrefix || (Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toISOString().slice(0, 10));
    const quantity = Number(String(row[indexes.quantity] || "").replace(/,/g, ""));
    const currentLocationCell = indexes.location >= 0 ? String(row[indexes.location] || "").trim() : "";
    const location = currentLocationCell || lastOrderLocation || "Shopify export";
    if (currentDateCell && date) lastOrderDate = currentDateCell;
    if (currentLocationCell) lastOrderLocation = currentLocationCell;
    const rowErrors = [];
    if (!sku) rowErrors.push("SKU is required.");
    if (!date) rowErrors.push("Date must be a valid date.");
    if (!Number.isFinite(quantity) || quantity < 0) rowErrors.push("Quantity sold must be a non-negative number.");
    if (rowErrors.length) errors.push({ row: i + 1, errors: rowErrors });
    else records.push({ sku, date, quantity, location: location || "Shopify export" });
  }
  return { rows, records, errors };
}

function downloadSampleCsv() {
  const csv = [
    ["sku", "date", "quantity sold", "location"],
    ["TRAIL-SHOE-M10", "2026-07-01", "12", "North Store"],
    ["DRY-BAG-10L", "2026-07-01", "4", "West Store"],
    ["MERINO-LAYER-L", "2026-07-02", "7", "Online"],
  ].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "liquiditylink-sales-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function importCsv() {
  if (!state.csv?.records?.length) return showToast("Choose a CSV with valid sales rows first.", "error");
  state.providerBusy = true;
  render();
  try {
    const data = await apiAuthedPost("/api/integrations/csv", { records: state.csv.records });
    if (data.status) state.connectionStatus.csv = data.status;
    await loadConnectionData();
    state.providerBusy = false;
    state.checklist.sales = true;
    state.checklist.inventory = true;
    state.checklist.analysis = true;
    state.csv = null;
    render();
    showToast(`Imported ${data.imported} rows. Forecasts are using CSV data now.`, "success");
  } catch (err) {
    state.providerBusy = false;
    render();
    showToast(err.message, "error");
  }
}

async function inviteUser(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  const invitedEmail = String(values.email || "").trim().toLowerCase();
  const currentEmail = String(state.authUser?.email || "").trim().toLowerCase();
  if (invitedEmail && currentEmail && invitedEmail === currentEmail) {
    const message = "You cannot invite yourself. Use a different teammate email.";
    state.inviteBusy = false;
    state.inviteMessageType = "error";
    state.inviteMessage = message;
    render();
    showToast(message, "error");
    return;
  }
  state.inviteBusy = true;
  state.inviteMessage = "";
  render();
  try {
    const data = apiPayload(await apiAuthedPost("/api/users", values));
    state.inviteBusy = false;
    state.inviteMessageType = "success";
    const accessNote = data.status === "active"
      ? "They already have active access; tell them to use the workspace switcher."
      : "They must sign in with that exact email, then open Admin > Workspace invites.";
    const delivery = data.inviteDelivery === "sent"
      ? "Email sent."
      : data.inviteDelivery === "failed"
        ? "Email failed, but the in-app invite and notification were saved."
        : "No email was sent because SendGrid is not configured on Render; the in-app invite and notification were saved.";
    state.inviteMessage = `${data.email || values.email} was invited as ${data.roleName || values.roleName || "viewer"}. ${delivery} ${accessNote}`;
    await loadEnterpriseData();
    render();
    showToast(state.inviteMessage, "success");
  } catch (err) {
    state.inviteBusy = false;
    state.inviteMessageType = "error";
    state.inviteMessage = err.message;
    render();
    showToast(err.message, "error");
  }
}

async function switchWorkspace(workspaceId) {
  if (!workspaceId || workspaceId === state.enterprise.activeWorkspaceId) return;
  state.enterprise.activeWorkspaceId = workspaceId;
  localStorage.setItem("ll_active_workspace_id", workspaceId);
  clearWorkspaceScopedUi();
  state.adminBusy = true;
  render();
  try {
    await Promise.all([loadEnterpriseData(), loadConnectionData()]);
    showToast(`Switched to ${workspaceName()}`, "success");
  } catch (err) {
    showToast(err.message || "Workspace data could not be refreshed.", "error");
  } finally {
    state.adminBusy = false;
    render();
  }
}

function clearWorkspaceScopedUi() {
  state.marketplaceListings = [];
  state.marketplaceOrigin = null;
  state.marketplaceDirectoryNote = "";
  state.marketplaceError = "";
  state.selectedRetailer = null;
  state.messageSent = "";
  state.notificationsOpen = false;
  state.searchOpen = false;
  state.inventoryPage = 1;
}

async function renameWorkspace(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const name = String(new FormData(form).get("name") || "").trim();
  if (name.length < 2) {
    errorAfter(form.elements.name, "Enter at least 2 characters");
    return;
  }
  const organizationId = state.enterprise.activeWorkspaceId;
  if (!organizationId) return showToast("No active workspace selected.", "error");
  state.adminBusy = true;
  render();
  try {
    await apiAuthedPatch(`/api/workspaces/${organizationId}`, { name });
    await loadEnterpriseData();
    showToast("Workspace name updated.", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    state.adminBusy = false;
    render();
  }
}

async function respondToWorkspaceInvite(organizationId, action) {
  if (!organizationId || !["accept", "decline"].includes(action)) return;
  state.adminBusy = true;
  render();
  try {
    await apiAuthedPost(`/api/invitations/${organizationId}/${action}`, {});
    if (action === "accept") {
      state.enterprise.activeWorkspaceId = organizationId;
      localStorage.setItem("ll_active_workspace_id", organizationId);
      clearWorkspaceScopedUi();
    }
    await Promise.all([loadEnterpriseData(), loadConnectionData()]);
    showToast(action === "accept" ? "Workspace invite accepted." : "Workspace invite declined.", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    state.adminBusy = false;
    render();
  }
}

async function removeWorkspaceMembership(organizationId, workspaceName, roleName) {
  if (!organizationId) return;
  const isOwner = roleName === "owner";
  const verb = isOwner ? "remove" : "leave";
  const ok = window.confirm(`Are you sure you want to ${verb} ${workspaceName || "this workspace"}?`);
  if (!ok) return;
  state.adminBusy = true;
  render();
  try {
    const data = apiPayload(await apiAuthedDelete(`/api/workspaces/${organizationId}/membership`));
    if (state.enterprise.activeWorkspaceId === organizationId) {
      state.enterprise.activeWorkspaceId = "";
      localStorage.removeItem("ll_active_workspace_id");
    }
    await Promise.all([loadEnterpriseData(), loadConnectionData()]);
    showToast(data.deletedWorkspace ? "Workspace removed." : "Workspace left.", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    state.adminBusy = false;
    render();
  }
}

async function updateMemberRole(userId, roleName) {
  if (!userId || !roleName) return;
  state.adminBusy = true;
  render();
  try {
    await apiAuthedPut(`/api/users/${userId}`, { roleName });
    await loadEnterpriseData();
    showToast("Member permission updated.", "success");
  } catch (err) {
    await loadEnterpriseData();
    showToast(err.message, "error");
  } finally {
    state.adminBusy = false;
    render();
  }
}

async function removeMember(userId, email) {
  if (!userId) return;
  const ok = window.confirm(`Remove ${email || "this user"} from this workspace?`);
  if (!ok) return;
  state.adminBusy = true;
  render();
  try {
    await apiAuthedDelete(`/api/users/${userId}`);
    await loadEnterpriseData();
    showToast("Member removed from workspace.", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    state.adminBusy = false;
    render();
  }
}

async function syncSource(provider) {
  state.connectionsBusy = provider;
  render();
  try {
    const data = await apiAuthedPost(`/api/integrations/${provider}/sync`, {});
    if (data.status) state.connectionStatus[provider] = data.status;
    if (data.analytics) state.advancedAnalytics = data.analytics;
    await loadConnectionData();
    showToast(`${providerName(provider)} synced.`, "success");
  } catch (err) {
    if (err.status) state.connectionStatus[provider] = err.status;
    showToast(err.message, "error");
  } finally {
    state.connectionsBusy = "";
    render();
  }
}

async function startSocialConnection(provider) {
  if (!provider) return;
  state.socialProviderBusy = provider;
  render();
  try {
    const data = await apiAuthedPost(`/api/integrations/social/${provider}/start`, { redirectTo: "/social" });
    if (data.status) state.connectionStatus[provider] = data.status;
    if (data.url) {
      location.href = data.url;
      return;
    }
    showToast(data.message || `${providerName(provider)} is scaffolded. Add API keys tomorrow to finish OAuth.`, "info");
  } catch (err) {
    if (err.status) state.connectionStatus[provider] = err.status;
    showToast(err.message, err.code === "SOCIAL_PROVIDER_NOT_CONFIGURED" ? "info" : "error");
  } finally {
    state.socialProviderBusy = "";
    render();
  }
}

async function saveSocialPromotion(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  state.socialPromotionBusy = true;
  render();
  try {
    const data = await apiAuthedPost("/api/social/promotions", values);
    const promotion = apiPayload(data).promotion || data.promotion;
    state.socialPromotions = [promotion, ...(state.socialPromotions || [])].filter(Boolean);
    form.reset();
    showToast("Promotion signal saved.", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    state.socialPromotionBusy = false;
    render();
  }
}

async function startShopifyConnect(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const shop = String(new FormData(form).get("shop") || "").trim();
  form.querySelectorAll(".input-error-msg").forEach(n => n.remove());
  form.querySelectorAll(".input--error").forEach(n => n.classList.remove("input--error"));
  if (!shop) {
    errorAfter(form.shop, "Enter your Shopify store domain");
    return;
  }
  state.shopifyShop = shop;
  state.connectionsBusy = "shopify";
  render();
  try {
    const data = await apiAuthedPost("/api/integrations/shopify/start", { shop, redirectTo: "/connect" });
    location.href = data.url;
  } catch (err) {
    state.connectionsBusy = "";
    render();
    showToast(err.message, "error");
  }
}

async function connectShopifyToken(e) {
  e.preventDefault();
  const form = e.currentTarget.closest("form");
  const shop = String(new FormData(form).get("shop") || "").trim();
  const accessToken = String(new FormData(form).get("accessToken") || "").trim();
  form.querySelectorAll(".input-error-msg").forEach(n => n.remove());
  form.querySelectorAll(".input--error").forEach(n => n.classList.remove("input--error"));
  if (!shop) {
    errorAfter(form.shop, "Enter the Shopify store domain first");
    return;
  }
  if (!accessToken) {
    errorAfter(form.accessToken, "Paste the Admin API access token");
    return;
  }
  state.shopifyShop = shop;
  state.connectionsBusy = "shopify-token";
  render();
  try {
    const data = await apiAuthedPost("/api/integrations/shopify/token", { shop, accessToken });
    if (data.status) state.connectionStatus.shopify = data.status;
    await loadConnectionData();
    showToast("Shopify token connected. Press Sync now to import data.", "success");
  } catch (err) {
    if (err.status) state.connectionStatus.shopify = err.status;
    showToast(err.message, "error");
  } finally {
    state.connectionsBusy = "";
    render();
  }
}

async function startCloverConnect(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const merchantId = String(new FormData(form).get("merchantId") || "").trim();
  state.cloverMerchantId = merchantId;
  state.connectionsBusy = "clover";
  render();
  try {
    const data = await apiAuthedPost("/api/integrations/clover/start", { merchantId, redirectTo: "/connect" });
    location.href = data.url;
  } catch (err) {
    state.connectionsBusy = "";
    render();
    showToast(err.message, "error");
  }
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

function useMarketplaceLocation() {
  if (!navigator.geolocation) {
    showToast("Your browser does not support location access. Enter a city, ZIP, or address instead.", "error");
    return;
  }
  showToast("Your browser will ask permission to use your location.", "info");
  navigator.geolocation.getCurrentPosition(position => {
    const { latitude, longitude } = position.coords || {};
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      showToast("Could not read your location. Enter a city, ZIP, or address instead.", "error");
      return;
    }
    state.marketplaceLocation = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    localStorage.setItem("ll_marketplace_location", state.marketplaceLocation);
    render();
    showToast("Location added. Press Search nearby to refresh results.", "success");
  }, err => {
    const message = err.code === err.PERMISSION_DENIED
      ? "Location permission was denied. You can still enter a city, ZIP, or address."
      : "Could not get your location. Enter a city, ZIP, or address instead.";
    showToast(message, "error");
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
}

async function searchMarketplaceBusinesses(e) {
  e.preventDefault();
  const values = Object.fromEntries(new FormData(e.target).entries());
  const locationValue = String(values.location || "").trim();
  if (!locationValue) return showToast("Enter a city, ZIP code, or address.", "error");

  state.marketplaceSearchBusy = true;
  state.marketplaceError = "";
  state.marketplaceLocation = locationValue;
  state.marketplaceBusinessQuery = String(values.business || "").trim();
  state.marketplaceCityFilter = String(values.city || "").trim();
  state.marketplaceStateFilter = String(values.state || "").trim();
  state.catFilter = values.category || "all";
  state.distFilter = Number(values.radius || 25);
  localStorage.setItem("ll_marketplace_location", locationValue);
  render();

  try {
    const params = new URLSearchParams({
      location: locationValue,
      category: state.catFilter,
      radius: String(state.distFilter),
    });
    if (state.marketplaceBusinessQuery) params.set("business", state.marketplaceBusinessQuery);
    const data = await apiAuthedGet(`/api/marketplace/nearby?${params.toString()}`);
    state.marketplaceListings = Array.isArray(data.businesses) ? data.businesses : [];
    state.marketplaceOrigin = data.origin || null;
    state.marketplaceDirectoryNote = data.note || "";
    state.typeFilter = "all";
    state.selectedRetailer = state.marketplaceListings[0] || listings[0];
    state.messageSent = "";
    showToast(state.marketplaceListings.length ? `Found ${state.marketplaceListings.length} nearby businesses.` : "No nearby businesses found. Try a broader radius.", state.marketplaceListings.length ? "success" : "info");
  } catch (err) {
    state.marketplaceError = err.message;
    showToast(err.message, "error");
  } finally {
    state.marketplaceSearchBusy = false;
    render();
  }
}

function sendMessage(e) {
  e.preventDefault();
  const text = e.target.message.value.trim();
  if (!text) return showToast("Message cannot be empty", "error");
  state.marketplaceBusy = true; render();
  setTimeout(() => {
    const retailer = state.selectedRetailer.retailer;
    state.marketplaceBusy = false;
    const isDirectory = isDirectoryListing(state.selectedRetailer);
    state.messageSent = isDirectory
      ? `Saved outreach note for ${retailer}. Use their listed website or phone for manual contact until they join LiquidityLink.`
      : `Request sent to ${retailer}. They typically respond within 24 hours.`;
    render();
    showToast(isDirectory ? `Outreach note saved for ${retailer}.` : `Transaction request sent to ${retailer}.`, "success");
    if (!isDirectory) setTimeout(() => { state.selectedRetailer = marketplaceListings()[0] || listings[0]; state.messageSent = ""; render(); }, 3000);
  }, 1800);
}

function postCommunity(e) {
  e.preventDefault();
  const text = e.target.post.value.trim();
  if (!state.selectedTopic || !text) return showToast("Choose a topic and add a message", "error");
  state.postBusy = true; render();
  setTimeout(() => {
    state.posts.unshift({ id: Date.now(), author: workspaceName(), topic: state.selectedTopic, time: "just now", text });
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
  modalRoot.innerHTML = `<div class="modal-overlay" data-modal-close><article class="modal-card" role="dialog" aria-modal="true"><button class="btn-icon modal-close" data-modal-x aria-label="Close">${icon("x")}</button><h2 class="text-xl">How LiquidityLink works</h2><ol class="steps"><li><div><strong>Connect your store</strong><p>Link your POS or ERP system in under 2 minutes using OAuth or API keys.</p></div></li><li><div><strong>Import your data</strong><p>LiquidityLink pulls your sales history, current inventory levels, and product catalog.</p></div></li><li><div><strong>Get your forecast</strong><p>ARIMA and XGBoost models generate an 8-week demand forecast blended into one ensemble output.</p></div></li><li><div><strong>Act on recommendations</strong><p>Each SKU gets a clear action: buy, sell, hold, or transfer, with quantities and urgency.</p></div></li><li><div><strong>Track your savings</strong><p>See recovered revenue, avoided stockouts, and reduced markdowns in the executive report.</p></div></li></ol></article></div>`;
  modalRoot.querySelector("[data-modal-close]").addEventListener("click", e => { if (e.target.dataset.modalClose !== undefined || e.target.closest("[data-modal-x]")) modalRoot.innerHTML = ""; });
}

function downloadReport() {
  state.reportBusy = true; render();
  setTimeout(() => {
    const iso = new Date().toISOString().slice(0, 10);
    const summaryRows = executiveSummaryRows();
    const products = activeSkuData();
    const actionCounts = products.reduce((counts, product) => {
      counts[product.action] = (counts[product.action] || 0) + 1;
      return counts;
    }, {});
    const csv = [
      ["LiquidityLink Executive Report", new Date().toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" })],
      [],
      ["Inventory Health Summary"],
      ...summaryRows,
      [],
      ["Data Source", state.salesRecords.length ? `${state.salesRecords.length} synced sales rows` : "Starter sample data"],
      ["Inventory Source", state.inventoryItems.length ? `${state.inventoryItems.length} synced inventory items` : "Estimated from sample data"],
      ["SKU Action Summary", `Buy: ${actionCounts.buy || 0} SKUs`, `Sell: ${actionCounts.sell || 0} SKUs`, `Transfer: ${actionCounts.transfer || 0} SKUs`, `Hold: ${actionCounts.hold || 0} SKUs`],
      ["Generated by LiquidityLink", "Confidential"],
    ].map(r => r.map(c => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `LiquidityLink-Report-${iso}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    state.reportBusy = false;
    render();
    showToast("Report downloaded.", "success");
  }, 1200);
}

function scrollHighlighted() {
  if (!state.highlightedSku) return;
  document.getElementById(`sku-${state.highlightedSku}`)?.scrollIntoView({ block: "center" });
}

function lineChart(data, w, h) {
  const pad = { l: 52, r: 18, t: 18, b: 34 };
  const cleanData = (data?.length ? data : forecastData).map(safeForecastPoint);
  const vals = cleanData.flatMap(d => [d.lower, d.upper, d.arima, d.xgboost, d.ensemble]).filter(Number.isFinite);
  const low = vals.length ? Math.min(...vals) : 0;
  const high = vals.length ? Math.max(...vals) : 1;
  const padding = Math.max(1, Math.round((high - low) * 0.18), Math.round(high * 0.08));
  const min = Math.max(0, (Number.isFinite(low) ? low : 0) - padding);
  const max = Math.max(min + 1, (Number.isFinite(high) ? high : 0) + padding);
  const x = i => pad.l + i * ((w - pad.l - pad.r) / Math.max(1, cleanData.length - 1));
  const y = v => h - pad.b - ((finiteNumber(v) - min) / Math.max(1, max - min)) * (h - pad.t - pad.b);
  const path = key => cleanData.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d[key])}`).join(" ");
  const area = `${cleanData.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.upper)}`).join(" ")} ${[...cleanData].reverse().map((d, i) => `L${x(cleanData.length - 1 - i)},${y(d.lower)}`).join(" ")} Z`;
  const series = [
    ["arima", "ARIMA baseline", "var(--text-muted)", "Observed baseline from recurring demand cycles."],
    ["xgboost", "XGBoost adjusted", "var(--blue)", "Inventory- and signal-adjusted forecast."],
    ["ensemble", "Ensemble forecast", "var(--accent)", "Blended operating forecast used for recommendations."],
  ];
  const points = series.map(([key, label, color, note]) => cleanData.map((d, i) => {
    const variance = Math.round(((d.upper - d.lower) / Math.max(1, d.ensemble)) * 100);
    const tip = `<strong>${d.week} · ${label}</strong><span>Projected demand: ${fmt(d[key])} units</span><span>Confidence band: ${fmt(d.lower)}-${fmt(d.upper)} units (${variance}% width)</span><span>${note}</span>`;
    return `<g class="chart-point" tabindex="0" data-chart-tip="${attr(tip)}" aria-label="${attr(`${d.week} ${label}: ${fmt(d[key])} units`)}"><circle cx="${x(i)}" cy="${y(d[key])}" r="12" fill="var(--bg-base)" opacity="0.001"/><circle cx="${x(i)}" cy="${y(d[key])}" r="${key === "ensemble" ? 4.5 : 3.5}" fill="${color}"/></g>`;
  }).join("")).join("");
  return `<svg viewBox="0 0 ${w} ${h}"><text x="${pad.l}" y="14" fill="var(--text-muted)">Projected units</text>${[0, 1, 2, 3].map(i => { const value = Math.round(max - ((max - min) * i) / 3); return `<line class="chart-grid" x1="${pad.l}" x2="${w - pad.r}" y1="${pad.t + i * 55}" y2="${pad.t + i * 55}"/><text x="8" y="${pad.t + i * 55 + 4}" fill="var(--text-muted)">${fmt(value)}</text>`; }).join("")}<path d="${area}" fill="var(--accent-dim)"/><path d="${path("arima")}" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-dasharray="5 5"/><path d="${path("xgboost")}" fill="none" stroke="var(--blue)" stroke-width="1.5"/><path d="${path("ensemble")}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>${cleanData.map((d, i) => `<line x1="${x(i)}" x2="${x(i)}" y1="${pad.t}" y2="${h - pad.b}" class="chart-hit-line"/>`).join("")}${points}${cleanData.map((d, i) => `<text x="${x(i)}" y="${h - 10}" text-anchor="middle">${d.week}</text>`).join("")}</svg>`;
}

function areaChart(data = null) {
  if (data && state.salesRecords.length) {
    const w = 520, h = 220, p = 34;
    const confidence = data.map(safeForecastPoint).map((d, index) => ({ week: d.week, band: Math.max(0, Math.round(((d.upper - d.lower) / Math.max(1, d.ensemble)) * 100)), index }));
    const max = Math.max(20, ...confidence.map(point => point.band));
    const x = i => p + i * ((w - p * 2) / Math.max(1, confidence.length - 1));
    const y = v => h - p - (v / max) * (h - p * 2);
    const d = confidence.map((point, i) => `${i ? "L" : "M"}${x(i)},${y(point.band)}`).join(" ");
    return `<svg viewBox="0 0 ${w} ${h}" aria-label="Forecast uncertainty by week"><path d="${d} L${w - p},${h - p} L${p},${h - p}Z" fill="var(--blue-dim)"/><path d="${d}" fill="none" stroke="var(--blue)" stroke-width="2"/>${confidence.map((point, i) => {
      const tip = `<strong>${point.week} forecast confidence</strong><span>Band width: ${point.band}%</span><span>${state.salesRecords.length < 12 ? "Needs more history for stronger confidence." : "Based on synced sales variance."}</span>`;
      return `<g class="chart-point" tabindex="0" data-chart-tip="${attr(tip)}"><circle cx="${x(i)}" cy="${y(point.band)}" r="12" fill="var(--bg-base)" opacity="0.001"/><circle cx="${x(i)}" cy="${y(point.band)}" r="4" fill="var(--blue)"/></g><text x="${x(i)}" y="${Math.max(18, y(point.band) - 10)}" text-anchor="middle" fill="var(--text-muted)">${point.band}%</text><text x="${x(i)}" y="${h - 8}" text-anchor="middle">${point.week.replace("Wk ", "W")}</text>`;
    }).join("")}</svg>`;
  }
  const w = 520, h = 220, p = 34, max = 28;
  const x = i => p + i * ((w - p * 2) / (monteCarloData.length - 1));
  const y = v => h - p - (v / max) * (h - p * 2);
  const d = monteCarloData.map((m, i) => `${i ? "L" : "M"}${x(i)},${y(m.probability)}`).join(" ");
  const thresholdX = x(monteCarloData.findIndex(m => m.outcome === 40));
  return `<svg viewBox="0 0 ${w} ${h}"><path d="${d} L${w - p},${h - p} L${p},${h - p}Z" fill="var(--blue-dim)"/><path d="${d}" fill="none" stroke="var(--blue)" stroke-width="2"/><line x1="${thresholdX}" x2="${thresholdX}" y1="${p}" y2="${h - p}" stroke="var(--red)" stroke-dasharray="4 4"/><text x="${thresholdX + 8}" y="${p + 14}" fill="var(--red)">Risk threshold</text><text x="${p}" y="${p + 14}" fill="var(--blue)">Safe range</text><text x="${thresholdX + 70}" y="${p + 34}" fill="var(--red)">High risk</text>${monteCarloData.map((m, i) => {
    const zone = m.outcome >= 40 ? "High risk" : "Safe range";
    const tip = `<strong>${m.outcome >= 0 ? "+" : ""}${m.outcome}% demand outcome</strong><span>Probability: ${m.probability}%</span><span>Risk zone: ${zone}</span><span>Planning note: ${m.outcome >= 40 ? "Prepare transfer or emergency buy options." : "Covered by current stock buffer."}</span>`;
    return `<g class="chart-point" tabindex="0" data-chart-tip="${attr(tip)}"><circle cx="${x(i)}" cy="${y(m.probability)}" r="12" fill="var(--bg-base)" opacity="0.001"/><circle cx="${x(i)}" cy="${y(m.probability)}" r="4" fill="var(--blue)"/></g><text x="${x(i)}" y="${Math.max(18, y(m.probability) - 10)}" text-anchor="middle" fill="var(--text-muted)">${m.probability}%</text>`;
  }).join("")}</svg>`;
}

function barChart(data = seasonalData) {
  const w = 520, h = 180, p = 28, max = Math.max(1, ...data.map(m => m.demand)), bw = (w - p * 2) / data.length - 8;
  const avg = data.reduce((sum, m) => sum + m.demand, 0) / Math.max(1, data.length);
  const currentMonth = new Date().toLocaleString("en-US", { month: "short" });
  return `<svg viewBox="0 0 ${w} ${h}">${data.map((m, i) => {
    const bh = (m.demand / max) * (h - p * 2);
    const current = m.month === currentMonth;
    const xPos = p + i * (bw + 8);
    const yPos = h - p - bh;
    const lift = avg ? Math.round(((m.demand - avg) / avg) * 100) : 0;
    const tip = `<strong>${m.month} seasonal demand</strong><span>Demand: ${fmt(m.demand)} units</span><span>${lift >= 0 ? "+" : ""}${lift}% vs annual average</span><span>${state.salesRecords.length ? "From synced order history." : current ? "Current month: watch stockouts weekly." : "Use for buying and transfer timing."}</span>`;
    return `<g class="chart-bar" tabindex="0" data-chart-tip="${attr(tip)}"><rect x="${xPos - 3}" y="${p}" width="${bw + 6}" height="${h - p * 2}" fill="var(--bg-base)" opacity="0.001"/><rect x="${xPos}" y="${yPos}" width="${bw}" height="${bh}" rx="3" fill="var(--accent)" opacity="${current ? "1" : ".6"}" ${current ? 'filter="drop-shadow(0 0 8px var(--accent))"' : ""}/></g><text x="${xPos + bw / 2}" y="${Math.max(14, yPos - 7)}" text-anchor="middle" fill="var(--text-muted)">${fmt(m.demand)}</text><text x="${xPos + bw / 2}" y="${h - 8}" text-anchor="middle">${m.month}</text>`;
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
  const integrationMessage = params.get("integrationMessage");
  const mfaChallenge = params.get("mfa");
  if (location.pathname === "/reset-password") state.authMode = "reset";
  if (oauthError) {
    state.authMessage = oauthError;
    replacePath("/login");
  }
  if (integrationMessage) {
    replacePath("/connect");
    setTimeout(() => showToast(integrationMessage, "error"), 300);
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
      await loadConnectionData();
    } catch {
      state.accessToken = null;
      state.authUser = null;
    }
  } else {
    state.accessToken = null;
    state.authUser = null;
  }
  state.authReady = true;
  if (!auth() && !authRoutes.has(location.pathname) && !publicRoutes.has(location.pathname)) {
    sessionStorage.setItem("ll_redirect_after_login", location.pathname in routes ? location.pathname : "/dashboard");
    replacePath("/login");
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
