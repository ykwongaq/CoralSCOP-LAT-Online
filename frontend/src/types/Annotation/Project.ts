import { type Data } from "./Data";
import { type Label } from "./Label";

export interface ProjectState {
  dataList: Data[];
  labels: Label[];
  projectName: string;
  /** SAM session UUID on the backend. Present when embeddings were uploaded. */
  sessionId?: string;
  /** Original .coral File object. Held so save can reuse images/embeddings without re-downloading. */
  sourceFile?: File;
}
