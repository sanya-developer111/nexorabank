export interface WeightedOption<T> {
  value: T;
  weight: number;
}

export function weightedRandom<T>(options: WeightedOption<T>[]): T {
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  let random = Math.random() * totalWeight;
  for (const option of options) {
    random -= option.weight;
    if (random <= 0) return option.value;
  }
  return options[options.length - 1].value;
}

export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
