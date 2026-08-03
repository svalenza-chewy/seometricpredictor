import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_HOST = process.env.HOST || "127.0.0.1";
const APP_PORT = Number(process.env.PORT || "8000");
const REPORTING_API_BASE = "https://api.conductor.com";
const DATA_API_BASE = "https://api-universal.conductor.com";
const DEFAULT_SEARCH_ENGINE = "GOOGLE_en_US";
const DEFAULT_DEVICE = "SMARTPHONE";
const DEFAULT_LOCODE = "US";
const CTR_CURVE = {
  1: 0.285,
  2: 0.157,
  3: 0.11,
  4: 0.08,
  5: 0.061,
  6: 0.047,
  7: 0.036,
  8: 0.028,
  9: 0.022,
  10: 0.018,
};
const PAGE_TYPE_FILES = [
  { id: "plp", name: "PLP", file: path.join(__dirname, "benchmarks", "PLP Metrics.csv") },
  { id: "home", name: "Homepage", file: path.join(__dirname, "benchmarks", "Homepage Metrics.csv") },
  { id: "pdp", name: "PDP", file: path.join(__dirname, "benchmarks", "PDP Metrics.csv") },
  { id: "brands", name: "Brands", file: path.join(__dirname, "benchmarks", "Brands Metrics.csv") },
  { id: "ugc", name: "UGC", file: path.join(__dirname, "benchmarks", "UGC Metrics.csv") },
  { id: "deals", name: "Deals", file: path.join(__dirname, "benchmarks", "Deals Metrics.csv") },
  { id: "hvsp", name: "HVSP", file: path.join(__dirname, "benchmarks", "HVSP Metrics.csv") },
  { id: "shelters", name: "Shelters", file: path.join(__dirname, "benchmarks", "Shelters Metrics.csv") },
  { id: "superlative", name: "Superlative", file: path.join(__dirname, "benchmarks", "Superlative Metrics.csv") },
  { id: "education", name: "Education", file: path.join(__dirname, "benchmarks", "Education Metrics.csv") },
  { id: "facet", name: "Facet", file: path.join(__dirname, "benchmarks", "Facet Metrics.csv") },
];

function parseCsvRow(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

function parseMetricValue(rawValue) {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed) {
    return { value: 0, unit: "number", display: trimmed };
  }
  if (trimmed.includes("%")) {
    return { value: Number.parseFloat(trimmed.replace(/[%,$]/g, "")) || 0, unit: "%", display: trimmed };
  }
  if (trimmed.includes("$")) {
    return { value: Number.parseFloat(trimmed.replace(/[$,]/g, "")) || 0, unit: "$", display: trimmed };
  }
  return { value: Number.parseFloat(trimmed.replace(/,/g, "")) || 0, unit: "number", display: trimmed };
}

async function loadPageTypeMetrics() {
  const pageTypes = [];
  for (const config of PAGE_TYPE_FILES) {
    const csv = await readFile(config.file, "utf8");
    const rows = csv
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const metrics = {};
    for (const row of rows.slice(1)) {
      const [, kpi, stats] = parseCsvRow(row);
      const parsed = parseMetricValue(stats);
      if (kpi === "Click through rate") {
        parsed.value += 0.5;
        parsed.display = `${parsed.value.toFixed(2)}%`;
      }
      metrics[kpi] = {
        name: kpi,
        value: parsed.value,
        unit: parsed.unit,
        display: parsed.display,
      };
    }
    pageTypes.push({
      id: config.id,
      name: config.name,
      metrics,
      impactWeight: metrics.IMPRESSIONS?.value || 1,
      shareGainMultiplier: 1,
    });
  }
  return pageTypes;
}

class ConductorClient {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  signature() {
    return createHash("md5")
      .update(`${this.apiKey}${this.apiSecret}${Math.floor(Date.now() / 1000)}`)
      .digest("hex");
  }

  signedUrl(baseUrl, routePath) {
    const url = new URL(`${baseUrl}${routePath}`);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("sig", this.signature());
    return url;
  }

  async requestJson(url, { method = "GET", body, dataApi = false } = {}) {
    const headers = {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    };
    if (body) {
      headers["Content-Type"] = "application/json";
    }
    if (dataApi) {
      headers["x-api-key"] = this.apiKey;
      headers["x-api-gateway-key"] = this.apiKey;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `Conductor request failed with ${response.status}.`);
    }
    return text ? JSON.parse(text) : null;
  }

  async reportingGet(routePath) {
    const data = await this.requestJson(this.signedUrl(REPORTING_API_BASE, routePath));
    if (!Array.isArray(data)) {
      throw new Error("Expected Conductor Reporting API to return a list.");
    }
    return data.filter((item) => item && typeof item === "object");
  }

  async fetchReportingUrl(reportUrl) {
    const url = new URL(reportUrl);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("sig", this.signature());
    const data = await this.requestJson(url);
    if (!Array.isArray(data)) {
      throw new Error("Expected Conductor report URL to return a list.");
    }
    return data.filter((item) => item && typeof item === "object");
  }

  async dataPost(routePath, body) {
    const data = await this.requestJson(this.signedUrl(DATA_API_BASE, routePath), {
      method: "POST",
      body,
      dataApi: true,
    });
    if (!data || typeof data !== "object") {
      throw new Error("Expected Conductor Data API to return an object.");
    }
    return data;
  }

  listAccounts() {
    return this.reportingGet("/v3/accounts");
  }

  listWebProperties(accountId) {
    return this.reportingGet(`/v3/accounts/${accountId}/web-properties`);
  }

  listKeywordGroups(accountId) {
    return this.reportingGet(`/v3/accounts/${accountId}/categories`);
  }

  listTrackedSearches(accountId, webPropertyId) {
    return this.reportingGet(`/v3/accounts/${accountId}/web-properties/${webPropertyId}/tracked-searches`);
  }

  rowsFromDataApi(payload) {
    const schema = Array.isArray(payload.schema) ? payload.schema : [];
    const results = Array.isArray(payload.results) ? payload.results : [];
    const fieldNames = schema.map((field) => field?.name).filter(Boolean);
    return results
      .filter(Array.isArray)
      .map((row) => Object.fromEntries(fieldNames.map((name, index) => [name, row[index]])));
  }

  parseRank(value, fallback = null) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  async fetchCurrentShare(accountId, webPropertyId, keywordGroupId, keywordGroupName, currentDates) {
    const requestBody = {
      account_id: accountId,
      start_date: currentDates.start_date,
      end_date: currentDates.end_date,
      collection_frequency: currentDates.collection_frequency,
      web_property_ids: [Number(webPropertyId)],
      search_engine_names: [DEFAULT_SEARCH_ENGINE],
      devices: [DEFAULT_DEVICE],
      locodes: [DEFAULT_LOCODE],
      keyword_group_breakdown: true,
      result_types: ["STANDARD_LINK"],
      includeMsv: true,
      limit: 5000,
    };

    if (/^\d+$/.test(String(keywordGroupId))) {
      requestBody.keyword_group_ids = [Number(keywordGroupId)];
    } else {
      requestBody.keyword_group_names = [keywordGroupName];
    }

    let response;
    try {
      response = await this.dataPost("/data-api/v1/async/keyword_rankings", requestBody);
    } catch (error) {
      const message = String(error.message || error);
      if (message.includes("Data API 2.0 entitlement")) {
        return {
          currentShare: null,
          shareMessage:
            "Current share is unavailable because this user does not have Data API 2.0 entitlement.",
        };
      }
      return {
        currentShare: null,
        shareMessage: `Current share is unavailable: ${message}`,
      };
    }

    const executionId = response.executionId;
    while (response.executionState === "IN_PROGRESS") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      response = await this.dataPost("/data-api/v1/async/keyword_rankings", { executionId });
    }

    let rows = this.rowsFromDataApi(response);
    let nextPageId = response.nextPageId;
    while (nextPageId) {
      const page = await this.dataPost("/data-api/v1/async/keyword_rankings", {
        executionId,
        nextPageId,
      });
      rows = rows.concat(this.rowsFromDataApi(page));
      nextPageId = page.nextPageId;
    }

    if (!rows.length) {
      return {
        currentShare: null,
        shareMessage: "Current share is unavailable because the Data API returned no rows for this group.",
      };
    }

    const byQuery = new Map();
    for (const row of rows) {
      const query = row.query;
      if (!query) continue;
      const rank = this.parseRank(row.rank_standard);
      const existing = byQuery.get(query);
      const existingRank = this.parseRank(existing?.rank_standard, 999);
      if (!existing || (rank !== null && rank < existingRank)) {
        byQuery.set(query, row);
      }
    }

    let totalMonthlyVolume = 0;
    let estimatedMonthlyClicks = 0;
    for (const row of byQuery.values()) {
      const volume = Number(row.average_search_volume || row.approximate_search_volume || 0);
      const rank = this.parseRank(row.rank_standard);
      totalMonthlyVolume += volume;
      estimatedMonthlyClicks += volume * estimateCtr(rank);
    }

    if (totalMonthlyVolume === 0) {
      return {
        currentShare: 0,
        shareMessage: "Current share is estimated from rank-based CTR modeling.",
      };
    }

    return {
      currentShare: Number(((estimatedMonthlyClicks / totalMonthlyVolume) * 100).toFixed(2)),
      shareMessage: "Current share is estimated from rank-based CTR modeling.",
    };
  }
}

function estimateCtr(rank) {
  if (rank == null) return 0;
  if (CTR_CURVE[rank]) return CTR_CURVE[rank];
  if (rank <= 20) return 0.01;
  return 0;
}

function currentPeriodFromProperty(webProperty) {
  const rankSourceInfo = Array.isArray(webProperty.rankSourceInfo) ? webProperty.rankSourceInfo : [];
  for (const item of rankSourceInfo) {
    const current = item?.reports?.CURRENT || {};
    const startDate = String(current.startDate || "").slice(0, 10);
    const endDate = String(current.endDate || "").slice(0, 10);
    if (startDate && endDate) {
      return {
        start_date: startDate,
        end_date: endDate,
        collection_frequency: "WEEKLY",
      };
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  return { start_date: today, end_date: today, collection_frequency: "WEEKLY" };
}

function currentSearchVolumeReport(webProperty) {
  const rankSourceInfo = Array.isArray(webProperty.rankSourceInfo) ? webProperty.rankSourceInfo : [];
  for (const item of rankSourceInfo) {
    const reportUrl = item?.reports?.CURRENT?.webPropertySearchVolumeReport;
    if (reportUrl) return reportUrl;
  }
  throw new Error("No search volume report URL was available for the selected web property.");
}

function sumRecentVolume(volumeRow) {
  const volumeItems = Array.isArray(volumeRow?.volumeItems) ? volumeRow.volumeItems : [];
  if (volumeItems.length) {
    return volumeItems
      .slice(0, 12)
      .reduce((sum, item) => sum + Number(item?.volume || 0), 0);
  }
  return Number(volumeRow?.averageVolume || 0) * 12;
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

async function serveStatic(response, filename, contentType, sendBody = true) {
  const body = await readFile(path.join(__dirname, filename));
  response.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": body.length,
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  if (sendBody) {
    response.end(body);
  } else {
    response.end();
  }
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

let sessionCredentials = null;

function getClientOrThrow() {
  if (!sessionCredentials?.apiKey || !sessionCredentials?.apiSecret) {
    throw new Error("Connect to Conductor first by entering an API key and secret API key.");
  }
  return new ConductorClient(sessionCredentials.apiKey, sessionCredentials.apiSecret);
}

const pageTypeMetrics = await loadPageTypeMetrics();

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (request.method === "HEAD") {
      if (url.pathname === "/") return await serveStatic(response, "index.html", "text/html; charset=utf-8", false);
      if (url.pathname === "/app.js") return await serveStatic(response, "app.js", "application/javascript; charset=utf-8", false);
      if (url.pathname === "/styles.css") return await serveStatic(response, "styles.css", "text/css; charset=utf-8", false);
      return sendText(response, 404, "Not found");
    }

    if (request.method === "GET" && url.pathname === "/") {
      return await serveStatic(response, "index.html", "text/html; charset=utf-8");
    }
    if (request.method === "GET" && url.pathname === "/app.js") {
      return await serveStatic(response, "app.js", "application/javascript; charset=utf-8");
    }
    if (request.method === "GET" && url.pathname === "/styles.css") {
      return await serveStatic(response, "styles.css", "text/css; charset=utf-8");
    }

    if (request.method === "GET" && url.pathname === "/api/page-type-metrics") {
      return sendJson(response, 200, { pageTypes: pageTypeMetrics });
    }

    if (request.method === "GET" && url.pathname === "/api/connection-status") {
      return sendJson(response, 200, {
        connected: Boolean(sessionCredentials?.apiKey && sessionCredentials?.apiSecret),
      });
    }

    if (request.method === "POST" && url.pathname === "/api/connect") {
      const body = await readJsonBody(request);
      const apiKey = String(body.apiKey || "").trim();
      const apiSecret = String(body.apiSecret || "").trim();
      if (!apiKey || !apiSecret) {
        return sendText(response, 400, "Both API key and secret API key are required.");
      }

      const candidateClient = new ConductorClient(apiKey, apiSecret);
      const accounts = await candidateClient.listAccounts();
      sessionCredentials = { apiKey, apiSecret };
      return sendJson(response, 200, {
        connected: true,
        accountsCount: accounts.filter((account) => account.isActive).length,
      });
    }

    if (request.method !== "GET") {
      return sendText(response, 405, "Method not allowed");
    }

    const client = getClientOrThrow();

    if (url.pathname === "/api/accounts") {
      const accounts = await client.listAccounts();
      const activeAccounts = accounts
        .filter((account) => account.isActive)
        .map((account) => ({ accountId: account.accountId, name: account.name }));
      return sendJson(response, 200, { accounts: activeAccounts });
    }

    const accountWebPropertiesMatch = url.pathname.match(/^\/api\/accounts\/([^/]+)\/web-properties$/);
    if (accountWebPropertiesMatch) {
      const accountId = accountWebPropertiesMatch[1];
      const webProperties = await client.listWebProperties(accountId);
      return sendJson(response, 200, {
        webProperties: webProperties
          .filter((webProperty) => webProperty.isActive)
          .map((webProperty) => ({
            webPropertyId: webProperty.webPropertyId,
            name: webProperty.name,
            currentPeriod: currentPeriodFromProperty(webProperty),
          })),
      });
    }

    const accountKeywordGroupsMatch = url.pathname.match(/^\/api\/accounts\/([^/]+)\/keyword-groups$/);
    if (accountKeywordGroupsMatch) {
      const accountId = accountKeywordGroupsMatch[1];
      const [groups, webProperties] = await Promise.all([
        client.listKeywordGroups(accountId),
        client.listWebProperties(accountId),
      ]);
      const activeTrackedSearchIds = new Set();
      for (const webProperty of webProperties.filter((item) => item?.isActive)) {
        const trackedSearches = await client.listTrackedSearches(accountId, webProperty.webPropertyId);
        for (const trackedSearch of trackedSearches) {
          if (trackedSearch?.isActive && trackedSearch?.trackedSearchId != null) {
            activeTrackedSearchIds.add(String(trackedSearch.trackedSearchId));
          }
        }
      }
      const keywordGroups = groups
        .map((group) => ({
          id: String(group.categoryId || group.keywordGroupId || group.id || group.name),
          name: group.name || "Untitled group",
          trackedSearchIds: Array.isArray(group.trackedSearchIds) ? group.trackedSearchIds : [],
          keywordCount: Array.isArray(group.trackedSearchIds)
            ? group.trackedSearchIds.filter((trackedSearchId) =>
                activeTrackedSearchIds.has(String(trackedSearchId)),
              ).length
            : 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return sendJson(response, 200, { keywordGroups });
    }

    if (url.pathname === "/api/group-summary") {
      const accountId = url.searchParams.get("accountId") || "";
      const webPropertyId = url.searchParams.get("webPropertyId") || "";
      const keywordGroupId = url.searchParams.get("keywordGroupId") || "";
      if (!accountId || !webPropertyId || !keywordGroupId) {
        return sendText(response, 400, "accountId, webPropertyId, and keywordGroupId are required.");
      }

      const [webProperties, groups, trackedSearches] = await Promise.all([
        client.listWebProperties(accountId),
        client.listKeywordGroups(accountId),
        client.listTrackedSearches(accountId, webPropertyId),
      ]);

      const targetProperty = webProperties.find((webProperty) => String(webProperty.webPropertyId) === String(webPropertyId));
      if (!targetProperty) {
        return sendText(response, 404, "The selected web property was not found in Conductor.");
      }

      const targetGroup = groups.find((group) => {
        const id = String(group.categoryId || group.keywordGroupId || group.id || group.name);
        return id === String(keywordGroupId);
      });
      if (!targetGroup) {
        return sendText(response, 404, "The selected keyword group was not found in Conductor.");
      }

      const searchVolumes = await client.fetchReportingUrl(currentSearchVolumeReport(targetProperty));
      const trackedSearchMap = new Map(
        trackedSearches
          .filter((item) => item?.trackedSearchId != null)
          .map((item) => [String(item.trackedSearchId), item]),
      );
      const volumeMap = new Map(
        searchVolumes
          .filter((item) => item?.trackedSearchId != null)
          .map((item) => [String(item.trackedSearchId), item]),
      );

      let annualSearchVolume = 0;
      let activeKeywordCount = 0;
      const keywords = [];
      for (const trackedSearchId of targetGroup.trackedSearchIds || []) {
        const key = String(trackedSearchId);
        const trackedSearch = trackedSearchMap.get(key);
        const volumeRow = volumeMap.get(key) || {};
        const annualVolume = sumRecentVolume(volumeRow);
        annualSearchVolume += annualVolume;
        if (trackedSearch?.isActive) {
          activeKeywordCount += 1;
        }
        keywords.push({
          trackedSearchId: key,
          query: trackedSearch?.queryPhrase || "",
          isActive: Boolean(trackedSearch?.isActive),
          annualSearchVolume: annualVolume,
          averageVolume: Number(volumeRow.averageVolume || 0),
        });
      }

      const shareData = await client.fetchCurrentShare(
        accountId,
        webPropertyId,
        keywordGroupId,
        targetGroup.name || "",
        currentPeriodFromProperty(targetProperty),
      );

      const estimatedCurrentTraffic =
        shareData.currentShare == null ? 0 : Math.round(annualSearchVolume * (shareData.currentShare / 100));

      return sendJson(response, 200, {
        groupId: keywordGroupId,
        groupName: targetGroup.name || "",
        keywordCount: activeKeywordCount,
        totalKeywordCount: Array.isArray(targetGroup.trackedSearchIds) ? targetGroup.trackedSearchIds.length : 0,
        annualSearchVolume: annualSearchVolume,
        currentShare: shareData.currentShare,
        currentShareAvailable: shareData.currentShare != null,
        shareMessage: shareData.shareMessage,
        estimatedCurrentTraffic,
        keywords,
      });
    }

    return sendText(response, 404, "Not found");
  } catch (error) {
    return sendText(response, 500, String(error.message || error));
  }
});

server.listen(APP_PORT, APP_HOST, () => {
  console.log(`Serving SEO Metric Predictor at http://${APP_HOST}:${APP_PORT}`);
});
