import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Clock3, Star, Users } from "lucide-react";
import { AstrologerAvatar, ConsultButtons, PriceLine, StatusDot } from "@/components/astrologers/AstrologerCard";
import { CONSULTATION_ENABLED, formatCount, getAstrologer } from "@/data/astrologers";

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-[#592209]/20 bg-[#FBF5EC] p-4 text-center">
    <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center text-[#592209]" aria-hidden="true">
      {icon}
    </div>
    <p className="text-xl font-semibold text-[#301607]">{value}</p>
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B4A37]">{label}</p>
  </div>
);

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-5">
    <h2 className="mb-2 font-home-serif text-xl font-semibold text-[#592209]">{title}</h2>
    <div className="space-y-2 text-base leading-[1.6] text-[#4A2E1F]">{children}</div>
  </section>
);

/** Detailed profile page for one astrologer (route: /astrologers/:slug). */
const AstrologerProfile = () => {
  const { slug } = useParams();
  const a = getAstrologer(slug);

  if (!a) {
    return (
      <section className="mx-auto max-w-xl px-4 pb-20 pt-12 text-center" data-testid="astrologer-missing">
        <h1 className="font-home-serif text-3xl font-semibold text-[#592209]">Astrologer not found</h1>
        <p className="mt-3 text-lg text-[#4A2E1F]">This profile does not exist or is no longer listed.</p>
        <Link to="/astrologers" className="mt-5 inline-block rounded-lg bg-[#592209] px-6 py-3 font-semibold text-[#F5E9D6] hover:bg-[#461B07]">
          Consult Astrologers
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6" data-testid="astrologer-profile">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <header className="flex flex-col items-center gap-5 rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-6 text-center sm:flex-row sm:text-left">
            <AstrologerAvatar a={a} size={150} className="shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {a.recognition && (
                  <span className="rounded-full bg-[#592209] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#F5E9D6]">
                    {a.recognition}
                  </span>
                )}
              </div>
              <h1 className="mt-2 flex flex-wrap items-center justify-center gap-2 font-home-serif text-3xl font-semibold text-[#301607] sm:justify-start sm:text-4xl">
                {a.name}
                {a.verified && <BadgeCheck className="h-6 w-6 text-[#592209]" aria-label="Verified" />}
              </h1>
              <div className="mt-1">
                <StatusDot online={a.online} />
              </div>
              <p className="mt-2 text-base text-[#4A2E1F]">{a.expertise.join(", ")}</p>
              <p className="text-base text-[#6B4A37]">{a.languages.join(", ")}</p>
            </div>
          </header>

          <div className="grid grid-cols-3 gap-3">
            <Stat icon={<Clock3 className="h-5 w-5" />} label="Experience" value={`${a.experienceYears} years`} />
            <Stat icon={<Star className="h-5 w-5" />} label="Rating" value={a.rating.toFixed(1)} />
            <Stat icon={<Users className="h-5 w-5" />} label="Consultations" value={formatCount(a.consultations)} />
          </div>

          <Block title="About">
            <p>{a.about}</p>
          </Block>
          <Block title="Areas of expertise">
            <ul className="flex flex-wrap gap-2">
              {a.expertise.map((x) => (
                <li key={x} className="rounded-full border border-[#592209]/30 bg-[#F5E9D6] px-3 py-1 text-sm text-[#592209]">
                  {x}
                </li>
              ))}
            </ul>
          </Block>
          <Block title="Languages">
            <p>{a.languages.join(", ")}</p>
          </Block>
          {a.qualifications.length > 0 && (
            <Block title="Experience and qualifications">
              <ul className="list-disc space-y-1 pl-5">
                {a.qualifications.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </Block>
          )}
          <Block title="Availability">
            <p>{a.availability}</p>
          </Block>
          {a.gallery.length > 0 && (
            <Block title="Gallery">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {a.gallery.map((src, i) => (
                  <li key={src}>
                    <img src={src} alt={`${a.name}, photo ${i + 1}`} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Consultation">
          <div className="rounded-2xl border border-[#592209]/25 bg-[#FBF5EC] p-5 shadow-[0_6px_24px_rgba(89,34,9,0.08)]">
            <h2 className="font-home-serif text-xl font-semibold text-[#592209]">Consultation</h2>
            <div className="mt-2">
              <PriceLine a={a} />
            </div>
            <p className="mt-1 text-sm text-[#6B4A37]">{a.availability}</p>
            {CONSULTATION_ENABLED && (
              <div className="mt-4">
                <ConsultButtons a={a} />
              </div>
            )}
          </div>
          <Link to="/astrologers" className="mt-4 inline-block text-sm font-semibold text-[#592209] underline underline-offset-2">
            All astrologers
          </Link>
        </aside>
      </div>
    </section>
  );
};

export default AstrologerProfile;
