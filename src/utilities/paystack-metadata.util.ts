/** Paystack may return flat keys or `custom_fields` from hosted metadata. */
export function flattenPaystackMetadata(
  meta: Record<string, unknown> | null,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!meta) return out;
  for (const [k, v] of Object.entries(meta)) {
    if (k === 'custom_fields' && Array.isArray(v)) {
      for (const item of v) {
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          const vn = o['variable_name'] ?? o['display_name'];
          if (vn != null) out[String(vn)] = String(o['value'] ?? '');
        }
      }
      continue;
    }
    if (v != null && typeof v !== 'object') out[k] = String(v);
  }
  return out;
}
