/**
 * Funkcja do obliczania oceny na podstawie procentów
 * Skala ocen: 2-6 (jak w polskich szkołach)
 * 
 * @param percentage - Procent uzyskany z quizu (0-100)
 * @returns Ocena w skali 2-6
 */
export function calculateGradeFromPercentage(percentage: number): number {
  if (percentage > 90) return 6; // powyżej 90% = 6 (celujący)
  if (percentage >= 80) return 5; // 80-90% = 5 (bardzo dobry)
  if (percentage >= 65) return 4; // 65-79% = 4 (dobry)
  if (percentage >= 50) return 3; // 50-64% = 3 (dostateczny)
  if (percentage >= 35) return 2; // 35-49% = 2 (dopuszczający)
  return 1; // poniżej 35% = 1 (niedostateczny)
}

/**
 * Funkcja do uzyskania opisu oceny
 * 
 * @param grade - Ocena w skali 1-6
 * @returns Opis oceny
 */
export function getGradeDescription(grade: number): string {
  const descriptions = {
    6: "Celujący",
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
 * @param grade - Ocena w skali 1-6
 * @returns Klasy CSS dla koloru
 */
export function getGradeColor(grade: number): string {
  const colors = {
    6: "bg-purple-600 text-white", // Celujący - fioletowy
    5: "bg-green-500 text-white",  // Bardzo dobry - zielony
    4: "bg-blue-500 text-white",   // Dobry - niebieski
    3: "bg-yellow-500 text-white", // Dostateczny - żółty
    2: "bg-orange-500 text-white", // Dopuszczający - pomarańczowy
    1: "bg-red-500 text-white"     // Niedostateczny - czerwony
  };
  
  return colors[grade as keyof typeof colors] || "bg-gray-500 text-white";
}






