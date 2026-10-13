import type { Session, User } from "@supabase/supabase-js";
import type { ReactionType } from "@/constants/reactions";

export type GroupRole = "owner" | "admin" | "member";
export type RoundStatus = "active" | "closed";
export type VoteType = "foton";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  birthdate?: string | null;
  is_age_confirmed: boolean;
  accepted_terms_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SocialGroup = {
  id: string;
  name: string;
  avatar_url: string | null;
  owner_id: string;
  invite_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  role: GroupRole;
  muted: boolean;
  joined_at: string;
};

export type MyGroup = GroupMember & {
  group: SocialGroup;
};

export type Round = {
  id: string;
  group_id: string;
  created_by: string | null;
  title: string | null;
  status: RoundStatus;
  created_at: string;
  closes_at: string;
  closed_at: string | null;
  winner_moment_id: string | null;
};

export type RoundWithRelations = Round & {
  group?: SocialGroup | null;
  creator?: Profile | null;
  preview_url?: string | null;
  moment_count?: number;
};

export type Moment = {
  id: string;
  round_id: string;
  group_id: string;
  user_id: string;
  image_path: string;
  caption: string | null;
  drink_type: string | null;
  is_hidden: boolean;
  hidden_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type MomentWithStats = Moment & {
  author?: Profile | null;
  signedUrl?: string | null;
  reactionCounts: Record<ReactionType, number>;
  fotonCount: number;
  myFoton: boolean;
  hasMyReaction: Record<ReactionType, boolean>;
};

export type Reaction = {
  id: string;
  moment_id: string;
  round_id: string;
  group_id: string;
  user_id: string;
  type: ReactionType;
  created_at: string;
};

export type PhotoVote = {
  id: string;
  moment_id: string;
  round_id: string;
  group_id: string;
  voter_id: string;
  vote_type: VoteType;
  created_at: string;
  updated_at: string;
};

export type LeaderboardRow = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  score: number;
  rounds_started: number;
  moments_uploaded: number;
  participants_joined_my_rounds: number;
  reactions_received: number;
  fotons_received: number;
  winning_photos: number;
  participated_other_rounds: number;
};

export type DeviceToken = {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: "ios" | "android" | "unknown";
  device_name: string | null;
  app_version: string | null;
  build_number: string | null;
  created_at: string;
  last_seen_at: string;
};

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  profileError: Error | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  retryAuth: () => Promise<void>;
  signOut: () => Promise<void>;
};
