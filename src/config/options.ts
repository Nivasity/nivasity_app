export const SCHOOLS = [
  'University of Lagos (UNILAG)',
  'University of Ibadan (UI)',
  'Obafemi Awolowo University (OAU)',
  'Covenant University',
  'Ahmadu Bello University (ABU)',
  'Other',
];

export const DEPARTMENTS = [
  'Computer Science',
  'Mathematics',
  'Statistics',
  'Physics',
  'Chemistry',
  'General Studies',
  'Other',
];

export const getAdmissionSessions = (startYear = 2019) => {
  const currentYear = new Date().getFullYear();
  const first = Math.min(startYear, currentYear);
  const sessions: string[] = [];
  for (let y = first; y <= currentYear; y += 1) {
    sessions.push(`${y}/${y + 1}`);
  }
  return sessions;
};
