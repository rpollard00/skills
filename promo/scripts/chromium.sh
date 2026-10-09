#!/bin/sh
# Remotion has no option for extra Chromium flags, so this wrapper adds them.
# Without these two, every screenshot waits on a 60 Hz vsync and the render
# runs at about half the speed.
exec /usr/lib/chromium/chromium --disable-gpu-vsync --disable-frame-rate-limit "$@"
