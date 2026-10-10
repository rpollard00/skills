// Browser only. Import this file from every Remotion entry. It loads the two
// bundled fonts from files inside the bundle and holds the render until both
// are ready. A font that fails to load stops the render: no frame can show a
// fallback font.

import displayUrl from "@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2";
import monoUrl from "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2";
import { cancelRender, continueRender, delayRender } from "remotion";
import { TYPE } from "./theme";

const FACES = [
  new FontFace(TYPE.display.family, `url(${displayUrl}) format("woff2")`, { weight: "100 900", stretch: "62% 125%" }),
  new FontFace(TYPE.mono.family, `url(${monoUrl}) format("woff2")`, { weight: "100 800" }),
];

const handle = delayRender("Loading the bundled fonts");

Promise.all(FACES.map((face) => face.load()))
  .then((loaded) => {
    for (const face of loaded) document.fonts.add(face);
    continueRender(handle);
  })
  .catch((error: unknown) => {
    cancelRender(error);
  });
