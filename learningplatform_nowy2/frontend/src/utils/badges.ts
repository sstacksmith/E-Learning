interface BadgeLevel {
  level: number;
  name: string;
  requirement: number;
  icon: string;
}

interface BadgeConfig {
  id: string;
  name: string;
  description: string;
  type: 'time' | 'courses' | 'streak';
  levels: BadgeLevel[];
}

const badgeConfigs: BadgeConfig[] = [
  {
    id: 'marathoner',
    name: 'Maratończyk',
    description: 'Czas spędzony w aplikacji',
    type: 'time',
    levels: [
      { level: 1, name: 'Początkujący', requirement: 10 * 60, icon: '🥉' }, // 10h
      { level: 2, name: 'Zaawansowany', requirement: 30 * 60, icon: '🥈' }, // 30h
      { level: 3, name: 'Ekspert', requirement: 60 * 60, icon: '🥇' }, // 60h
      { level: 4, name: 'Mistrz', requirement: 100 * 60, icon: '👑' }, // 100h
      { level: 5, name: 'Legenda', requirement: 500 * 60, icon: '🌟' }, // 500h
    ]
  },
  {
    id: 'sprinter',
    name: 'Sprinter',
    description: 'Czas spędzony w jeden dzień',
    type: 'time',
    levels: [
      { level: 1, name: 'Początkujący', requirement: 60, icon: '🥉' }, // 1h
      { level: 2, name: 'Zaawansowany', requirement: 120, icon: '🥈' }, // 2h
      { level: 3, name: 'Ekspert', requirement: 180, icon: '🥇' }, // 3h
      { level: 4, name: 'Mistrz', requirement: 240, icon: '👑' }, // 4h
      { level: 5, name: 'Legenda', requirement: 300, icon: '🌟' }, // 5h
    ]
  },
  {
    id: 'collector',
    name: 'Kolekcjoner',
    description: 'Ukończone kursy',
    type: 'courses',
    levels: [
      { level: 1, name: 'Początkujący', requirement: 2, icon: '🥉' },
      { level: 2, name: 'Zaawansowany', requirement: 5, icon: '🥈' },
      { level: 3, name: 'Ekspert', requirement: 10, icon: '🥇' },
      { level: 4, name: 'Mistrz', requirement: 15, icon: '👑' },
      { level: 5, name: 'Legenda', requirement: 20, icon: '🌟' },
    ]
  },
  {
    id: 'daily',
    name: 'Codzienniak',
    description: 'Dni z rzędu logowania',
    type: 'streak',
    levels: [
      { level: 1, name: 'Początkujący', requirement: 3, icon: '🥉' },
      { level: 2, name: 'Zaawansowany', requirement: 7, icon: '🥈' },
      { level: 3, name: 'Ekspert', requirement: 14, icon: '🥇' },
      { level: 4, name: 'Mistrz', requirement: 30, icon: '👑' },
      { level: 5, name: 'Legenda', requirement: 60, icon: '🌟' },
    ]
  }
];

export const calculateBadgeLevel = (badgeId: string, value: number): BadgeLevel | null => {
  const badge = badgeConfigs.find(b => b.id === badgeId);
  if (!badge) return null;

  // Znajdź najwyższy osiągnięty poziom
  const earnedLevel = [...badge.levels]
    .reverse()
    .find(level => value >= level.requirement);

  return earnedLevel || null;
};

export const getBadgeConfig = (badgeId: string): BadgeConfig | null => {
  return badgeConfigs.find(b => b.id === badgeId) || null;
};

export const getAllBadgeConfigs = (): BadgeConfig[] => {
  return badgeConfigs;
};
