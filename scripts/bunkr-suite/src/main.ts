import { initAlreadySeen } from "./features/already-seen";
import { initHoverPreview } from "./features/hover-preview";
import { initCDNReconstructor } from "./features/cdn-reconstructor";
import { initAlbumStats } from "./features/album-stats";
import { log } from "./utils/log";

const { hostname, pathname } = window.location;

if (hostname === "balbums.st") {
  initAlreadySeen();
  initHoverPreview();
  log("Index features active (already-seen, hover-preview)");
} else if (hostname === "bunkr.cr") {
  if (pathname.startsWith("/a/")) {
    initAlreadySeen();
    void initAlbumStats();
    log("Album page features active (already-seen, album-stats)");
  } else if (pathname.startsWith("/v/") || pathname.startsWith("/i/")) {
    initCDNReconstructor();
    log("File page features active (cdn-reconstructor)");
  }
}
