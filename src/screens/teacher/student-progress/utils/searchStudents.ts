interface Named {
  name: string;
}

// Case-insensitive substring match on real student names — used to filter
// both Topic Exploration and Activity & Performance from the SAME search
// box, so a teacher typing a name narrows both sections consistently
// (same "single shared filter state" principle as the top filters).
export function searchByName<T extends Named>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => item.name.toLowerCase().includes(q));
}
