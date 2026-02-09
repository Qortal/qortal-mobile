#!/bin/bash
# Monitor Chromecast plugin logs
echo "Monitoring Chromecast logs..."
echo "Press Ctrl+C to stop"
echo "================================"
adb logcat -s ChromecastPlugin:D AndroidRuntime:E CastMediaRouteProvider:I MediaRouteChooserDialog:D *:S


