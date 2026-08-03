from __future__ import annotations

import csv
import hashlib
import json
import os
import re
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen


APP_HOST = os.environ.get("HOST", "127.0.0.1")
APP_PORT = int(os.environ.get("PORT", "8000"))
REPORTING_API_BASE = "https://api.conductor.com"
DATA_API_BASE = "https://api-universal.conductor.com"
DEFAULT_SEARCH_ENGINE = "GOOGLE_en_US"
DEFAULT_DEVICE = "SMARTPHONE"
DEFAULT_LOCODE = "US"
CTR_CURVE = {
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
}

BASE_DIR = Path(__file__).resolve().parent
PAGE_TYPE_FILES = [
    {"id": "plp", "name": "PLP", "file": BASE_DIR / "benchmarks" / "PLP Metrics.csv"},
    {"id": "home", "name": "Homepage", "file": BASE_DIR / "benchmarks" / "Homepage Metrics.csv"},
    {"id": "pdp", "name": "PDP", "file": BASE_DIR / "benchmarks" / "PDP Metrics.csv"},
    {"id": "brands", "name": "Brands", "file": BASE_DIR / "benchmarks" / "Brands Metrics.csv"},
    {"id": "ugc", "name": "UGC", "file": BASE_DIR / "benchmarks" / "UGC Metrics.csv"},
    {"id": "deals", "name": "Deals", "file": BASE_DIR / "benchmarks" / "Deals Metrics.csv"},
    {"id": "hvsp", "name": "HVSP", "file": BASE_DIR / "benchmarks" / "HVSP Metrics.csv"},
    {"id": "shelters", "name": "Shelters", "file": BASE_DIR / "benchmarks" / "Shelters Metrics.csv"},
    {"id": "superlative", "name": "Superlative", "file": BASE_DIR / "benchmarks" / "Superlative Metrics.csv"},
    {"id": "education", "name": "Education", "file": BASE_DIR / "benchmarks" / "Education Metrics.csv"},
    {"id": "facet", "name": "Facet", "file": BASE_DIR / "benchmarks" / "Facet Metrics.csv"},
]

SESSION_CREDENTIALS: dict[str, str] | None = None


def parse_metric_value(raw_value: str) -> dict[str, object]:
    trimmed = str(raw_value or "").strip()
    if not trimmed:
        return {"value": 0, "unit": "number", "display": trimmed}
    if "%" in trimmed:
        return {
            "value": float(re.sub(r"[%,$]", "", trimmed) or 0),
            "unit": "%",
            "display": trimmed,
        }
    if "$" in trimmed:
        return {
            "value": float(re.sub(r"[$,]", "", trimmed) or 0),
            "unit": "$",
            "display": trimmed,
        }
    return {
        "value": float(trimmed.replace(",", "") or 0),
        "unit": "number",
        "display": trimmed,
    }


def load_page_type_metrics() -> list[dict[str, object]]:
    page_types: list[dict[str, object]] = []
    for config in PAGE_TYPE_FILES:
        metrics: dict[str, dict[str, object]] = {}
        with config["file"].open("r", encoding="utf-8-sig", newline="") as handle:
            rows = [row for row in csv.reader(handle) if row]
        for row in rows[1:]:
            _, kpi, stats = row[:3]
            parsed = parse_metric_value(stats)
            if kpi == "Click through rate":
                parsed["value"] = float(parsed["value"]) + 0.5
                parsed["display"] = f'{float(parsed["value"]):.2f}%'
            metrics[kpi] = {
                "name": kpi,
                "value": parsed["value"],
                "unit": parsed["unit"],
                "display": parsed["display"],
            }
        page_types.append(
            {
                "id": config["id"],
                "name": config["name"],
                "metrics": metrics,
                "impactWeight": metrics.get("IMPRESSIONS", {}).get("value", 1),
                "shareGainMultiplier": 1,
            }
        )
    return page_types


PAGE_TYPE_METRICS = load_page_type_metrics()


class ConductorClient:
    def __init__(self, api_key: str, api_secret: str) -> None:
        self.api_key = api_key
        self.api_secret = api_secret

    def signature(self) -> str:
        payload = f"{self.api_key}{self.api_secret}{int(time.time())}"
        return hashlib.md5(payload.encode("utf-8")).hexdigest()

    def signed_url(self, base_url: str, route_path: str) -> str:
        separator = "&" if "?" in route_path else "?"
        return f"{base_url}{route_path}{separator}{urlencode({'apiKey': self.api_key, 'sig': self.signature()})}"

    def request_json(self, url: str, *, method: str = "GET", body: dict | None = None, data_api: bool = False):
        headers = {
            "Accept": "application/json",
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
            ),
        }
        payload = None
        if body is not None:
            payload = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if data_api:
            headers["x-api-key"] = self.api_key
            headers["x-api-gateway-key"] = self.api_key

        request = Request(url, data=payload, headers=headers, method=method)
        try:
            with urlopen(request) as response:
                text = response.read().decode("utf-8")
        except HTTPError as error:
            message = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(message or f"Conductor request failed with {error.code}.") from error
        except URLError as error:
            raise RuntimeError(str(error.reason or error)) from error

        return json.loads(text) if text else None

    def reporting_get(self, route_path: str) -> list[dict[str, object]]:
        data = self.request_json(self.signed_url(REPORTING_API_BASE, route_path))
        if not isinstance(data, list):
            raise RuntimeError("Expected Conductor Reporting API to return a list.")
        return [item for item in data if isinstance(item, dict)]

    def fetch_reporting_url(self, report_url: str) -> list[dict[str, object]]:
        parsed = urlparse(report_url)
        query = parse_qs(parsed.query)
        query["apiKey"] = [self.api_key]
        query["sig"] = [self.signature()]
        url = parsed._replace(query=urlencode(query, doseq=True)).geturl()
        data = self.request_json(url)
        if not isinstance(data, list):
            raise RuntimeError("Expected Conductor report URL to return a list.")
        return [item for item in data if isinstance(item, dict)]

    def data_post(self, route_path: str, body: dict) -> dict[str, object]:
        data = self.request_json(self.signed_url(DATA_API_BASE, route_path), method="POST", body=body, data_api=True)
        if not isinstance(data, dict):
            raise RuntimeError("Expected Conductor Data API to return an object.")
        return data

    def list_accounts(self):
        return self.reporting_get("/v3/accounts")

    def list_web_properties(self, account_id: str):
        return self.reporting_get(f"/v3/accounts/{account_id}/web-properties")

    def list_keyword_groups(self, account_id: str):
        return self.reporting_get(f"/v3/accounts/{account_id}/categories")

    def list_tracked_searches(self, account_id: str, web_property_id: str):
        return self.reporting_get(f"/v3/accounts/{account_id}/web-properties/{web_property_id}/tracked-searches")

    @staticmethod
    def rows_from_data_api(payload: dict[str, object]) -> list[dict[str, object]]:
        schema = payload.get("schema") if isinstance(payload.get("schema"), list) else []
        results = payload.get("results") if isinstance(payload.get("results"), list) else []
        field_names = [field.get("name") for field in schema if isinstance(field, dict) and field.get("name")]
        rows: list[dict[str, object]] = []
        for row in results:
            if not isinstance(row, list):
                continue
            rows.append({field_names[index]: row[index] for index in range(min(len(field_names), len(row)))})
        return rows

    @staticmethod
    def parse_rank(value, fallback=None):
        try:
            return int(value)
        except (TypeError, ValueError):
            return fallback

    def fetch_current_share(self, account_id: str, web_property_id: str, keyword_group_id: str, keyword_group_name: str, current_dates: dict[str, str]):
        request_body: dict[str, object] = {
            "account_id": account_id,
            "start_date": current_dates["start_date"],
            "end_date": current_dates["end_date"],
            "collection_frequency": current_dates["collection_frequency"],
            "web_property_ids": [int(web_property_id)],
            "search_engine_names": [DEFAULT_SEARCH_ENGINE],
            "devices": [DEFAULT_DEVICE],
            "locodes": [DEFAULT_LOCODE],
            "keyword_group_breakdown": True,
            "result_types": ["STANDARD_LINK"],
            "includeMsv": True,
            "limit": 5000,
        }
        if str(keyword_group_id).isdigit():
            request_body["keyword_group_ids"] = [int(keyword_group_id)]
        else:
            request_body["keyword_group_names"] = [keyword_group_name]

        try:
            response = self.data_post("/data-api/v1/async/keyword_rankings", request_body)
        except RuntimeError as error:
            message = str(error)
            if "Data API 2.0 entitlement" in message:
                return {
                    "currentShare": None,
                    "shareMessage": "Current share is unavailable because this user does not have Data API 2.0 entitlement.",
                }
            return {"currentShare": None, "shareMessage": f"Current share is unavailable: {message}"}

        execution_id = response.get("executionId")
        while response.get("executionState") == "IN_PROGRESS":
            time.sleep(2)
            response = self.data_post("/data-api/v1/async/keyword_rankings", {"executionId": execution_id})

        rows = self.rows_from_data_api(response)
        next_page_id = response.get("nextPageId")
        while next_page_id:
            page = self.data_post("/data-api/v1/async/keyword_rankings", {"executionId": execution_id, "nextPageId": next_page_id})
            rows.extend(self.rows_from_data_api(page))
            next_page_id = page.get("nextPageId")

        if not rows:
            return {
                "currentShare": None,
                "shareMessage": "Current share is unavailable because the Data API returned no rows for this group.",
            }

        by_query: dict[str, dict[str, object]] = {}
        for row in rows:
            query = row.get("query")
            if not query:
                continue
            rank = self.parse_rank(row.get("rank_standard"))
            existing = by_query.get(str(query))
            existing_rank = self.parse_rank(existing.get("rank_standard") if existing else None, 999)
            if existing is None or (rank is not None and rank < existing_rank):
                by_query[str(query)] = row

        total_monthly_volume = 0.0
        estimated_monthly_clicks = 0.0
        for row in by_query.values():
            volume = float(row.get("average_search_volume") or row.get("approximate_search_volume") or 0)
            rank = self.parse_rank(row.get("rank_standard"))
            total_monthly_volume += volume
            estimated_monthly_clicks += volume * estimate_ctr(rank)

        if total_monthly_volume == 0:
            return {"currentShare": 0, "shareMessage": "Current share is estimated from rank-based CTR modeling."}

        return {
            "currentShare": round((estimated_monthly_clicks / total_monthly_volume) * 100, 2),
            "shareMessage": "Current share is estimated from rank-based CTR modeling.",
        }


def estimate_ctr(rank):
    if rank is None:
        return 0
    if rank in CTR_CURVE:
        return CTR_CURVE[rank]
    if rank <= 20:
        return 0.01
    return 0


def current_period_from_property(web_property: dict[str, object]) -> dict[str, str]:
    for item in web_property.get("rankSourceInfo", []) if isinstance(web_property.get("rankSourceInfo"), list) else []:
        current = item.get("reports", {}).get("CURRENT", {}) if isinstance(item, dict) else {}
        start_date = str(current.get("startDate", ""))[:10]
        end_date = str(current.get("endDate", ""))[:10]
        if start_date and end_date:
            return {"start_date": start_date, "end_date": end_date, "collection_frequency": "WEEKLY"}
    today = time.strftime("%Y-%m-%d")
    return {"start_date": today, "end_date": today, "collection_frequency": "WEEKLY"}


def current_search_volume_report(web_property: dict[str, object]) -> str:
    for item in web_property.get("rankSourceInfo", []) if isinstance(web_property.get("rankSourceInfo"), list) else []:
        report_url = item.get("reports", {}).get("CURRENT", {}).get("webPropertySearchVolumeReport") if isinstance(item, dict) else None
        if report_url:
            return report_url
    raise RuntimeError("No search volume report URL was available for the selected web property.")


def sum_recent_volume(volume_row: dict[str, object]) -> float:
    volume_items = volume_row.get("volumeItems") if isinstance(volume_row.get("volumeItems"), list) else []
    if volume_items:
        return sum(float(item.get("volume") or 0) for item in volume_items[:12] if isinstance(item, dict))
    return float(volume_row.get("averageVolume") or 0) * 12


def get_client_or_throw() -> ConductorClient:
    if not SESSION_CREDENTIALS or not SESSION_CREDENTIALS.get("apiKey") or not SESSION_CREDENTIALS.get("apiSecret"):
        raise RuntimeError("Connect to Conductor first by entering an API key and secret API key.")
    return ConductorClient(SESSION_CREDENTIALS["apiKey"], SESSION_CREDENTIALS["apiSecret"])


class Handler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_json(self, status: int, payload: dict | list):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_text(self, status: int, body: str):
        data = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def serve_static(self, filename: str, content_type: str):
        body = (BASE_DIR / filename).read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        raw = self.rfile.read(length).decode("utf-8") if length else ""
        if not raw:
            return {}
        try:
            return json.loads(raw)
        except json.JSONDecodeError as error:
            raise RuntimeError("Request body must be valid JSON.") from error

    def do_HEAD(self):
        routes = {
            "/": ("index.html", "text/html; charset=utf-8"),
            "/app.js": ("app.js", "application/javascript; charset=utf-8"),
            "/styles.css": ("styles.css", "text/css; charset=utf-8"),
            "/fallback-page-types.js": ("fallback-page-types.js", "application/javascript; charset=utf-8"),
        }
        if self.path in routes:
            filename, content_type = routes[self.path]
            body = (BASE_DIR / filename).read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return
        self.send_text(404, "Not found")

    def do_GET(self):
        try:
            self.handle_get()
        except Exception as error:  # noqa: BLE001
            self.send_text(500, str(error))

    def do_POST(self):
        try:
            self.handle_post()
        except Exception as error:  # noqa: BLE001
            self.send_text(500, str(error))

    def handle_get(self):
        parsed = urlparse(self.path)
        routes = {
            "/": ("index.html", "text/html; charset=utf-8"),
            "/app.js": ("app.js", "application/javascript; charset=utf-8"),
            "/styles.css": ("styles.css", "text/css; charset=utf-8"),
            "/fallback-page-types.js": ("fallback-page-types.js", "application/javascript; charset=utf-8"),
        }
        if parsed.path in routes:
            filename, content_type = routes[parsed.path]
            self.serve_static(filename, content_type)
            return

        if parsed.path == "/api/page-type-metrics":
            self.send_json(200, {"pageTypes": PAGE_TYPE_METRICS})
            return

        if parsed.path == "/api/connection-status":
            self.send_json(200, {"connected": bool(SESSION_CREDENTIALS and SESSION_CREDENTIALS.get("apiKey") and SESSION_CREDENTIALS.get("apiSecret"))})
            return

        client = get_client_or_throw()
        params = parse_qs(parsed.query)

        if parsed.path == "/api/accounts":
            accounts = client.list_accounts()
            active_accounts = [{"accountId": item["accountId"], "name": item["name"]} for item in accounts if item.get("isActive")]
            self.send_json(200, {"accounts": active_accounts})
            return

        match = re.match(r"^/api/accounts/([^/]+)/web-properties$", parsed.path)
        if match:
            account_id = match.group(1)
            web_properties = client.list_web_properties(account_id)
            payload = {
                "webProperties": [
                    {
                        "webPropertyId": item["webPropertyId"],
                        "name": item["name"],
                        "currentPeriod": current_period_from_property(item),
                    }
                    for item in web_properties
                    if item.get("isActive")
                ]
            }
            self.send_json(200, payload)
            return

        match = re.match(r"^/api/accounts/([^/]+)/keyword-groups$", parsed.path)
        if match:
            account_id = match.group(1)
            groups = client.list_keyword_groups(account_id)
            web_properties = client.list_web_properties(account_id)
            active_tracked_search_ids: set[str] = set()
            for web_property in [item for item in web_properties if item.get("isActive")]:
                tracked_searches = client.list_tracked_searches(account_id, str(web_property["webPropertyId"]))
                for tracked_search in tracked_searches:
                    if tracked_search.get("isActive") and tracked_search.get("trackedSearchId") is not None:
                        active_tracked_search_ids.add(str(tracked_search["trackedSearchId"]))

            keyword_groups = []
            for group in groups:
                tracked_ids = group.get("trackedSearchIds") if isinstance(group.get("trackedSearchIds"), list) else []
                keyword_groups.append(
                    {
                        "id": str(group.get("categoryId") or group.get("keywordGroupId") or group.get("id") or group.get("name")),
                        "name": group.get("name") or "Untitled group",
                        "trackedSearchIds": tracked_ids,
                        "keywordCount": len([tracked_id for tracked_id in tracked_ids if str(tracked_id) in active_tracked_search_ids]),
                    }
                )
            keyword_groups.sort(key=lambda item: item["name"])
            self.send_json(200, {"keywordGroups": keyword_groups})
            return

        if parsed.path == "/api/group-summary":
            account_id = (params.get("accountId") or [""])[0]
            web_property_id = (params.get("webPropertyId") or [""])[0]
            keyword_group_id = (params.get("keywordGroupId") or [""])[0]
            if not account_id or not web_property_id or not keyword_group_id:
                self.send_text(400, "accountId, webPropertyId, and keywordGroupId are required.")
                return

            web_properties = client.list_web_properties(account_id)
            groups = client.list_keyword_groups(account_id)
            tracked_searches = client.list_tracked_searches(account_id, web_property_id)

            target_property = next((item for item in web_properties if str(item.get("webPropertyId")) == str(web_property_id)), None)
            if not target_property:
                self.send_text(404, "The selected web property was not found in Conductor.")
                return

            target_group = next(
                (
                    item
                    for item in groups
                    if str(item.get("categoryId") or item.get("keywordGroupId") or item.get("id") or item.get("name")) == str(keyword_group_id)
                ),
                None,
            )
            if not target_group:
                self.send_text(404, "The selected keyword group was not found in Conductor.")
                return

            search_volumes = client.fetch_reporting_url(current_search_volume_report(target_property))
            tracked_search_map = {
                str(item["trackedSearchId"]): item
                for item in tracked_searches
                if item.get("trackedSearchId") is not None
            }
            volume_map = {
                str(item["trackedSearchId"]): item
                for item in search_volumes
                if item.get("trackedSearchId") is not None
            }

            annual_search_volume = 0.0
            active_keyword_count = 0
            keywords = []
            for tracked_search_id in target_group.get("trackedSearchIds") or []:
                key = str(tracked_search_id)
                tracked_search = tracked_search_map.get(key, {})
                volume_row = volume_map.get(key, {})
                annual_volume = sum_recent_volume(volume_row)
                annual_search_volume += annual_volume
                if tracked_search.get("isActive"):
                    active_keyword_count += 1
                keywords.append(
                    {
                        "trackedSearchId": key,
                        "query": tracked_search.get("queryPhrase", ""),
                        "isActive": bool(tracked_search.get("isActive")),
                        "annualSearchVolume": annual_volume,
                        "averageVolume": float(volume_row.get("averageVolume") or 0),
                    }
                )

            share_data = client.fetch_current_share(
                account_id,
                web_property_id,
                keyword_group_id,
                target_group.get("name", ""),
                current_period_from_property(target_property),
            )

            estimated_current_traffic = 0 if share_data["currentShare"] is None else round(annual_search_volume * (share_data["currentShare"] / 100))
            self.send_json(
                200,
                {
                    "groupId": keyword_group_id,
                    "groupName": target_group.get("name", ""),
                    "keywordCount": active_keyword_count,
                    "totalKeywordCount": len(target_group.get("trackedSearchIds") or []),
                    "annualSearchVolume": annual_search_volume,
                    "currentShare": share_data["currentShare"],
                    "currentShareAvailable": share_data["currentShare"] is not None,
                    "shareMessage": share_data["shareMessage"],
                    "estimatedCurrentTraffic": estimated_current_traffic,
                    "keywords": keywords,
                },
            )
            return

        self.send_text(404, "Not found")

    def handle_post(self):
        global SESSION_CREDENTIALS
        parsed = urlparse(self.path)
        if parsed.path != "/api/connect":
            self.send_text(405, "Method not allowed")
            return
        body = self.read_json_body()
        api_key = str(body.get("apiKey", "")).strip()
        api_secret = str(body.get("apiSecret", "")).strip()
        if not api_key or not api_secret:
            self.send_text(400, "Both API key and secret API key are required.")
            return
        candidate_client = ConductorClient(api_key, api_secret)
        accounts = candidate_client.list_accounts()
        SESSION_CREDENTIALS = {"apiKey": api_key, "apiSecret": api_secret}
        self.send_json(200, {"connected": True, "accountsCount": len([item for item in accounts if item.get("isActive")])})


if __name__ == "__main__":
    httpd = ThreadingHTTPServer((APP_HOST, APP_PORT), Handler)
    print(f"Serving SEO Metric Predictor at http://{APP_HOST}:{APP_PORT}")
    httpd.serve_forever()
