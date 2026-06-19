#!/bin/sh

# Return the current nginx active connection count.
wget -qO- http://nginx/nginx_status | awk '/Active connections/ { print $3 }'
