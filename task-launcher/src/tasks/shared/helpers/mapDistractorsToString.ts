export const mapDistractorsToString = (distractors: string[] | number[]): string[] => {
  return distractors.map(d => d.toString());
}