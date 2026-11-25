/**
 * Splits rows, in order, into runs of consecutive rows that belong together; each run becomes one
 * sub-timeline. A row joins the current run when belongsWith(firstRowOfRun, row) is true.
 */
export function groupConsecutiveRows<Row>(rows: Row[], belongsWith: (runStart: Row, row: Row) => boolean): Row[][] {
  const groups: Row[][] = [];
  for (const row of rows) {
    const currentGroup = groups[groups.length - 1];
    if (currentGroup && belongsWith(currentGroup[0], row)) {
      currentGroup.push(row);
    } else {
      groups.push([row]);
    }
  }
  return groups;
}
