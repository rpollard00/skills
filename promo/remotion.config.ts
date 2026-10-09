import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("src/index.ts");
Config.setOverwriteOutput(true);

// System Chromium through a flag-adding wrapper. It only has the new headless
// mode, which Remotion selects with "chrome-for-testing". Remotion runs this
// file from the project root, so the relative path resolves there.
Config.setBrowserExecutable(path.resolve("scripts/chromium.sh"));
Config.setChromeMode("chrome-for-testing");
Config.setChromiumOpenGlRenderer("angle-egl");

// New headless mode only draws the front tab, and Remotion rotates tabs every
// 200 ms. Extra tabs therefore make the render slower, not faster.
Config.setConcurrency(1);

// The default JPEG frames would blur the dither before x264 sees it.
Config.setVideoImageFormat("png");
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setColorSpace("bt709");
Config.setCrf(14);
