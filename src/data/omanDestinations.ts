// src/data/omanDestinations.ts
export type OmanPlace = { id: string; name: string; lat: number; lng: number; coastal?: boolean };

export const OMAN_PLACES: OmanPlace[] = [
  // Muscat area
  { id: "muscat-ruwi",      name: "Ruwi, Muscat",            lat: 23.5880, lng: 58.4084, coastal: true },
  { id: "muscat-qurum",     name: "Qurum, Muscat",           lat: 23.6025, lng: 58.4677, coastal: true },
  { id: "muscat-muttrah",   name: "Muttrah, Muscat",         lat: 23.6158, lng: 58.5660, coastal: true },
  { id: "seeb",             name: "Seeb",                    lat: 23.6703, lng: 58.1891, coastal: true },
  { id: "barka",            name: "Barka",                   lat: 23.7070, lng: 57.8890, coastal: true },
  { id: "al-khoudh",        name: "Al Khoudh",               lat: 23.5850, lng: 58.1690 },
  { id: "bidbid",           name: "Bidbid",                  lat: 23.4070, lng: 58.1280 },

  // Al Batinah North / South
  { id: "sohar",            name: "Sohar",                   lat: 24.3390, lng: 56.7296, coastal: true },
  { id: "shinas",           name: "Shinas",                  lat: 24.7433, lng: 56.4653, coastal: true },
  { id: "saham",            name: "Saham",                   lat: 24.1722, lng: 56.8883, coastal: true },
  { id: "liwa",             name: "Liwa",                    lat: 24.5300, lng: 56.5550, coastal: true },
  { id: "rustaq",           name: "Rustaq",                  lat: 23.3908, lng: 57.4244 },
  { id: "nakhal",           name: "Nakhal",                  lat: 23.4058, lng: 57.8282 },

  // Ad Dakhiliyah
  { id: "nizwa",            name: "Nizwa",                   lat: 22.9333, lng: 57.5333 },
  { id: "bahla",            name: "Bahla",                   lat: 22.9739, lng: 57.3045 },
  { id: "izki",             name: "Izki",                    lat: 22.9332, lng: 57.7662 },
  { id: "samail",           name: "Samail",                  lat: 23.3030, lng: 57.9750 },
  { id: "adam",             name: "Adam",                    lat: 22.3795, lng: 57.5272 },
  { id: "manah",            name: "Manah",                   lat: 22.8064, lng: 57.5330 },

  // Ash Sharqiyah North/South
  { id: "ibra",             name: "Ibra",                    lat: 22.6906, lng: 58.5334 },
  { id: "bidiyah",          name: "Bidiyah",                 lat: 22.4502, lng: 58.7997 },
  { id: "al-kamil",         name: "Al Kamil Wal Wafi",       lat: 22.2405, lng: 59.2003 },
  { id: "sur",              name: "Sur",                     lat: 22.5667, lng: 59.5289, coastal: true },
  { id: "jalan-bu-ali",     name: "Jalan Bani Bu Ali",       lat: 22.9926, lng: 59.3235 },

  // Al Dhahirah
  { id: "ibri",             name: "Ibri",                    lat: 23.2257, lng: 56.5157 },
  { id: "yanqul",           name: "Yanqul",                  lat: 23.5856, lng: 56.5469 },
  { id: "dhank",            name: "Dhank",                   lat: 23.4614, lng: 56.2533 },

  // Al Buraimi
  { id: "al-buraimi",       name: "Al Buraimi",              lat: 24.2495, lng: 55.7933 },

  // Al Wusta
  { id: "haima",            name: "Haima",                   lat: 19.9595, lng: 56.2757 },
  { id: "duqm",             name: "Duqm",                    lat: 19.6667, lng: 57.7080, coastal: true },
  { id: "mahout",           name: "Mahout",                  lat: 20.7515, lng: 57.4974, coastal: true },

  // Dhofar
  { id: "salalah",          name: "Salalah",                 lat: 17.0197, lng: 54.0897, coastal: true },
  { id: "thumrait",         name: "Thumrait",                lat: 17.6689, lng: 54.0231 },
  { id: "mirbat",           name: "Mirbat",                  lat: 16.9922, lng: 54.6918, coastal: true },
  { id: "tawi-atair",       name: "Tawi Atair",              lat: 17.1065, lng: 54.8490 },

  // Musandam (road via UAE)
  { id: "khasab",           name: "Khasab (Musandam)",       lat: 26.1975, lng: 56.2440, coastal: true },
  { id: "bukha",            name: "Bukha (Musandam)",        lat: 26.1800, lng: 56.2430, coastal: true },

  // Extra inland nodes (safe from ocean)
  { id: "ghala",            name: "Ghala (Muscat)",          lat: 23.5655, lng: 58.3746 },
  { id: "amrat",            name: "Al Amrat (Muscat)",       lat: 23.4673, lng: 58.5636 },
  { id: "saiq",             name: "Saiq (Jabal Akhdar)",     lat: 23.0684, lng: 57.6607 },
  { id: "birkat",           name: "Birkat Al Mouz",          lat: 22.9240, lng: 57.6590 },
  { id: "saham-inland",     name: "Saham (Inland Junction)", lat: 24.1840, lng: 56.8680 },
  { id: "al-mudhaibi",      name: "Al Mudhaibi",             lat: 22.5675, lng: 58.2831 },
  { id: "masrooq",          name: "Masrooq (Ibri area)",     lat: 23.2900, lng: 56.3770 },
  { id: "yiti",             name: "Yiti (Hajar foothills)",  lat: 23.5230, lng: 58.6810 },
];

export function randomOmanPlace(opts?: { avoidCoast?: boolean }) {
  const pool = opts?.avoidCoast ? OMAN_PLACES.filter(p => !p.coastal) : OMAN_PLACES;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Optionally snap a point to the nearest road (OSRM). */
export async function snapToNearestRoad(place: OmanPlace): Promise<OmanPlace> {
  try {
    const url = `https://router.project-osrm.org/nearest/v1/driving/${place.lng},${place.lat}?number=1`;
    const res = await fetch(url);
    if (!res.ok) return place;
    const json = await res.json();
    const loc = json?.waypoints?.[0]?.location;
    if (Array.isArray(loc) && loc.length === 2) {
      return { ...place, lng: loc[0], lat: loc[1] };
    }
    return place;
  } catch {
    return place;
  }
}
