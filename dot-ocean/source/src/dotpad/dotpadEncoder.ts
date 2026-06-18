// Converts the game's integer grid to the hex string expected by DotPadSDK.displayGraphicData.
//
// SDK format: contiguous hex string where each 2 chars (1 byte) = one tactile cell.
//   'FF' = all pins raised, '00' = all pins flat.
// Data is row-major: row 0 first, each row has `deviceCols` bytes.
//
// Game grid values: 0=empty, 1=raised (fish/obstacle), 2=player, 3=danger

const RAISED = 'FF';
const FLAT   = '00';

export function encodeGrid(
  grid: number[][],
  deviceRows: number,
  deviceCols: number,
): string {
  const gameRows = grid.length;
  const gameCols = grid[0]?.length ?? 0;
  if (gameRows === 0 || gameCols === 0) return FLAT.repeat(deviceRows * deviceCols);

  let hex = '';
  for (let r = 0; r < deviceRows; r++) {
    const srcR = Math.min(Math.round(r * gameRows / deviceRows), gameRows - 1);
    const row = grid[srcR];
    for (let c = 0; c < deviceCols; c++) {
      const srcC = Math.min(Math.round(c * gameCols / deviceCols), gameCols - 1);
      hex += (row[srcC] ?? 0) > 0 ? RAISED : FLAT;
    }
  }
  return hex;
}
