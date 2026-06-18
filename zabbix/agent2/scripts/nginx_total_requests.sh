#!/bin/sh

# Return the nginx cumulative request count.
wget -qO- http://nginx/nginx_status | awk 'NR == 3 { print $3 }'
