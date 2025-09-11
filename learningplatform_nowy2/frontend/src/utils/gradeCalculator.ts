/**
 * Funkcja do obliczania oceny na podstawie procentów
 * Skala ocen: 1-5 (jak w polskich szkołach)
 * 
 * @param percentage - Procent uzyskany z quizu (0-100)
 * @returns Ocena w skali 1-5
 */
export function calculateGradeFromPercentage(percentage: number): number {
  if (percentage >= 90) return 5; // 90-100% = 5
  if (percentage >= 75) return 4; // 75-89% = 4
  if (percentage >= 60) return 3; // 60-74% = 3
  if (percentage >= 40) return 2; // 40-59% = 2
  return 1; // 0-39% = 1
}

/**
 * Funkcja do uzyskania opisu oceny
 * 
 * @param grade - Ocena w skali 1-5
 * @returns Opis oceny
 */
export function getGradeDescription(grade: number): string {
  const descriptions = {
    5: "Bardzo dobry",
    4: "Dobry", 
    3: "Dostateczny",
    2: "Dopuszczający",
    1: "Niedostateczny"
  };
  
  return descriptions[grade as keyof typeof descriptions] || "Nieznana";
}

/**
 * Funkcja do uzyskania koloru oceny
 * 
 * @param grade - Ocena w skali 1-5
 * @returns Klasy CSS dla koloru
 */
export function getGradeColor(grade: number): string {
  const colors = {
    5: "bg-green-500 text-white",
    4: "bg-blue-500 text-white", 
    3: "bg-yellow-500 text-white",
    2: "bg-orange-500 text-white",
    1: "bg-red-500 text-white"
  };
  
  return colors[grade as keyof typeof colors] || "bg-gray-500 text-white";
}


