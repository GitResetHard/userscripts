import { initPanel, togglePanel } from "./ui/panel";
import { log } from "./utils/log";

initPanel();

GM_registerMenuCommand("Reddit Cleaner — Open / Close", togglePanel);

log("Initialized");
