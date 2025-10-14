export interface CaloricInput {
  weight: number;
  height: number;
  age: number;
  sex: 'Masculin' | 'Feminin';
  activityLevel: string;
  totalCaloriesEaten: number;
  totalCaloriesBurned: number;
  goal: string;
  consumedProtein: number;
  consumedFats: number;
  consumedCarbs: number;
}

export interface CaloricData {
  tdee: number;
  adjustedCaloricNeed: number;
  caloriesLeft: number;
  dailyProtein: number;
  dailyFats: number;
  dailyCarbs: number;
  consumedProtein: number;
  consumedFats: number;
  consumedCarbs: number;
  waterGoal: number;
}

export function calculateCaloricData(input: CaloricInput): CaloricData {
  const {
    weight,
    height,
    age,
    sex,
    activityLevel,
    totalCaloriesEaten,
    totalCaloriesBurned,
    goal,
    consumedProtein,
    consumedFats,
    consumedCarbs,
  } = input;

  // Mifflin-St Jeor
  let bmr = 0;
  if (sex.toLowerCase() === 'masculin') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  let activityFactor = 1.2;
  const activity = activityLevel.toLowerCase();
  if (activity.includes('ușor')) { activityFactor = 1.375; }
  else if (activity.includes('moderat')) { activityFactor = 1.55; }
  else if (activity.includes('foarte')) { activityFactor = 1.725; }
  else if (activity.includes('extrem')) { activityFactor = 1.9; }

  const tdee = bmr * activityFactor;
  let adjustedCaloricNeed = tdee;
  const lowerGoal = goal.toLowerCase();
  if (lowerGoal.includes('slabire')) {
    adjustedCaloricNeed = tdee - 500;
  } else if (lowerGoal.includes('tonifiere') || lowerGoal.includes('recompunere')) {
    adjustedCaloricNeed = tdee * 0.9;
  } else if (lowerGoal.includes('masa') || lowerGoal.includes('îngrășare')) {
    adjustedCaloricNeed = tdee + 300;
  }
  if (adjustedCaloricNeed < 1200) {
    adjustedCaloricNeed = 1200;
  }
  const caloriesLeft = adjustedCaloricNeed - (totalCaloriesEaten - totalCaloriesBurned);
  let proteinPercent = 0.30, fatsPercent = 0.30, carbsPercent = 0.40;
  if (lowerGoal.includes('slabire') || lowerGoal.includes('slăbire')) {
    proteinPercent = 0.35;
    fatsPercent = 0.25;
    carbsPercent = 0.40;
  } else if (lowerGoal.includes('masa') || lowerGoal.includes('îngrășare')) {
    proteinPercent = 0.25;
    fatsPercent = 0.20;
    carbsPercent = 0.55;
  } else if (lowerGoal.includes('tonifiere') || lowerGoal.includes('recompunere') || lowerGoal.includes('menținere')) {
    proteinPercent = 0.30;
    fatsPercent = 0.25;
    carbsPercent = 0.45;
  }
  const dailyProtein = Math.round(adjustedCaloricNeed * proteinPercent / 4);
  const dailyFats = Math.round(adjustedCaloricNeed * fatsPercent / 9);
  const dailyCarbs = Math.round(adjustedCaloricNeed * carbsPercent / 4);
  let waterGoal = 30 * weight; // default= 30 ml/kg pt sedentar
  if (activity.includes('usor')) { waterGoal = 35 * weight; }
  else if (activity.includes('moderat')) { waterGoal = 40 * weight; }
  else if (activity.includes('foarte') || activity.includes('extrem')) { waterGoal = 50 * weight; }

  return {
    tdee: Math.round(tdee),
    adjustedCaloricNeed: Math.round(adjustedCaloricNeed),
    caloriesLeft: Math.round(caloriesLeft),
    dailyProtein,
    dailyFats,
    dailyCarbs,
    consumedProtein,
    consumedFats,
    consumedCarbs,
    waterGoal: Math.round(waterGoal),
  };
}
