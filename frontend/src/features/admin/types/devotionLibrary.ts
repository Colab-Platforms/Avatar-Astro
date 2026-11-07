export type DevotionLibraryStatus = "DRAFT" | "PUBLISHED";

export interface AdminSpiritualBook {
  id: string;
  title: string;
  slug: string;
  author: string | null;
  category: string;
  description: string;
  coverImageUrl: string | null;
  fileUrl: string | null;
  fileBytes: number | null;
  status: DevotionLibraryStatus;
  displayOrder: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface AdminMantraChant {
  id: string;
  title: string;
  slug: string;
  deity: string | null;
  category: string;
  lyricsText: string | null;
  meaning: string | null;
  audioUrl: string | null;
  durationSeconds: number | null;
  coverImageUrl: string | null;
  status: DevotionLibraryStatus;
  displayOrder: number;
  playCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface BookFormValues {
  title: string;
  slug: string;
  author?: string;
  category: string;
  description: string;
  status: DevotionLibraryStatus;
  displayOrder: number;
}

export interface MantraFormValues {
  title: string;
  slug: string;
  deity?: string;
  category: string;
  lyricsText?: string;
  meaning?: string;
  status: DevotionLibraryStatus;
  displayOrder: number;
}

export interface AdminListResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DevotionLibraryStats {
  books: {
    total: number;
    published: number;
    totalDownloads: number;
    top: { id: string; title: string; downloadCount: number }[];
  };
  mantras: {
    total: number;
    published: number;
    totalPlays: number;
    totalDownloads: number;
    top: { id: string; title: string; playCount: number; downloadCount: number }[];
  };
}
