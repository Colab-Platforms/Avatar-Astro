export interface AstrologerProfileSelf {
  id: string;
  applicationId: string;
  userId: string;
  displayName: string;
  bio: string | null;
  profilePhotoUrl: string | null;
  profilePhotoPublicId: string | null;
  yearsOfExperience: number | null;
  languages: string[];
  isPublished: boolean;
  publishedAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  createdAt: string;
  updatedAt: string | null;
}
