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


def dashboard_payload(name: str) -> dict[str, Any]:
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
    payload = dashboard_payload(args.name)

    if args.dry_run:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    api = ZabbixApi(args.url, args.user, args.password)

    try:
        api.login()

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
