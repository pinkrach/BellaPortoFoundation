/** Values stored in `donations.donation_type` (aligned with admin + donor history filters). */
export const DONOR_NON_MONETARY_DONATION_TYPE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "Time", label: "Time (volunteer service)" },
  { value: "In-Kind", label: "In-kind (goods or services)" },
];

/** Shown when no campaigns exist in the database yet; merged with distinct `donations.campaign_name`. */
export const DONOR_DONATION_FALLBACK_CAMPAIGNS: readonly string[] = [
  "General support",
  "Annual appeal",
  "Emergency / crisis response",
  "Program-specific",
  "Event or gala",
  "Corporate / workplace giving",
];

/** `in_kind_donation_items.item_category` — donor-facing list. */
export const IN_KIND_ITEM_CATEGORY_OPTIONS: readonly string[] = [
  "Food & beverages",
  "Clothing & footwear",
  "Hygiene & personal care",
  "Medical / health supplies",
  "Educational materials",
  "Household goods & furniture",
  "Baby & child supplies",
  "Electronics & equipment",
  "Professional services (pro bono)",
  "Other",
];
