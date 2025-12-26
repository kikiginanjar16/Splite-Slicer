
export interface SpriteRect {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
  name?: string;
  blob?: Blob;
  url?: string;
}

export enum SlicingMode {
  AUTO = 'AUTO',
  GRID = 'GRID'
}

export interface GridSettings {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  padding: number;
  margin: number;
}
