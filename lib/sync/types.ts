export type SyncTenderItem = {
  referenceId: string;
  title: string;
  description?: string;
  category: string;
  deadline: Date;
  url?: string;
  projectLabel: string;
  /** Raw portal status when the adapter knows it. */
  status?: string;
  /** False when the source had no real closing date. */
  hasHardDeadline?: boolean;
};
