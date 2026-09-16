/**
 * Already-Seen Deduplication
 *
 * balbums.st  — dims album cards you have already opened and shows a "Seen"
 *               badge. Tracks clicks so the badge appears immediately.
 * bunkr.cr/a/ — marks the current album as visited when the page loads so
 *               the badge will appear next time it shows up on balbums.st.
 *
 * A menu command lets the user wipe the entire history.
 */

import { observeAdded } from "../dom/observer";
import {
  addVisitedAlbum,
  clearVisitedAlbums,
  getVisitedAlbums,
} from "../services/storage";
import { config } from "../config";
import { log } from "../utils/log";

const TRACKED_ATTR = "data-bks-tracked";
const SEEN_CLASS = "bks-seen";

const STYLES = `
.${SEEN_CLASS} {
  opacity: ${config.alreadySeen.dimOpacity} !important;
  transition: opacity 0.3s ease;
}
.${SEEN_CLASS}:hover {
  opacity: 0.75 !important;
}
.bks-seen-badge {
  position: absolute;
  top: 7px;
  right: 7px;
  background: rgba(10, 10, 11, 0.78);
  color: #5e5e6b;
  font-size: 9px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 3px 7px;
  border-radius: 4px;
  z-index: 20;
  pointer-events: none;
  user-select: none;
}
`;

function extractAlbumId(href: string): string | null {
  return href.match(/bunkr\.cr\/a\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
}

function markCardSeen(card: HTMLAnchorElement): void {
  if (card.classList.contains(SEEN_CLASS)) return;
  card.classList.add(SEEN_CLASS);
  // The card needs `position: relative` for the badge to anchor correctly.
  // Most cards already have it; set it defensively.
  if (getComputedStyle(card).position === "static") {
    card.style.position = "relative";
  }
  const badge = document.createElement("div");
  badge.className = "bks-seen-badge";
  badge.textContent = "Seen";
  card.appendChild(badge);
}

function attachCard(card: HTMLAnchorElement, visited: Set<string>): void {
  if (card.getAttribute(TRACKED_ATTR)) return;
  card.setAttribute(TRACKED_ATTR, "1");

  const albumId = extractAlbumId(card.href);
  if (!albumId) return;

  if (visited.has(albumId)) markCardSeen(card);

  card.addEventListener("click", () => {
    addVisitedAlbum(albumId);
    visited.add(albumId);
    markCardSeen(card);
  });
}

function initOnIndex(): void {
  const styleEl = document.createElement("style");
  styleEl.id = "bks-seen-styles";
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  const visited = getVisitedAlbums();
  log("Loaded", visited.size, "visited albums");

  observeAdded(document.body, 'a[href*="bunkr.cr/a/"]', (el) => {
    attachCard(el as HTMLAnchorElement, visited);
  });

  GM_registerMenuCommand("Bunkr Suite — Clear seen history", () => {
    clearVisitedAlbums();
    document
      .querySelectorAll<HTMLAnchorElement>(`.${SEEN_CLASS}`)
      .forEach((card) => {
        card.classList.remove(SEEN_CLASS);
        card.style.opacity = "";
        card.querySelector(".bks-seen-badge")?.remove();
        card.removeAttribute(TRACKED_ATTR);
      });
    log("Seen history cleared");
  });
}

function initOnAlbumPage(): void {
  const albumId = window.location.pathname.match(/\/a\/([A-Za-z0-9_-]+)/)?.[1];
  if (albumId) {
    addVisitedAlbum(albumId);
    log("Marked as visited:", albumId);
  }
}

export function initAlreadySeen(): void {
  if (window.location.hostname === "balbums.st") {
    initOnIndex();
  } else {
    initOnAlbumPage();
  }
}
