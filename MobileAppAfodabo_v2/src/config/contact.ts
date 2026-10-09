/**
 * Axis Housing contact details, work hours and the business description.
 *
 * Mirrors src/config/contact.ts on the web so the two platforms can never
 * drift apart. Change a number here and in the web file together.
 */

export const SUPPORT_EMAIL = "support@axishousings.com";

export const SUPPORT_PHONE_DISPLAY = "+256 201 004 789";
export const SUPPORT_PHONE_E164 = "+256201004789";

export const WHATSAPP_DISPLAY = "+256 788 459 126";
export const WHATSAPP_NUMBER = "256788459126";
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

export const OFFICE_ADDRESS_LINE = "UMA Show Grounds, Lugogo, Kampala, Uganda";

/** Work hours exactly as the business states them. */
export const WORK_HOURS_WEEKDAYS = "Monday to Friday: 8:00 to 17:00";
export const WORK_HOURS_SATURDAY = "Saturday: 9:00 to 15:00";

/** The business description the client asked to be used verbatim. */
export const ABOUT_AXIS_BLURB =
  "Axis is a digital application that links potential tenants directly to property owners and managers for free and manages tenants digitally by notifying tenants on the status of their rent, generating electronic receipts and tenancy agreements and tracking their payments.";

export type SocialLink = { name: string; url: string };

/** Official handles, with the business's tracking tokens stripped. */
export const SOCIAL_LINKS: SocialLink[] = [
  { name: "Facebook", url: "https://www.facebook.com/profile.php?id=61594562286019" },
  { name: "Instagram", url: "https://www.instagram.com/axishousings" },
  { name: "X", url: "https://x.com/Axishousing" },
  { name: "TikTok", url: "https://www.tiktok.com/@axis7939" },
  { name: "YouTube", url: "https://youtube.com/@axishousings" },
  { name: "KingsChat", url: "https://www.kingsch.at/p/Z053Vmo" },
];
