export const normalizeCountryCallingCode = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '+234';
  if (trimmed.startsWith('+')) return `+${trimmed.replace(/[^\d]/g, '')}`;
  return `+${trimmed.replace(/[^\d]/g, '')}`;
};

export const normalizePhone = (callingCode: string, phoneNumber: string) => {
  const cc = normalizeCountryCallingCode(callingCode);
  const pn = phoneNumber.replace(/[^\d]/g, '');
  return `${cc}${pn}`;
};

