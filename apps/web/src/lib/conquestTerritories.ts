// Shared territory definitions — Real World Map Layout (8 columns x 5 rows)
// Grid positions create a geographic world map shape

export interface TerritoryDef {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  adjacentIds: string[];
  gridPos: { col: number; row: number; colSpan?: number; rowSpan?: number };
  continent: 'north_america' | 'south_america' | 'europe' | 'africa' | 'asia' | 'oceania';
}

export const CONQUEST_TERRITORIES: TerritoryDef[] = [
  // NORTH AMERICA (Top Left) - Row 1-2
  { id: "0",  name: "Alaska",        nameAr: "ألاسكا",          icon: "🏔️", adjacentIds: ["1", "6"],      gridPos: { col: 1, row: 1 }, continent: 'north_america' },
  { id: "1",  name: "Canada",        nameAr: "كندا",            icon: "🍁", adjacentIds: ["0", "2", "6", "7"], gridPos: { col: 2, row: 1, colSpan: 2 }, continent: 'north_america' },
  { id: "6",  name: "US West",       nameAr: "الغرب الأمريكي",  icon: "🏜️", adjacentIds: ["0", "1", "7", "12"], gridPos: { col: 1, row: 2 }, continent: 'north_america' },
  { id: "7",  name: "US East",       nameAr: "الشرق الأمريكي",  icon: "🗽", adjacentIds: ["1", "6", "8", "12", "13"], gridPos: { col: 2, row: 2 }, continent: 'north_america' },
  { id: "12", name: "Mexico",        nameAr: "المكسيك",         icon: "🌵", adjacentIds: ["6", "7", "13", "18"], gridPos: { col: 1, row: 3 }, continent: 'north_america' },
  { id: "13", name: "Caribbean",     nameAr: "الكاريبي",        icon: "🏝️", adjacentIds: ["7", "12", "14", "18", "19"], gridPos: { col: 2, row: 3 }, continent: 'north_america' },

  // SOUTH AMERICA (Bottom Left) - Row 3-4
  { id: "18", name: "Andes",         nameAr: "جبال الأنديز",    icon: "⛰️", adjacentIds: ["12", "13", "19"], gridPos: { col: 1, row: 4 }, continent: 'south_america' },
  { id: "19", name: "Brazil",        nameAr: "البرازيل",        icon: "🦜", adjacentIds: ["13", "18", "20"], gridPos: { col: 2, row: 4, colSpan: 2 }, continent: 'south_america' },

  // GREENLAND (Top isolated)
  { id: "2",  name: "Greenland",     nameAr: "جرينلاند",        icon: "🧊", adjacentIds: ["1", "3", "7", "8"], gridPos: { col: 4, row: 1 }, continent: 'north_america' },

  // EUROPE (Top Center-Right) - Row 1-2
  { id: "3",  name: "Scandinavia",   nameAr: "إسكندنافيا",      icon: "❄️", adjacentIds: ["2", "4", "8", "9"], gridPos: { col: 5, row: 1 }, continent: 'europe' },
  { id: "8",  name: "Britain",       nameAr: "بريطانيا",        icon: "💂", adjacentIds: ["2", "3", "7", "9", "14"], gridPos: { col: 4, row: 2 }, continent: 'europe' },
  { id: "9",  name: "Western Europe",nameAr: "أوروبا الغربية",  icon: "🍷", adjacentIds: ["3", "4", "8", "10", "14", "15"], gridPos: { col: 5, row: 2 }, continent: 'europe' },
  { id: "10", name: "Eastern Europe",nameAr: "أوروبا الشرقية", icon: "⛪", adjacentIds: ["3", "5", "9", "11", "15", "16"], gridPos: { col: 6, row: 2 }, continent: 'europe' },

  // ASIA (Right side) - Row 1-3
  { id: "4",  name: "Siberia",       nameAr: "سيبيريا",         icon: "🐻", adjacentIds: ["3", "5", "9", "10"], gridPos: { col: 6, row: 1, colSpan: 2 }, continent: 'asia' },
  { id: "5",  name: "Kamchatka",     nameAr: "كامتشاتكا",       icon: "🌋", adjacentIds: ["4", "0", "10", "11"], gridPos: { col: 8, row: 1 }, continent: 'asia' },
  { id: "11", name: "East Asia",     nameAr: "شرق آسيا",         icon: "🏯", adjacentIds: ["5", "10", "16", "17"], gridPos: { col: 8, row: 2 }, continent: 'asia' },
  { id: "16", name: "India",         nameAr: "الهند",           icon: "🛕", adjacentIds: ["10", "11", "15", "17", "21", "22"], gridPos: { col: 7, row: 3 }, continent: 'asia' },
  { id: "17", name: "Southeast Asia",nameAr: "جنوب شرق آسيا",   icon: "🎋", adjacentIds: ["11", "16", "22", "23"], gridPos: { col: 8, row: 3 }, continent: 'asia' },

  // AFRICA (Center-Bottom) - Row 3-4
  { id: "14", name: "North Africa",  nameAr: "شمال أفريقيا",    icon: "🐪", adjacentIds: ["8", "9", "13", "15", "20"], gridPos: { col: 4, row: 3, colSpan: 2 }, continent: 'africa' },
  { id: "15", name: "Middle East",   nameAr: "الشرق الأوسط",    icon: "🕌", adjacentIds: ["9", "10", "14", "16", "20", "21"], gridPos: { col: 6, row: 3 }, continent: 'africa' },
  { id: "20", name: "Central Africa",nameAr: "وسط أفريقيا",     icon: "🦁", adjacentIds: ["14", "15", "19", "21"], gridPos: { col: 5, row: 4 }, continent: 'africa' },
  { id: "21", name: "South Africa",  nameAr: "جنوب أفريقيا",     icon: "💎", adjacentIds: ["15", "16", "20", "22"], gridPos: { col: 6, row: 4 }, continent: 'africa' },
  { id: "22", name: "Madagascar",    nameAr: "مدغشقر",          icon: "🐒", adjacentIds: ["16", "17", "21", "23"], gridPos: { col: 7, row: 4 }, continent: 'africa' },

  // AUSTRALIA (Bottom Right) - Row 5
  { id: "23", name: "Australia",     nameAr: "أستراليا",         icon: "🦘", adjacentIds: ["17", "22"], gridPos: { col: 8, row: 5 }, continent: 'oceania' },
];

// Grid configuration for the map
export const MAP_CONFIG = {
  cols: 8,
  rows: 5,
  gap: 8,
};
