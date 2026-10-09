/**
 * Single source of truth for Axis Housing contact details, work hours and
 * social handles. Every page, the footer, the SEO schema and the WhatsApp
 * button read from here so the details can never drift apart again.
 */

export const SUPPORT_EMAIL = 'support@axishousings.com';

/** Main support line, in the format a human reads. */
export const SUPPORT_PHONE_DISPLAY = '+256 201 004 789';
/** Main support line, digits only, for tel: links. */
export const SUPPORT_PHONE_E164 = '+256201004789';

/** WhatsApp line, in the format a human reads. */
export const WHATSAPP_DISPLAY = '+256 788 459 126';
/** WhatsApp line, digits only and no plus, for wa.me links. */
export const WHATSAPP_NUMBER = '256788459126';
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

export const OFFICE_ADDRESS = {
  street: 'UMA Show Grounds, Lugogo',
  locality: 'Kampala',
  country: 'Uganda',
  countryCode: 'UG',
} as const;

export const OFFICE_ADDRESS_LINE = `${OFFICE_ADDRESS.street}, ${OFFICE_ADDRESS.locality}, ${OFFICE_ADDRESS.country}`;

/** Work hours exactly as the business states them. */
export const WORK_HOURS_WEEKDAYS = 'Monday to Friday: 8:00 to 17:00';
export const WORK_HOURS_SATURDAY = 'Saturday: 9:00 to 15:00';
export const WORK_HOURS_SHORT = 'Mon to Fri 8:00 to 17:00, Sat 9:00 to 15:00';

/** schema.org openingHoursSpecification for the JSON-LD graph. */
export const OPENING_HOURS_SCHEMA = [
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '08:00',
    closes: '17:00',
  },
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Saturday'],
    opens: '09:00',
    closes: '15:00',
  },
];

export type SocialLink = {
  name: string;
  url: string;
};

/**
 * Official handles. Tracking tokens that the business pasted along with the
 * links have been stripped so the URLs stay clean and stable.
 */
export const SOCIAL_LINKS: SocialLink[] = [
  { name: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61594562286019' },
  { name: 'Instagram', url: 'https://www.instagram.com/axishousings' },
  { name: 'X', url: 'https://x.com/Axishousing' },
  { name: 'TikTok', url: 'https://www.tiktok.com/@axis7939' },
  { name: 'YouTube', url: 'https://youtube.com/@axishousings' },
  { name: 'KingsChat', url: 'https://www.kingsch.at/p/Z053Vmo' },
];

/** sameAs array for structured data. */
export const SOCIAL_URLS = SOCIAL_LINKS.map((s) => s.url);

/** The business description the client asked to be used verbatim. */
export const ABOUT_AXIS_BLURB =
  'Axis is a digital application that links potential tenants directly to property owners and managers for free and manages tenants digitally by notifying tenants on the status of their rent, generating electronic receipts and tenancy agreements and tracking their payments.';
