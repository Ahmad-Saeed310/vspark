export type Caption = { caption: string; hashtags: string[] };
export type ScheduledPost = {
  id: string;
  caption: string;
  hashtags: string[];
  scheduledAt: string;
  status: "scheduled";
  createdAt: string;
  notifiedAt?: string;
};
export type NotificationPreferences = { enabled: boolean; email: string };
export type DriveData = { posts: ScheduledPost[]; preferences: NotificationPreferences };
