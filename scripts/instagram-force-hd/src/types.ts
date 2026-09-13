// Shared domain types

export interface VideoVersion {
  url: string;
  width?: number;
  height?: number;
  bandwidth?: number;
  id?: string | number;
}

export interface ImageCandidate {
  url: string;
  width?: number;
  height?: number;
}

export interface DisplayResource {
  src?: string;
  config_width?: number;
  config_height?: number;
}

/**
 * Loose shape of an Instagram media node as it appears in API payloads.
 * The index signature allows walking arbitrary JSON without casting.
 */
export interface MediaNode {
  id?: string | number;
  pk?: string | number;
  code?: string;
  shortcode?: string;
  video_url?: string;
  video_versions?: VideoVersion[];
  video_dash_manifest?: string;
  dash_manifest?: string;
  image_versions2?: { candidates?: ImageCandidate[] };
  display_resources?: DisplayResource[];
  display_url?: string;
  candidates?: ImageCandidate[];
  [key: string]: unknown;
}

// Vendor-prefixed fullscreen API — not included in standard lib.dom.d.ts
declare global {
  interface Document {
    readonly webkitFullscreenElement: Element | null;
    readonly msFullscreenElement?: Element | null;
    webkitExitFullscreen?(): Promise<void>;
    msExitFullscreen?(): void;
  }

  interface Element {
    webkitRequestFullscreen?(): Promise<void>;
    /** Safari iOS */
    webkitEnterFullscreen?(): void;
    msRequestFullscreen?(): Promise<void>;
  }
}
