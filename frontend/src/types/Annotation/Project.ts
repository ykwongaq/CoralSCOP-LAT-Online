import { type Data } from "./Data";
import { type Label } from "./Label";

export interface ProjectState {
  dataList: Data[];
  labels: Label[];
  projectName: string;
  /** SAM session UUID on the backend. Present when embeddings were uploaded. */
  sessionId?: string;
}
