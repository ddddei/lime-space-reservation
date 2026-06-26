import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminApplicationRow,
  AdminBlockInsert,
  AdminBlockRow,
  AdminBlockUpdate,
  AdminParticipantRow,
  AdminVerificationRow,
  CancelReservationRow,
  MeetingRow,
  OperatingHourRow,
  ParticipantVerificationRow,
  ReservationSessionRow,
  SpaceImageRow,
  SpaceRow,
  SpaceUpdate,
  SubmitReservationSessionInput,
} from "./supabaseMappers";

type ReservationDatabase = {
  readonly public: {
    readonly Tables: {
      readonly spaces: {
        readonly Row: SpaceRow;
        readonly Insert: never;
        readonly Update: SpaceUpdate;
        readonly Relationships: [];
      };
      readonly space_images: {
        readonly Row: SpaceImageRow;
        readonly Insert: never;
        readonly Update: never;
        readonly Relationships: [];
      };
      readonly operating_hours: {
        readonly Row: OperatingHourRow;
        readonly Insert: never;
        readonly Update: never;
        readonly Relationships: [];
      };
      readonly admin_blocks: {
        readonly Row: AdminBlockRow;
        readonly Insert: AdminBlockInsert;
        readonly Update: AdminBlockUpdate;
        readonly Relationships: [];
      };
      readonly meetings: {
        readonly Row: MeetingRow;
        readonly Insert: never;
        readonly Update: never;
        readonly Relationships: [];
      };
      readonly sessions: {
        readonly Row: ReservationSessionRow;
        readonly Insert: never;
        readonly Update: never;
        readonly Relationships: [];
      };
    };
    readonly Views: Record<string, never>;
    readonly Functions: {
      readonly verify_participant: {
        readonly Args: {
          readonly input_name: string;
          readonly input_phone: string;
        };
        readonly Returns: ParticipantVerificationRow | ParticipantVerificationRow[] | null;
      };
      readonly verify_admin: {
        readonly Args: {
          readonly input_name: string;
          readonly input_phone: string;
        };
        readonly Returns: AdminVerificationRow | AdminVerificationRow[] | null;
      };
      readonly is_valid_admin: {
        readonly Args: {
          readonly input_name: string;
          readonly input_phone: string;
        };
        readonly Returns: boolean | readonly { readonly is_valid: boolean }[] | null;
      };
      readonly get_admin_participants: {
        readonly Args: {
          readonly input_admin_name: string;
          readonly input_admin_phone: string;
        };
        readonly Returns: AdminParticipantRow[];
      };
      readonly get_admin_spaces: {
        readonly Args: {
          readonly input_admin_name: string;
          readonly input_admin_phone: string;
        };
        readonly Returns: SpaceRow[];
      };
      readonly update_admin_space: {
        readonly Args: {
          readonly input_admin_name: string;
          readonly input_admin_phone: string;
          readonly input_space_id: string;
          readonly input_name: string;
          readonly input_capacity: number;
          readonly input_description: string;
          readonly input_image_url: string;
          readonly input_features: readonly string[];
          readonly input_is_active: boolean;
          readonly input_is_public_visible: boolean;
          readonly input_parent_space_name: string;
          readonly input_admin_memo: string;
        };
        readonly Returns: SpaceRow[] | null;
      };
      readonly get_admin_applications: {
        readonly Args: {
          readonly input_admin_name: string;
          readonly input_admin_phone: string;
        };
        readonly Returns: AdminApplicationRow[];
      };
      readonly get_participant_applications: {
        readonly Args: {
          readonly input_participant_id: string;
        };
        readonly Returns: AdminApplicationRow[];
      };
      readonly get_admin_blocks: {
        readonly Args: {
          readonly input_admin_name: string;
          readonly input_admin_phone: string;
        };
        readonly Returns: AdminBlockRow[];
      };
      readonly upsert_admin_block: {
        readonly Args: {
          readonly input_admin_name: string;
          readonly input_admin_phone: string;
          readonly input_block_id: string | null;
          readonly input_space_id: string;
          readonly input_date: string;
          readonly input_start_time: string;
          readonly input_end_time: string;
          readonly input_reason: string;
        };
        readonly Returns: AdminBlockRow[] | null;
      };
      readonly deactivate_admin_block: {
        readonly Args: {
          readonly input_admin_name: string;
          readonly input_admin_phone: string;
          readonly input_block_id: string;
        };
        readonly Returns: AdminBlockRow[] | null;
      };
      readonly get_public_active_sessions: {
        readonly Args: Record<string, never>;
        readonly Returns: ReservationSessionRow[];
      };
      readonly update_participant_reservation_approval: {
        readonly Args: {
          readonly input_admin_name: string;
          readonly input_admin_phone: string;
          readonly input_participant_id: string;
          readonly input_is_approved: boolean;
        };
        readonly Returns: AdminParticipantRow | AdminParticipantRow[] | null;
      };
      readonly update_participant_level: {
        readonly Args: {
          readonly input_admin_name: string;
          readonly input_admin_phone: string;
          readonly input_participant_id: string;
          readonly input_level: number;
        };
        readonly Returns: AdminParticipantRow | AdminParticipantRow[] | null;
      };
      readonly submit_reservation_application: {
        readonly Args: {
          readonly input_participant_id: string;
          readonly input_meeting_name: string;
          readonly input_sessions: readonly SubmitReservationSessionInput[];
        };
        readonly Returns: AdminApplicationRow[] | null;
      };
      readonly cancel_reservation_application: {
        readonly Args: {
          readonly input_meeting_id: string;
          readonly input_actor_type: string;
          readonly input_actor_name: string;
          readonly input_actor_phone: string;
        };
        readonly Returns: CancelReservationRow | CancelReservationRow[] | null;
      };
      readonly cancel_reservation_session: {
        readonly Args: {
          readonly input_session_id: string;
          readonly input_participant_id?: string | null;
          readonly input_admin_name?: string | null;
          readonly input_admin_phone?: string | null;
        };
        readonly Returns: AdminApplicationRow[] | null;
      };
    };
    readonly Enums: Record<string, never>;
    readonly CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabaseClient: SupabaseClient<ReservationDatabase> | undefined = isSupabaseConfigured
  ? createClient<ReservationDatabase>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : undefined;
