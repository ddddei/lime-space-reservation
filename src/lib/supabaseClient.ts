import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminApplicationRow,
  AdminBlockRow,
  AdminParticipantRow,
  AdminVerificationRow,
  OperatingHourRow,
  ParticipantVerificationRow,
  SpaceImageRow,
  SpaceRow,
  SubmitReservationSessionInput,
} from "./supabaseMappers";

type ReservationDatabase = {
  readonly public: {
    readonly Tables: {
      readonly spaces: {
        readonly Row: SpaceRow;
        readonly Insert: never;
        readonly Update: never;
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
      readonly get_admin_applications: {
        readonly Args: {
          readonly input_admin_name: string;
          readonly input_admin_phone: string;
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
      readonly update_participant_reservation_approval: {
        readonly Args: {
          readonly input_admin_name: string;
          readonly input_admin_phone: string;
          readonly input_participant_id: string;
          readonly input_is_approved: boolean;
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
