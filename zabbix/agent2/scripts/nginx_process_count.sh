#!/bin/sh

# nginx 프로세스 개수를 세는 스크립트
ps | awk '
    /nginx: master process/ { count++ }
    /nginx: worker process/ { count++ }
    END { print count + 0 }
'
