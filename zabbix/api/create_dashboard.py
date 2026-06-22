#!/usr/bin/env python3
"""
Create the project dashboard through the Zabbix JSON-RPC API.

Environment variables:
  ZABBIX_URL       API endpoint. Default: http://127.0.0.1:8080/api_jsonrpc.php
  ZABBIX_USER      API user. Default: Admin
  ZABBIX_PASSWORD  API password. Default: zabbix
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_API_URL = "http://127.0.0.1:8080/api_jsonrpc.php"
DEFAULT_DASHBOARD_NAME = "Zabbix E2E Web Monitoring"

WIDGET_FIELD_TYPE_INT32 = 0
WIDGET_FIELD_TYPE_STR = 1
WIDGET_FIELD_TYPE_HOST = 3
WIDGET_FIELD_TYPE_ITEM = 4

ZABBIX_SERVER_HOST = "Zabbix server"
NGINX_HOST = "nginx-sample"
MIDIBUS_HOST = "midibus-web"

NGINX_ITEM_KEYS = {
    "active_connections": (
        "system.run[sh /var/lib/zabbix/user_scripts/"
        "nginx_active_connections.sh]"
    ),
    "process_count": (
        "system.run[sh /var/lib/zabbix/user_scripts/nginx_process_count.sh]"
    ),
    "total_requests": (
        "system.run[sh /var/lib/zabbix/user_scripts/nginx_total_requests.sh]"
    ),
}


class ZabbixApiError(RuntimeError):
    pass


class ZabbixApi:
    def __init__(self, url: str, username: str, password: str) -> None:
        self.url = url
        self.username = username
        self.password = password
        self.auth: str | None = None
        self.request_id = 1

    def call(self, method: str, params: Any = None, auth: bool = True) -> Any:
        payload: dict[str, Any] = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params if params is not None else {},
            "id": self.request_id,
        }
        self.request_id += 1

        if auth and self.auth:
            payload["auth"] = self.auth

        data = json.dumps(payload).encode("utf-8")
        request = Request(
            self.url,
            data=data,
            headers={"Content-Type": "application/json-rpc"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=30) as response:
                raw = response.read().decode("utf-8")
        except HTTPError as exc:
            raise ZabbixApiError(f"HTTP {exc.code}: {exc.reason}") from exc
        except URLError as exc:
            raise ZabbixApiError(f"Cannot connect to Zabbix API: {exc.reason}") from exc

        result = json.loads(raw)
        if "error" in result:
            error = result["error"]
            raise ZabbixApiError(
                f"{method} failed: {error.get('message')} - {error.get('data')}"
            )

        return result.get("result")

    def login(self) -> None:
        self.auth = self.call(
            "user.login",
            {"username": self.username, "password": self.password},
            auth=False,
        )

    def logout(self) -> None:
        if self.auth:
            self.call("user.logout", [], auth=True)
            self.auth = None


def resolve_host_ids(api: ZabbixApi) -> dict[str, str]:
    expected_hosts = [ZABBIX_SERVER_HOST, NGINX_HOST, MIDIBUS_HOST]
    hosts = api.call(
        "host.get",
        {
            "output": ["hostid", "host"],
            "filter": {"host": expected_hosts},
        },
    )
    host_ids = {host["host"]: host["hostid"] for host in hosts}
    missing_hosts = [host for host in expected_hosts if host not in host_ids]

    if missing_hosts:
        raise ZabbixApiError(
            "Dashboard hosts not found: "
            f"{', '.join(missing_hosts)}. Import the project Host XML files first."
        )

    return host_ids


def resolve_nginx_item_ids(api: ZabbixApi, nginx_host_id: str) -> dict[str, str]:
    items = api.call(
        "item.get",
        {
            "output": ["itemid", "key_"],
            "hostids": [nginx_host_id],
            "filter": {"key_": list(NGINX_ITEM_KEYS.values())},
        },
    )
    item_ids_by_key = {item["key_"]: item["itemid"] for item in items}
    missing_items = [
        name for name, key in NGINX_ITEM_KEYS.items() if key not in item_ids_by_key
    ]

    if missing_items:
        raise ZabbixApiError(
            "Dashboard nginx Items not found: "
            f"{', '.join(missing_items)}. Import the nginx-sample Host XML first."
        )

    return {
        name: item_ids_by_key[key]
        for name, key in NGINX_ITEM_KEYS.items()
    }


def widget_field(field_type: int, name: str, value: Any) -> dict[str, Any]:
    return {"type": field_type, "name": name, "value": value}


def host_filter(host_id: str) -> list[dict[str, Any]]:
    return [widget_field(WIDGET_FIELD_TYPE_HOST, "hostids.0", host_id)]


def item_graph(
    name: str, item_id: str, x: int, y: int, width: int = 24, height: int = 5
) -> dict[str, Any]:
    return {
        "type": "graph",
        "name": name,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "fields": [
            widget_field(WIDGET_FIELD_TYPE_INT32, "source_type", 1),
            widget_field(WIDGET_FIELD_TYPE_ITEM, "itemid.0", item_id),
        ],
    }


def dashboard_payload(
    name: str,
    host_ids: dict[str, str],
    nginx_item_ids: dict[str, str],
) -> dict[str, Any]:
    return {
        "name": name,
        "private": 0,
        "display_period": 30,
        "auto_start": 0,
        "pages": [
            {
                "name": "Overview",
                "widgets": [
                    {
                        "type": "problems",
                        "name": "Current Problems",
                        "x": 0,
                        "y": 0,
                        "width": 36,
                        "height": 5,
                    },
                    {
                        "type": "web",
                        "name": "Web Scenario Status",
                        "x": 36,
                        "y": 0,
                        "width": 36,
                        "height": 5,
                    },
                    {
                        "type": "hostavail",
                        "name": "Host Availability",
                        "x": 0,
                        "y": 5,
                        "width": 40,
                        "height": 5,
                    },
                    {
                        "type": "actionlog",
                        "name": "Alert Action Log",
                        "x": 40,
                        "y": 5,
                        "width": 32,
                        "height": 5,
                    },
                    {
                        "type": "problemsbysv",
                        "name": "Problems by Severity",
                        "x": 0,
                        "y": 10,
                        "width": 72,
                        "height": 4,
                    },
                ],
            },
            {
                "name": "Browser Items",
                "widgets": [
                    {
                        "type": "problems",
                        "name": "Browser Item Problems",
                        "x": 0,
                        "y": 0,
                        "width": 72,
                        "height": 5,
                        "fields": host_filter(host_ids[MIDIBUS_HOST]),
                    },
                    {
                        "type": "actionlog",
                        "name": "Browser Alert Action Log",
                        "x": 0,
                        "y": 5,
                        "width": 72,
                        "height": 4,
                    },
                ],
            },
            {
                "name": "Web Scenario",
                "widgets": [
                    {
                        "type": "web",
                        "name": "Web Scenario Status",
                        "x": 0,
                        "y": 0,
                        "width": 72,
                        "height": 5,
                        "fields": host_filter(host_ids[ZABBIX_SERVER_HOST]),
                    },
                    {
                        "type": "problems",
                        "name": "Web Scenario Problems",
                        "x": 0,
                        "y": 5,
                        "width": 72,
                        "height": 5,
                        "fields": [
                            *host_filter(host_ids[ZABBIX_SERVER_HOST]),
                            widget_field(
                                WIDGET_FIELD_TYPE_STR,
                                "problem",
                                "Nginx",
                            ),
                        ],
                    },
                    {
                        "type": "actionlog",
                        "name": "Web Scenario Alert Action Log",
                        "x": 0,
                        "y": 10,
                        "width": 72,
                        "height": 4,
                    },
                ],
            },
            {
                "name": "nginx System",
                "widgets": [
                    {
                        "type": "itemhistory",
                        "name": "nginx Latest Metrics",
                        "x": 0,
                        "y": 0,
                        "width": 72,
                        "height": 5,
                        "fields": [
                            widget_field(
                                WIDGET_FIELD_TYPE_INT32,
                                "show_timestamp",
                                1,
                            ),
                            widget_field(
                                WIDGET_FIELD_TYPE_STR,
                                "columns.0.name",
                                "Active connections",
                            ),
                            widget_field(
                                WIDGET_FIELD_TYPE_ITEM,
                                "columns.0.itemid",
                                nginx_item_ids["active_connections"],
                            ),
                            widget_field(
                                WIDGET_FIELD_TYPE_STR,
                                "columns.1.name",
                                "Process count",
                            ),
                            widget_field(
                                WIDGET_FIELD_TYPE_ITEM,
                                "columns.1.itemid",
                                nginx_item_ids["process_count"],
                            ),
                            widget_field(
                                WIDGET_FIELD_TYPE_STR,
                                "columns.2.name",
                                "Total requests",
                            ),
                            widget_field(
                                WIDGET_FIELD_TYPE_ITEM,
                                "columns.2.itemid",
                                nginx_item_ids["total_requests"],
                            ),
                        ],
                    },
                    item_graph(
                        "Active Connections",
                        nginx_item_ids["active_connections"],
                        0,
                        5,
                    ),
                    item_graph(
                        "Process Count",
                        nginx_item_ids["process_count"],
                        24,
                        5,
                    ),
                    item_graph(
                        "Total Requests",
                        nginx_item_ids["total_requests"],
                        48,
                        5,
                    ),
                    {
                        "type": "problems",
                        "name": "nginx Internal Problems",
                        "x": 0,
                        "y": 10,
                        "width": 72,
                        "height": 5,
                        "fields": host_filter(host_ids[NGINX_HOST]),
                    },
                    {
                        "type": "actionlog",
                        "name": "nginx Alert Action Log",
                        "x": 0,
                        "y": 15,
                        "width": 72,
                        "height": 4,
                    },
                ],
            },
        ],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create the Zabbix E2E monitoring dashboard."
    )
    parser.add_argument(
        "--url",
        default=os.getenv("ZABBIX_URL", DEFAULT_API_URL),
        help=f"Zabbix API endpoint. Default: {DEFAULT_API_URL}",
    )
    parser.add_argument(
        "--user",
        default=os.getenv("ZABBIX_USER", "Admin"),
        help="Zabbix API user. Default: Admin",
    )
    parser.add_argument(
        "--password",
        default=os.getenv("ZABBIX_PASSWORD", "zabbix"),
        help="Zabbix API password. Default: zabbix",
    )
    parser.add_argument(
        "--name",
        default=os.getenv("ZABBIX_DASHBOARD_NAME", DEFAULT_DASHBOARD_NAME),
        help=f"Dashboard name. Default: {DEFAULT_DASHBOARD_NAME}",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Delete an existing dashboard with the same name before creating it.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the dashboard.create payload without calling the API.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.dry_run:
        payload = dashboard_payload(
            args.name,
            {
                ZABBIX_SERVER_HOST: "<ZABBIX_SERVER_HOST_ID>",
                NGINX_HOST: "<NGINX_HOST_ID>",
                MIDIBUS_HOST: "<MIDIBUS_HOST_ID>",
            },
            {
                "active_connections": "<NGINX_ACTIVE_CONNECTIONS_ITEM_ID>",
                "process_count": "<NGINX_PROCESS_COUNT_ITEM_ID>",
                "total_requests": "<NGINX_TOTAL_REQUESTS_ITEM_ID>",
            },
        )
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    api = ZabbixApi(args.url, args.user, args.password)

    try:
        api.login()
        host_ids = resolve_host_ids(api)
        nginx_item_ids = resolve_nginx_item_ids(api, host_ids[NGINX_HOST])
        payload = dashboard_payload(args.name, host_ids, nginx_item_ids)

        existing = api.call(
            "dashboard.get",
            {
                "output": ["dashboardid", "name"],
                "filter": {"name": args.name},
            },
        )

        if existing:
            dashboard_ids = [dashboard["dashboardid"] for dashboard in existing]
            if not args.replace:
                print(
                    f"Dashboard already exists: {args.name} "
                    f"(dashboardid={', '.join(dashboard_ids)})"
                )
                return 0

            api.call("dashboard.delete", dashboard_ids)
            print(f"Deleted existing dashboard: {args.name}")

        result = api.call("dashboard.create", payload)
        dashboard_ids = ", ".join(result["dashboardids"])
        print(f"Created dashboard: {args.name} (dashboardid={dashboard_ids})")
        return 0
    except ZabbixApiError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        print(
            "Check ZABBIX_URL, ZABBIX_USER, ZABBIX_PASSWORD, and whether the "
            "Zabbix Web UI is reachable.",
            file=sys.stderr,
        )
        return 1
    finally:
        try:
            api.logout()
        except ZabbixApiError:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
