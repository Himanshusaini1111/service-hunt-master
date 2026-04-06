/**
 * Helpers for multi-area coverage and per-area price add-ons (base + optional extras).
 */

function norm(s) {
  return (s == null ? "" : String(s)).trim().toLowerCase();
}

export function normalizeServiceAreas(areas) {
  if (!areas || !Array.isArray(areas)) return [];
  return areas
    .map((a) => {
      if (typeof a === "string") {
        const parts = a.split(",").map((x) => x.trim());
        return {
          city: parts[0] || "",
          state: parts.slice(1).join(", ") || "",
          district: "",
          pincode: "",
          extraPrice: 0,
        };
      }
      return {
        city: a.city || "",
        state: a.state || "",
        district: a.district || "",
        pincode: a.pincode != null ? String(a.pincode) : "",
        extraPrice: Number(a.extraPrice) || 0,
      };
    })
    .filter((a) => a.city || a.state);
}

/** City/state match for comparing two area rows */
export function areasMatch(a, b) {
  if (!a || !b) return false;
  return norm(a.city) === norm(b.city) && norm(a.state) === norm(b.state);
}

/**
 * Match user's location filter (string or Nominatim-like object) to a configured service area.
 */
export function getServiceAreaMatch(service, locationValue) {
  const areas = normalizeServiceAreas(service?.serviceAreas);
  if (!locationValue || areas.length === 0) return null;

  let locationLower = "";
  if (typeof locationValue === "string") {
    locationLower = locationValue.toLowerCase();
  } else if (locationValue.display_name) {
    locationLower = locationValue.display_name.toLowerCase();
  } else if (locationValue.city) {
    locationLower = String(locationValue.city).toLowerCase();
  } else {
    locationLower = String(locationValue).toLowerCase();
  }

  const cityName = locationLower.split(",")[0].trim();

  return (
    areas.find((area) => {
      const ac = norm(area.city);
      const st = norm(area.state);
      const dist = norm(area.district);
      const pin = (area.pincode || "").toString();
      if (!ac && !st) return false;
      return (
        (ac && (ac.includes(cityName) || cityName.includes(ac))) ||
        (st && (st.includes(cityName) || cityName.includes(st))) ||
        (dist && (dist.includes(cityName) || cityName.includes(dist))) ||
        (pin && locationLower.includes(pin))
      );
    }) || null
  );
}

export function effectiveBaseRent(service, area) {
  const base = Number(service?.rentperday) || 0;
  const ex = area ? Number(area.extraPrice) || 0 : 0;
  return base + ex;
}

/** Unit price for one optional line, including that line's area-specific surcharge. */
export function effectiveOptionalUnitPrice(input, area) {
  const base = Number(input?.price) || 0;
  if (!area || !input?.areaExtras?.length) return base;
  const city = norm(area.city);
  const state = norm(area.state);
  const row = input.areaExtras.find(
    (r) => norm(r.city) === city && norm(r.state) === state
  );
  return base + (row ? Number(row.extraPrice) || 0 : 0);
}