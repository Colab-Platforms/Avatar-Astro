export type DevotionLibraryStatus = "DRAFT" | "PUBLISHED";

export interface SpiritualBookDTO {
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
  createdAt: Date;
  updatedAt: Date | null;
}

export interface MantraChantDTO {
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
  createdAt: Date;
  updatedAt: Date | null;
}

export interface ListParams {
  search?: string;
  page: number;
  limit: number;
}

export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateBookInput {
  title: string;
  slug: string;
  author?: string | null;
  category: string;
  description: string;
  status?: DevotionLibraryStatus;
  displayOrder?: number;
}

export type UpdateBookInput = Partial<CreateBookInput>;

export interface CreateMantraInput {
  title: string;
  slug: string;
  deity?: string | null;
  category: string;
  lyricsText?: string | null;
  meaning?: string | null;
  status?: DevotionLibraryStatus;
  displayOrder?: number;
}

export type UpdateMantraInput = Partial<CreateMantraInput>;

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

/** Multer's in-memory file shape, narrowed to what the service needs. */
export interface UploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/** Narrow public shape — no Cloudinary publicIds, no counters, no draft fields. */
export interface PublicSpiritualBookDTO {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  category: string;
  description: string;
  coverImageUrl: string | null;
  hasFile: boolean;
}

export interface PublicMantraChantDTO {
  id: string;
  slug: string;
  title: string;
  deity: string | null;
  category: string;
  lyricsText: string | null;
  meaning: string | null;
  audioUrl: string | null;
  durationSeconds: number | null;
  coverImageUrl: string | null;
}
