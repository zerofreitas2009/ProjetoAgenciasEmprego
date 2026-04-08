export function hr_normalizeSkill(s: string) {
  return s.trim().toLowerCase();
}

export function hr_matchScore(
  candidateSkills: unknown,
  jobRequirements: unknown
): number {
  const c = Array.isArray(candidateSkills)
    ? candidateSkills
        .filter((x): x is string => typeof x === "string")
        .map(hr_normalizeSkill)
        .filter(Boolean)
    : [];

  const r = Array.isArray(jobRequirements)
    ? jobRequirements
        .filter((x): x is string => typeof x === "string")
        .map(hr_normalizeSkill)
        .filter(Boolean)
    : [];

  if (r.length === 0) return 0;

  const set = new Set(c);
  const hits = r.reduce((acc, req) => acc + (set.has(req) ? 1 : 0), 0);
  return Math.round((hits / r.length) * 100);
}
