export interface Habit {
  id: string;
  label: string;
  icon: string;
  coins: number;
}

export interface TodayData {
  habits: Habit[];
  parentTasks: (Habit & { fromParent: boolean })[];
  today: { completed: string[]; coinsEarned: number };
  streak: number;
  streakBonus: number;
  totalCoins: number;
  journalText: string;
  date: string;
}

export interface CoinPop {
  id: string;
  coins: number;
}
