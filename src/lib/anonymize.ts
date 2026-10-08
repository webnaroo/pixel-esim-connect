// GDPR account deletion: orders stay for tax reasons but lose every link to the person.
export const anonymizedEmail = (orderId: string) => `geloescht-${orderId.slice(0, 8)}@anonym.invalid`;

export function anonymizeOrderPatch(orderId: string, now: Date) {
  return { user_id: null, guest_email: anonymizedEmail(orderId), anonymized_at: now.toISOString() };
}

/** Installation data is personal and useless after deletion — cleared, not kept. */
export const ESIM_CLEAR_PATCH = {
  user_id: null,
  activation_code: null,
  lpa_string: null,
  smdp_address: null,
  qr_image_url: null,
  direct_install_url: null,
  ios_install_url: null,
  android_install_url: null,
} as const;

export const DELETE_CONFIRM_WORD = "LÖSCHEN";
export const isDeleteConfirmed = (input: string) => input.trim() === DELETE_CONFIRM_WORD;
