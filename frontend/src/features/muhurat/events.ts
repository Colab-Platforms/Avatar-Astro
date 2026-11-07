import { Baby, Briefcase, Car, Flag, Heart, HeartHandshake, Home, KeyRound, Landmark, Plane, Rocket, Scissors, Store, UtensilsCrossed, HardHat, type LucideIcon } from "lucide-react";

export type EventGroup = "personal" | "home" | "vehicle" | "business";

export interface EventCard {
  /** The id the server's rule sets use. */
  id: string;
  label: string;
  group: EventGroup;
  summary: string;
  Icon: LucideIcon;
}

export const GROUPS: { id: EventGroup; label: string }[] = [
  { id: "personal", label: "Personal & family" },
  { id: "home", label: "Home & property" },
  { id: "vehicle", label: "Vehicle & travel" },
  { id: "business", label: "Business & career" },
];

/** Presentation only (icons and short descriptions). What makes a time suitable lives on the server, in one rules file. */
export const EVENT_CARDS: EventCard[] = [
  { id: "marriage", label: "Marriage Muhurat", group: "personal", summary: "Vivah: a day and time for the wedding.", Icon: Heart },
  { id: "engagement", label: "Engagement Muhurat", group: "personal", summary: "Sagai: the betrothal ceremony.", Icon: HeartHandshake },
  { id: "namkaran", label: "Namkaran Muhurat", group: "personal", summary: "The baby naming ceremony.", Icon: Baby },
  { id: "annaprashan", label: "Annaprashan Muhurat", group: "personal", summary: "A baby's first solid food.", Icon: UtensilsCrossed },
  { id: "mundan", label: "Mundan Muhurat", group: "personal", summary: "The first haircut ceremony.", Icon: Scissors },
  { id: "griha-pravesh", label: "Griha Pravesh Muhurat", group: "home", summary: "House-warming: first entry into a new home.", Icon: Home },
  { id: "property-purchase", label: "Property Purchase Muhurat", group: "home", summary: "Buying or registering land or a house.", Icon: Landmark },
  { id: "house-construction", label: "House Construction Muhurat", group: "home", summary: "Bhoomi pujan and the start of building.", Icon: HardHat },
  { id: "vehicle-purchase", label: "Vehicle Purchase Muhurat", group: "vehicle", summary: "Buying a new car, bike or other vehicle.", Icon: Car },
  { id: "vehicle-delivery", label: "Vehicle Delivery Muhurat", group: "vehicle", summary: "Taking delivery of a vehicle you booked.", Icon: KeyRound },
  { id: "travel", label: "Travel Muhurat", group: "vehicle", summary: "Starting a journey (Yatra).", Icon: Plane },
  { id: "business-opening", label: "Business Opening Muhurat", group: "business", summary: "Starting a business or an office.", Icon: Briefcase },
  { id: "shop-opening", label: "New Shop Opening Muhurat", group: "business", summary: "Opening a new shop or store.", Icon: Store },
  { id: "business-launch", label: "New Business Launch Muhurat", group: "business", summary: "Launching a venture, product or website.", Icon: Rocket },
  { id: "work-beginning", label: "Important Work Beginning Muhurat", group: "business", summary: "Starting a job, project or important task.", Icon: Flag },
];

export const eventById = (id: string): EventCard | undefined => EVENT_CARDS.find((e) => e.id === id);
