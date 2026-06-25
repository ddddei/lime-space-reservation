import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminBlockRow,
  AdminVerificationRow,
  OperatingHourRow,
  ParticipantVerificationRow,
  SpaceRow,
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
