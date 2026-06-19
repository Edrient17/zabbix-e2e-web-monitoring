#!/bin/sh
set -eu

MODE="${1:-help}"
ENV_FILE="${ENV_FILE:-.env}"
AUTH_HEADER="${NGINX_BASIC_AUTH_HEADER:-}"

COUNT="${COUNT:-60}"
CONCURRENCY="${CONCURRENCY:-20}"
TARGET_PATH="${TARGET_PATH:-/status}"
DURATION="${DURATION:-90}"

load_auth_header() {
    if [ -z "$AUTH_HEADER" ] && [ -f "$ENV_FILE" ]; then
        AUTH_HEADER="$(sed -n 's/^NGINX_BASIC_AUTH_HEADER=//p' "$ENV_FILE" | tail -n 1 | tr -d '\r')"
    fi

    if [ -z "$AUTH_HEADER" ]; then
        echo "NGINX_BASIC_AUTH_HEADER is required. Set it in .env or export it for this command." >&2
        exit 1
    fi
}

show_usage() {
    cat <<'EOF'
Usage:
  sh scripts/nginx_load_test.sh status
  COUNT=300 CONCURRENCY=20 TARGET_PATH=/status sh scripts/nginx_load_test.sh requests
  COUNT=60 DURATION=90 sh scripts/nginx_load_test.sh active

Modes:
  status    Print nginx active connections, total requests, and process count.
  requests  Generate short authenticated requests to test total request growth.
  active    Hold many authenticated /load-slow requests to test active connections.

Environment:
  NGINX_BASIC_AUTH_HEADER  Base64 "user:password" value. Read from .env by default.
  ENV_FILE                 Env file path. Default: .env
  COUNT                    Request count. Default: 60
  CONCURRENCY              Concurrent batch size for requests mode. Default: 20
  TARGET_PATH              Target path for requests mode. Default: /status
  DURATION                 Seconds to keep active mode running. Default: 90
EOF
}

show_status() {
    printf 'active_connections='
    docker exec nginx-agent2 sh /var/lib/zabbix/user_scripts/nginx_active_connections.sh
    printf 'total_requests='
    docker exec nginx-agent2 sh /var/lib/zabbix/user_scripts/nginx_total_requests.sh
    printf 'process_count='
    docker exec nginx-agent2 sh /var/lib/zabbix/user_scripts/nginx_process_count.sh
}

run_requests() {
    load_auth_header

    echo "Before:"
    show_status

    docker exec \
        -e AUTH_HEADER="$AUTH_HEADER" \
        -e COUNT="$COUNT" \
        -e CONCURRENCY="$CONCURRENCY" \
        -e TARGET_PATH="$TARGET_PATH" \
        zabbix-server sh -c '
            i=1
            while [ "$i" -le "$COUNT" ]; do
                batch=0
                while [ "$batch" -lt "$CONCURRENCY" ] && [ "$i" -le "$COUNT" ]; do
                    wget -qO- --header "Authorization: Basic $AUTH_HEADER" "http://nginx$TARGET_PATH" >/dev/null &
                    batch=$((batch + 1))
                    i=$((i + 1))
                done
                wait
            done
        '

    echo "After:"
    show_status
}

run_active() {
    load_auth_header

    echo "Before:"
    show_status

    docker exec \
        -e AUTH_HEADER="$AUTH_HEADER" \
        -e COUNT="$COUNT" \
        -e DURATION="$DURATION" \
        zabbix-server sh -c '
            pids=""
            i=1
            while [ "$i" -le "$COUNT" ]; do
                wget -qO- --header "Authorization: Basic $AUTH_HEADER" http://nginx/load-slow >/dev/null &
                pids="$pids $!"
                i=$((i + 1))
            done
            sleep "$DURATION"
            for pid in $pids; do
                kill "$pid" 2>/dev/null || true
            done
            wait 2>/dev/null || true
        '

    echo "After:"
    show_status
}

case "$MODE" in
    status)
        show_status
        ;;
    requests)
        run_requests
        ;;
    active)
        run_active
        ;;
    help|-h|--help)
        show_usage
        ;;
    *)
        echo "Unknown mode: $MODE" >&2
        show_usage >&2
        exit 1
        ;;
esac
