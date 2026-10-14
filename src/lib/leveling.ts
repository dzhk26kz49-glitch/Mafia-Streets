export const getReputationForLevel = (level: number) => {
  if (level <= 1) return 1000;
  // Linear interpolation: y = mx + c
  // 200000 = m * 100 + c
  // 1000 = m * 1 + c
  // 199000 = m * 99 => m = 199000 / 99 ≈ 2010.1
  // c = 1000 - 2010.1 = -1010.1
  return Math.floor(2010.1 * level - 1010.1);
};

export const getLevelForReputation = (reputation: number) => {
  if (reputation < 1000) return 1;
  // Level = (reputation + 1010.1) / 2010.1
  return Math.max(1, Math.floor((reputation + 1010.1) / 2010.1));
};

export const getProgressToNextLevel = (reputation: number, currentLevel: number) => {
  const currentLevelRep = getReputationForLevel(currentLevel);
  const nextLevelRep = getReputationForLevel(currentLevel + 1);
  
  const progress = (reputation - currentLevelRep) / (nextLevelRep - currentLevelRep);
  return Math.min(Math.max(progress * 100, 0), 100);
};
