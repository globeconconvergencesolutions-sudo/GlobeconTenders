export type SyncTenderItem = {
  referenceId: string;
  title: string;
  description?: string;
  category: string;
  deadline: Date;
  url?: string;
  projectLabel: string;
};
