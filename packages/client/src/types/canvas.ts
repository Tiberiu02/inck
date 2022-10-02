import { SerializedGraphic } from "../canvas/Drawing/Graphic";

export type NoteData = {
  id: string;
  canWrite: boolean;
  strokes: SerializedGraphic[];
  creationDate: number;
};
