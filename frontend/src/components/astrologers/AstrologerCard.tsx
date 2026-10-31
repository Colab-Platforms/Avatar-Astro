import { Link } from "react-router-dom";
import { BadgeCheck, Clock3, MessageCircle, Phone, Star } from "lucide-react";
import { CONSULTATION_ENABLED, formatCount, type Astrologer } from "@/data/astrologers";
import AstrologerIllustration from "./AstrologerIllustration";

/** Portrait: the approved photo when there is one, otherwise an original illustrated portrait. */
export const AstrologerAvatar = ({ a, size = 96, className = "" }: { a: Astrologer; size?: number; className?: string }) =>
  a.photo ? (
    <img
      src={a.photo}
      alt={`${a.name}, astrologer`}
      width={size}
      height={size}
      className={`rounded-full object-cover object-top ring-2 ring-[#E58A45]/70 ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  ) : (
    <AstrologerIllustration
      style={a.avatar}
      seed={Number(a.id.replace(/\D/g, "")) || 0}
      size={size}
      label={`Illustrated portrait of ${a.name}`}
      className={className}
    />
  );

export const StatusDot = ({ online }: { online: boolean }) => (
  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4A2E1F]">
    <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${online ? "bg-[#2F7D4B]" : "bg-[#9A8575]"}`} />
    {online ? "Online" : "Offline"}
  </span>
);

export const PriceLine = ({ a }: { a: Astrologer }) => (
  <p className="text-[#301607]">
    {a.originalPricePerMin != null && a.originalPricePerMin > a.pricePerMin && (
      <span className="mr-1.5 text-sm text-[#6B4A37] line-through">₹{a.originalPricePerMin}</span>
    )}
    <span className="text-lg font-semibold">₹{a.pricePerMin}</span>
    <span className="text-sm text-[#6B4A37]">/min</span>
  </p>
);

/** Chat and Call appear only when a consultation service is connected; otherwise nothing is shown. */
export const ConsultButtons = ({ compact = false }: { a?: Astrologer; compact?: boolean }) => {
  if (!CONSULTATION_ENABLED) return null;
  const cls = `inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#592209]/40 bg-[#FBF5EC] font-semibold text-[#592209] hover:bg-[#592209]/10 ${
    compact ? "px-3 py-2 text-sm" : "px-5 py-3 text-base"
  }`;
  return (
    <div className="flex gap-2">
      <button type="button" className={cls}>
        <MessageCircle className="h-4 w-4" aria-hidden="true" /> Chat
      </button>
      <button type="button" className={cls}>
        <Phone className="h-4 w-4" aria-hidden="true" /> Call
      </button>
    </div>
  );
};

export const AstrologerCard = ({ a }: { a: Astrologer }) => (
  <article
    className="relative flex h-full flex-col rounded-2xl border border-[#592209]/20 bg-[#FBF5EC] p-4 shadow-[0_6px_24px_rgba(89,34,9,0.08)] sm:p-5"
    data-testid="astrologer-card"
  >
    <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
      {a.recognition && (
        <span className="rounded-full bg-[#592209] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#F5E9D6]">
          {a.recognition}
        </span>
      )}
    </div>

    <div className="flex items-start gap-4">
      <AstrologerAvatar a={a} size={84} className="shrink-0" />
      <div className="min-w-0 pt-6">
        <h3 className="flex flex-wrap items-center gap-1.5 font-home-serif text-lg font-semibold leading-tight text-[#301607]">
          <Link to={`/astrologers/${a.slug}`} className="hover:text-[#592209] focus-visible:underline">
            {a.name}
          </Link>
          {a.verified && <BadgeCheck className="h-4 w-4 text-[#592209]" aria-label="Verified" />}
        </h3>
        <StatusDot online={a.online} />
      </div>
    </div>

    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Expertise">
      {a.expertise.map((x) => (
        <li key={x} className="rounded-full border border-[#592209]/25 bg-[#F5E9D6] px-2.5 py-0.5 text-xs text-[#592209]">
          {x}
        </li>
      ))}
    </ul>
    <p className="mt-2 text-sm text-[#6B4A37]">{a.languages.join(" · ")}</p>

    <dl className="mt-auto grid grid-cols-3 gap-2 pt-3 text-center text-sm">
      <div className="rounded-lg bg-[#592209]/5 p-2">
        <dt className="sr-only">Experience</dt>
        <dd className="flex items-center justify-center gap-1 whitespace-nowrap font-semibold text-[#301607]">
          <Clock3 className="h-3.5 w-3.5 text-[#592209]" aria-hidden="true" />
          {a.experienceYears} yrs
        </dd>
      </div>
      <div className="rounded-lg bg-[#592209]/5 p-2">
        <dt className="sr-only">Rating</dt>
        <dd className="flex items-center justify-center gap-1 whitespace-nowrap font-semibold text-[#301607]">
          <Star className="h-3.5 w-3.5 fill-[#E58A45] text-[#E58A45]" aria-hidden="true" />
          {a.rating.toFixed(1)}
        </dd>
      </div>
      <div className="rounded-lg bg-[#592209]/5 p-2">
        <dt className="sr-only">Consultations</dt>
        <dd className="whitespace-nowrap font-semibold text-[#301607]">{formatCount(a.consultations)} <span className="text-xs font-normal text-[#6B4A37]">chats</span></dd>
      </div>
    </dl>

    <div className="mt-3 flex items-end justify-between">
      <PriceLine a={a} />
      <Link to={`/astrologers/${a.slug}`} className="text-sm font-semibold text-[#592209] underline underline-offset-2">
        View profile
      </Link>
    </div>

    {CONSULTATION_ENABLED && (
      <div className="mt-3">
        <ConsultButtons a={a} compact />
      </div>
    )}
  </article>
);

export default AstrologerCard;
