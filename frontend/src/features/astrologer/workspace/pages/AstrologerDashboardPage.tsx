import { useOutletContext } from "react-router-dom";
import type { AstrologerOutletContext } from "../AstrologerDashboardLayout";
import {
  SuspensionBanner,
  ProfileHeroBanner,
  ProfileDetailsCard,
  PricingCard,
  LanguagesCard,
  ProfilePhotoCard,
  PublicationStatusCard,
  ProfilePreviewCard,
} from "../components/profile";

/**
 * Astrologer profile management page.
 * The access gate (requireAstrologer) and approved profile data live in AstrologerDashboardLayout.
 */
export default function AstrologerDashboardPage() {
  const { profile } = useOutletContext<AstrologerOutletContext>();

  return (
    <div className="w-full space-y-6">
      <SuspensionBanner
        suspendedAt={profile.suspendedAt}
        suspensionReason={profile.suspensionReason}
      />

      <ProfileHeroBanner profile={profile} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Primary Configuration (Left Column: 7 cols on lg, 8 on xl) */}
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          <ProfileDetailsCard profile={profile} />
          <PricingCard profile={profile} />
          <LanguagesCard profile={profile} />
        </div>

        {/* Identity, Visibility & Live Client Preview (Right Column: 5 cols on lg, 4 on xl) */}
        <div className="space-y-6 lg:col-span-5 xl:col-span-4">
          <ProfilePhotoCard profile={profile} />
          <PublicationStatusCard profile={profile} />
          <ProfilePreviewCard profile={profile} />
        </div>
      </div>
    </div>
  );
}
