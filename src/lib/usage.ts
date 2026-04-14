export function getMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function normalizeUsageData<T extends Record<string, any>>(userData: T | null) {
  if (!userData) return null;

  const currentMonthKey = getMonthKey();
  const savedMonthKey = userData.usageMonthKey || currentMonthKey;

  if (savedMonthKey !== currentMonthKey) {
    return {
      ...userData,
      usageMonthKey: currentMonthKey,
      storiesUsedThisMonth: 0,
    };
  }

  return userData;
}