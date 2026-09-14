export interface PreviewData {
  thumbnails: string[];
  title: string;
  fileCount: number;
}

export interface CDNLink {
  url: string;
  filename: string;
  isVideo: boolean;
}

export interface FileTypeSummary {
  videos: number;
  images: number;
  total: number;
}
