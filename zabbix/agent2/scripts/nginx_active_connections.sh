#!/bin/sh

# 현재 active connection 수를 가져오는 스크립트
wget -qO- http://nginx/nginx_status | awk '/Active connections/ { print $3 }'
