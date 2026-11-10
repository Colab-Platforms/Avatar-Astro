export interface AstrologerProfileSelf {
  id: string;
  applicationId: string;
  userId: string;
  slug: string;
  displayName: string;
  bio: string | null;
  profilePhotoUrl: string | null;
  profilePhotoPublicId: string | null;
  yearsOfExperience: number | null;
  languages: string[];
  /** Rupees per minute. Null until they've set one — the public profile hides pricing until then. */
  pricePerMinute: number | null;
  isPublished: boolean;
  /** Live chat presence — driven by Socket.IO connections plus the manual toggle in the chat workspace. */
  isOnline: boolean;
  publishedAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  createdAt: string;
  updatedAt: string | null;
}
