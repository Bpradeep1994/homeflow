// Business constants shared by API, admin panel, and (as reference) the apps.

/** Platform commission on every completed booking. */
export const COMMISSION_RATE = 0.2;

/** Free-cancellation window before the slot, in hours. */
export const FREE_CANCEL_HOURS = 2;

/** Seconds a provider has to accept a dispatched offer. */
export const OFFER_TIMEOUT_SECONDS = 30;

export const TIME_SLOTS = [
  "08:00 – 10:00",
  "10:00 – 12:00",
  "12:00 – 14:00",
  "14:00 – 16:00",
  "16:00 – 18:00",
  "18:00 – 20:00",
] as const;

export const LAUNCH_CITY = "Hyderabad";
