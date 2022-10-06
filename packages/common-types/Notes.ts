export enum BackgroundTypes {
  blank = "blank",
  pdf = "pdf",
  grid = "grid",
  lines = "lines",
  cornell = "cornell",
}

export type BackgroundOptions = {
  fileHash?: string;
  spacing?: number;
};
