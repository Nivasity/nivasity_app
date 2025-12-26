export type CountryOption = {
  cca2: string;
  name: string;
  callingCode: string;
  flag: string;
};

const toFlagEmoji = (cca2: string) => {
  const upper = (cca2 || '').toUpperCase();
  if (upper.length !== 2) return '';
  const [a, b] = upper;
  return String.fromCodePoint(127397 + a.charCodeAt(0), 127397 + b.charCodeAt(0));
};

type WorldCountry = {
  cca2?: string;
  name?: { common?: string };
  idd?: { root?: string; suffixes?: string[] };
};

let cached: CountryOption[] | null = null;

export const getCountryOptions = (): CountryOption[] => {
  if (cached) return cached;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const raw = require('world-countries/countries.json') as WorldCountry[];
  const options: CountryOption[] = [];

  for (const item of raw) {
    const cca2 = (item.cca2 || '').trim().toUpperCase();
    const name = (item.name?.common || '').trim();
    if (!cca2 || cca2.length !== 2 || !name) continue;

    const root = (item.idd?.root || '').trim();
    const suffix = (item.idd?.suffixes?.[0] || '').trim();
    const callingCode = `${root}${suffix}`.replace(/\s+/g, '');

    options.push({
      cca2,
      name,
      callingCode,
      flag: toFlagEmoji(cca2),
    });
  }

  cached = options.sort((a, b) => a.name.localeCompare(b.name));
  return cached;
};

