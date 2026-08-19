export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_role: string
          actor_type: string
          actor_user_id: string | null
          changes: Json
          created_at: string
          id: string
          ip_hash: string | null
          organization_id: string | null
          request_id: string | null
          summary: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_role: string
          actor_type: string
          actor_user_id?: string | null
          changes?: Json
          created_at?: string
          id?: string
          ip_hash?: string | null
          organization_id?: string | null
          request_id?: string | null
          summary: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_role?: string
          actor_type?: string
          actor_user_id?: string | null
          changes?: Json
          created_at?: string
          id?: string
          ip_hash?: string | null
          organization_id?: string | null
          request_id?: string | null
          summary?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_times: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string
          id: string
          organization_id: string
          reason: string | null
          staff_profile_id: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at: string
          id?: string
          organization_id: string
          reason?: string | null
          staff_profile_id: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          organization_id?: string
          reason?: string | null
          staff_profile_id?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_times_org_staff_fk"
            columns: ["organization_id", "staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      client_records: {
        Row: {
          created_at: string
          email_display: string
          email_normalized: string
          first_booked_at: string | null
          full_name: string
          id: string
          last_booked_at: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_display: string
          email_normalized: string
          first_booked_at?: string | null
          full_name: string
          id?: string
          last_booked_at?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_display?: string
          email_normalized?: string
          first_booked_at?: string | null
          full_name?: string
          id?: string
          last_booked_at?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          availability_completed_at: string | null
          booking_policies_completed_at: string | null
          business_identity_completed_at: string | null
          created_at: string
          location_completed_at: string | null
          organization_id: string
          publish_completed_at: string | null
          review_completed_at: string | null
          service_completed_at: string | null
          service_id: string | null
          staff_profile_completed_at: string | null
          staff_profile_id: string | null
          updated_at: string
        }
        Insert: {
          availability_completed_at?: string | null
          booking_policies_completed_at?: string | null
          business_identity_completed_at?: string | null
          created_at?: string
          location_completed_at?: string | null
          organization_id: string
          publish_completed_at?: string | null
          review_completed_at?: string | null
          service_completed_at?: string | null
          service_id?: string | null
          staff_profile_completed_at?: string | null
          staff_profile_id?: string | null
          updated_at?: string
        }
        Update: {
          availability_completed_at?: string | null
          booking_policies_completed_at?: string | null
          business_identity_completed_at?: string | null
          created_at?: string
          location_completed_at?: string | null
          organization_id?: string
          publish_completed_at?: string | null
          review_completed_at?: string | null
          service_completed_at?: string | null
          service_id?: string | null
          staff_profile_completed_at?: string | null
          staff_profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_service_fk"
            columns: ["organization_id", "service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "onboarding_progress_staff_fk"
            columns: ["organization_id", "staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email_normalized: string
          expires_at: string
          id: string
          invited_by: string
          last_sent_at: string
          organization_id: string
          revoked_at: string | null
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email_normalized: string
          expires_at: string
          id?: string
          invited_by: string
          last_sent_at?: string
          organization_id: string
          revoked_at?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email_normalized?: string
          expires_at?: string
          id?: string
          invited_by?: string
          last_sent_at?: string
          organization_id?: string
          revoked_at?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_by: string | null
          invited_email: string | null
          organization_id: string
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          invited_email?: string | null
          organization_id: string
          role: string
          status: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          invited_email?: string | null
          organization_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          booking_horizon_days: number
          cancellation_notice_minutes: number
          created_at: string
          guest_booking_enabled: boolean
          minimum_lead_minutes: number
          organization_id: string
          policy_text: string | null
          reminder_lead_minutes: number
          reschedule_notice_minutes: number
          slot_interval_minutes: number
          updated_at: string
        }
        Insert: {
          booking_horizon_days?: number
          cancellation_notice_minutes?: number
          created_at?: string
          guest_booking_enabled?: boolean
          minimum_lead_minutes?: number
          organization_id: string
          policy_text?: string | null
          reminder_lead_minutes?: number
          reschedule_notice_minutes?: number
          slot_interval_minutes?: number
          updated_at?: string
        }
        Update: {
          booking_horizon_days?: number
          cancellation_notice_minutes?: number
          created_at?: string
          guest_booking_enabled?: boolean
          minimum_lead_minutes?: number
          organization_id?: string
          policy_text?: string | null
          reminder_lead_minutes?: number
          reschedule_notice_minutes?: number
          slot_interval_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country_code: string | null
          created_at: string
          currency: string
          description: string | null
          email: string | null
          id: string
          logo_path: string | null
          name: string
          onboarding_step: string | null
          phone: string | null
          postal_code: string | null
          published_at: string | null
          region: string | null
          slug: string
          status: string
          suspended_at: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          currency: string
          description?: string | null
          email?: string | null
          id?: string
          logo_path?: string | null
          name: string
          onboarding_step?: string | null
          phone?: string | null
          postal_code?: string | null
          published_at?: string | null
          region?: string | null
          slug: string
          status?: string
          suspended_at?: string | null
          timezone: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_path?: string | null
          name?: string
          onboarding_step?: string | null
          phone?: string | null
          postal_code?: string | null
          published_at?: string | null
          region?: string | null
          slug?: string
          status?: string
          suspended_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_staff: {
        Row: {
          created_at: string
          is_active: boolean
          organization_id: string
          service_id: string
          staff_profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          organization_id: string
          service_id: string
          staff_profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          organization_id?: string
          service_id?: string
          staff_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_staff_org_service_fk"
            columns: ["organization_id", "service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "service_staff_org_staff_fk"
            columns: ["organization_id", "staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      services: {
        Row: {
          buffer_after_minutes: number
          created_at: string
          currency: string
          deposit_minor: number | null
          description: string | null
          duration_minutes: number
          id: string
          name: string
          organization_id: string
          payment_mode: string
          price_minor: number
          status: string
          updated_at: string
          visibility: string
        }
        Insert: {
          buffer_after_minutes?: number
          created_at?: string
          currency: string
          deposit_minor?: number | null
          description?: string | null
          duration_minutes: number
          id?: string
          name: string
          organization_id: string
          payment_mode?: string
          price_minor: number
          status?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          buffer_after_minutes?: number
          created_at?: string
          currency?: string
          deposit_minor?: number | null
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          organization_id?: string
          payment_mode?: string
          price_minor?: number
          status?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_org_currency_fk"
            columns: ["organization_id", "currency"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id", "currency"]
          },
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          is_public: boolean
          job_title: string | null
          membership_id: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_public?: boolean
          job_title?: string | null
          membership_id: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_public?: boolean
          job_title?: string | null
          membership_id?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_membership_fk"
            columns: ["organization_id", "membership_id"]
            isOneToOne: true
            referencedRelation: "organization_memberships"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "staff_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string
          phone: string | null
          platform_role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name: string
          phone?: string | null
          platform_role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string
          phone?: string | null
          platform_role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_availability: {
        Row: {
          created_at: string
          effective_from: string | null
          effective_until: string | null
          end_local: string
          id: string
          is_active: boolean
          organization_id: string
          staff_profile_id: string
          start_local: string
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          effective_from?: string | null
          effective_until?: string | null
          end_local: string
          id?: string
          is_active?: boolean
          organization_id: string
          staff_profile_id: string
          start_local: string
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          effective_from?: string | null
          effective_until?: string | null
          end_local?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          staff_profile_id?: string
          start_local?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_availability_org_staff_fk"
            columns: ["organization_id", "staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invitation: {
        Args: { target_invitation_id: string }
        Returns: string
      }
      complete_onboarding_review: {
        Args: { target_org_id: string }
        Returns: undefined
      }
      create_blocked_time: {
        Args: {
          target_ends_at: string
          target_reason?: string
          target_staff_profile_id: string
          target_starts_at: string
        }
        Returns: string
      }
      create_managed_service: {
        Args: {
          service_buffer: number
          service_description: string
          service_duration: number
          service_name: string
          service_price_minor: number
          target_org_id: string
        }
        Returns: string
      }
      create_team_invitation: {
        Args: { invite_email: string; target_org_id: string }
        Returns: string
      }
      create_weekly_availability: {
        Args: {
          target_end: string
          target_staff_profile_id: string
          target_start: string
          target_weekday: number
        }
        Returns: string
      }
      delete_blocked_time: {
        Args: { expected_updated_at: string; target_block_id: string }
        Returns: undefined
      }
      delete_weekly_availability: {
        Args: { expected_updated_at: string; target_interval_id: string }
        Returns: undefined
      }
      get_my_client_records: {
        Args: never
        Returns: {
          created_at: string
          email_display: string
          first_booked_at: string
          full_name: string
          id: string
          last_booked_at: string
          organization_id: string
          phone: string
          updated_at: string
        }[]
      }
      get_my_team_invitation: {
        Args: { target_invitation_id: string }
        Returns: Json
      }
      get_owner_team: { Args: { target_org_id: string }; Returns: Json }
      get_public_business: { Args: { public_slug: string }; Returns: Json }
      publish_organization: { Args: { target_org_id: string }; Returns: string }
      replace_onboarding_availability: {
        Args: { intervals: Json; target_org_id: string }
        Returns: undefined
      }
      resend_team_invitation: {
        Args: { target_invitation_id: string }
        Returns: string
      }
      revoke_team_invitation: {
        Args: { target_invitation_id: string }
        Returns: string
      }
      save_onboarding_booking_policies: {
        Args: {
          cancellation_minutes: number
          guests_enabled: boolean
          horizon_days: number
          interval_minutes: number
          lead_minutes: number
          reschedule_minutes: number
          target_org_id: string
          terms?: string
        }
        Returns: undefined
      }
      save_onboarding_business_identity: {
        Args: {
          business_name: string
          public_slug: string
          target_org_id: string
        }
        Returns: undefined
      }
      save_onboarding_location: {
        Args: {
          address1?: string
          address2?: string
          city_name: string
          country: string
          currency_code: string
          postal?: string
          region_name?: string
          target_org_id: string
          timezone_name: string
        }
        Returns: undefined
      }
      save_onboarding_service: {
        Args: {
          service_buffer: number
          service_description: string
          service_duration: number
          service_name: string
          service_price_minor: number
          target_org_id: string
        }
        Returns: string
      }
      save_onboarding_staff_profile: {
        Args: {
          public_visible?: boolean
          staff_bio?: string
          staff_job_title?: string
          staff_name: string
          target_org_id: string
        }
        Returns: string
      }
      set_managed_service_staff: {
        Args: {
          assigned: boolean
          target_service_id: string
          target_staff_id: string
        }
        Returns: boolean
      }
      set_managed_service_status: {
        Args: { desired_status: string; target_service_id: string }
        Returns: string
      }
      set_organization_logo: {
        Args: { object_path?: string; target_org_id: string }
        Returns: string
      }
      set_staff_avatar: {
        Args: {
          object_path?: string
          target_org_id: string
          target_staff_id: string
        }
        Returns: string
      }
      set_team_member_status: {
        Args: { desired_status: string; target_membership_id: string }
        Returns: string
      }
      start_owner_onboarding: { Args: never; Returns: string }
      unpublish_organization: {
        Args: { target_org_id: string }
        Returns: undefined
      }
      update_blocked_time: {
        Args: {
          expected_updated_at: string
          target_block_id: string
          target_ends_at: string
          target_reason: string
          target_starts_at: string
        }
        Returns: undefined
      }
      update_managed_service: {
        Args: {
          service_buffer: number
          service_description: string
          service_duration: number
          service_name: string
          service_price_minor: number
          target_service_id: string
        }
        Returns: string
      }
      update_team_member_profile: {
        Args: {
          expected_updated_at: string
          profile_bio: string
          profile_display_name: string
          profile_is_public: boolean
          profile_job_title: string
          target_membership_id: string
        }
        Returns: string
      }
      update_weekly_availability: {
        Args: {
          expected_updated_at: string
          target_end: string
          target_interval_id: string
          target_start: string
          target_weekday: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

