export const convertItemToString = (item: string | number[] | string[]): string => {
  if (typeof item === 'string') {
    return item;
  }
  return item.join(', ');
};
