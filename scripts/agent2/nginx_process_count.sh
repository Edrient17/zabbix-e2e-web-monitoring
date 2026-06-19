#!/bin/sh

# Return the number of nginx master and worker processes.
ps | awk '
    /nginx: master process/ { count++ }
    /nginx: worker process/ { count++ }
    END { print count + 0 }
'
