/**
 * This carousel is about PROFESSIONAL NAME changes only — the name/spelling a
 * celebrity uses in film/media credits vs. an earlier professional
 * name/spelling they used. It is intentionally NOT about birth or legal
 * names, and none should ever be shown here — the one deliberate exception
 * is Rajinikanth, explicitly labeled as a stage-name example rather than a
 * spelling-change example (see `isStageName` below).
 */
export interface CelebrityChange {
  /** Current professional name — rendered large & bold at the bottom of the card. */
  currentName: string;
  /** Previous professional name/spelling — rendered small at the top of the card. */
  previousSpelling: string;
  profession: string;
  description: string;
  /** True only for the one stage-name exception (Rajinikanth) — changes the card's small top label. */
  isStageName?: boolean;
  /**
   * Local path under `frontend/public/images/celebrities/`.
   */
  photo: string;
}

export const CELEBRITY_NAME_CHANGES: CelebrityChange[] = [
  {
    currentName: "Ajay Devgn",
    previousSpelling: "Ajay Devgan",
    profession: "Actor, Producer",
    description: "Uses the professional spelling “Devgn” instead of “Devgan” in film credits.",
    photo: "/images/celebrities/ajay-devgn.png",
  },
  {
    currentName: "Ayushmann Khurrana",
    previousSpelling: "Ayushman Khurana",
    profession: "Actor, Singer",
    description: "Uses the professional spelling with additional letters in both the first name and surname.",
    photo: "/images/celebrities/ayushmann-khurrana.png",
  },
  {
    currentName: "Ektaa Kapoor",
    previousSpelling: "Ekta Kapoor",
    profession: "TV & Film Producer",
    description: "Uses the professional spelling “Ektaa” instead of “Ekta”.",
    photo: "/images/celebrities/ektaa-kapoor.png",
  },
  {
    currentName: "Karisma Kapoor",
    previousSpelling: "Karishma Kapoor",
    profession: "Actress",
    description: "Uses the professional spelling “Karisma” instead of “Karishma”.",
    photo: "/images/celebrities/karisma-kapoor.png",
  },
  // Temporarily disabled — remove this comment block to restore.
  // {
  //   currentName: "Rajinikanth",
  //   previousSpelling: "Shivaji Rao Gaikwad",
  //   profession: "Actor",
  //   description: "A stage name adopted on the advice of director K. Balachander to launch his film career — not a spelling variant, but a full professional name change.",
  //   isStageName: true,
  //   photo: "/images/celebrities/rajinikanth.jpeg",
  // },
  {
    currentName: "Rani Mukerji",
    previousSpelling: "Rani Mukherjee",
    profession: "Actress",
    description: "Uses the professional surname spelling “Mukerji” instead of “Mukherjee”.",
    photo: "/images/celebrities/rani-mukerji.png",
  },
  {
    currentName: "Riteish Deshmukh",
    previousSpelling: "Ritesh Deshmukh",
    profession: "Actor, Producer",
    description: "Uses the professional spelling “Riteish” instead of “Ritesh”.",
    photo: "/images/celebrities/riteish-deshmukh.png",
  },
];

/** Dictionary key of a celebrity card, e.g. "Ajay Devgn" -> "ajayDevgn" (namank.celeb.items.<key>.profession / .description). */
export const celebKey = (currentName: string): string =>
  currentName.replace(/[^A-Za-z]+(.)/g, (_, c: string) => c.toUpperCase()).replace(/^./, (c) => c.toLowerCase());
