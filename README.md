# apisync

## Install

* Install nodejs (depending on OS, lots of manuals in Internet)
* git pull https://github.com/akve/apisync.git
* run manually "node index.js" to see if it works, and how much time it takes to process everything
* put in cron hourly 

## Notes

1. As Docebo does not have any hooks and no way to understand what's changed, we always pull all data and sync it. This takes more time, but it's the only way. 

2. All fields are now "string" ones, need more work to safely convert from Docebo time/numbers to Autopilot ones. 

3. Please do not modify the synced fields in Autopilot, rather add new ones - changes will be overwritten by sync

4. Current implementation is limited to 100 courses for every person. If this is not enough - let us know. 