#!/bin/sh

# nginx 누적 요청 수를 가져오는 스크립트
wget -qO- http://nginx/nginx_status | awk 'NR == 3 { print $3 }'
