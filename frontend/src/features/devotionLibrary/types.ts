export interface PublicSpiritualBook {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  category: string;
  description: string;
  coverImageUrl: string | null;
  hasFile: boolean;
}

export interface PublicMantraChant {
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
