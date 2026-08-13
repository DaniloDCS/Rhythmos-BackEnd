export function calculateLevelFromXp(totalXp: number) {
  const xpPerLevel = 100;

  const current = Math.floor(totalXp / xpPerLevel) + 1;
  const currentLevelStartXp = (current - 1) * xpPerLevel;
  const nextLevelXp = current * xpPerLevel;
  const currentLevelXp = totalXp - currentLevelStartXp;

  const progressPercent = Math.min((currentLevelXp / xpPerLevel) * 100, 100);

  return {
    current,
    currentLevelXp,
    nextLevelXp: xpPerLevel,
    progressPercent,
  };
}
