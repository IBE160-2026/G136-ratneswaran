
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "abuse_counters": {
                  Row: {
                    "bucket": string,"hits": number,"key_hash": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"hits": number,"key_hash": string,"window_start": string
                  }
                  Update: {
                    "bucket"?: string,"hits"?: number,"key_hash"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"events": {
                  Row: {
                    "cancellation_note": string | null,"cancelled_at": string | null,"created_at": string,"description": string | null,"duration_minutes": number | null,"ends_at": string | null,"event_type": string | null,"guest_count": number | null,"guest_list_method": string | null,"id": string,"language": string | null,"name": string | null,"organizer_id": string,"published_at": string | null,"rsvp_due_date": string | null,"rsvp_wanted": boolean | null,"starts_at": string | null,"time_zone": string | null,"unknown_answers": (string)[],"venue_known": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cancellation_note"?: string | null,"cancelled_at"?: string | null,"created_at"?: string,"description"?: string | null,"duration_minutes"?: number | null,"ends_at"?: string | null,"event_type"?: string | null,"guest_count"?: number | null,"guest_list_method"?: string | null,"id"?: string,"language"?: string | null,"name"?: string | null,"organizer_id": string,"published_at"?: string | null,"rsvp_due_date"?: string | null,"rsvp_wanted"?: boolean | null,"starts_at"?: string | null,"time_zone"?: string | null,"unknown_answers"?: (string)[],"venue_known"?: boolean | null
                  }
                  Update: {
                    "cancellation_note"?: string | null,"cancelled_at"?: string | null,"created_at"?: string,"description"?: string | null,"duration_minutes"?: number | null,"ends_at"?: string | null,"event_type"?: string | null,"guest_count"?: number | null,"guest_list_method"?: string | null,"id"?: string,"language"?: string | null,"name"?: string | null,"organizer_id"?: string,"published_at"?: string | null,"rsvp_due_date"?: string | null,"rsvp_wanted"?: boolean | null,"starts_at"?: string | null,"time_zone"?: string | null,"unknown_answers"?: (string)[],"venue_known"?: boolean | null
                  }
                  Relationships: [
                    
                  ]
                },"guest_contacts": {
                  Row: {
                    "email": string,"event_id": string,"guest_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "email": string,"event_id": string,"guest_id": string
                  }
                  Update: {
                    "email"?: string,"event_id"?: string,"guest_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "guest_contacts_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "guest_contacts_guest_id_event_id_fkey"
      columns: ["guest_id","event_id"]
isOneToOne: false
      referencedRelation: "guests"
      referencedColumns: ["id","event_id"]
    }
                  ]
                },"guests": {
                  Row: {
                    "created_at": string,"event_id": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"event_id": string,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"event_id"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "guests_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    }
                  ]
                },"invite_tokens": {
                  Row: {
                    "consumed_at": string | null,"created_at": string,"created_by": string | null,"event_id": string,"id": string,"kind": Database["public"]['Enums']["invite_kind"],"revoked_at": string | null,"role_id": string | null,"token_hash": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "consumed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"event_id": string,"id"?: string,"kind": Database["public"]['Enums']["invite_kind"],"revoked_at"?: string | null,"role_id"?: string | null,"token_hash": string,"user_id"?: string | null
                  }
                  Update: {
                    "consumed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"event_id"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["invite_kind"],"revoked_at"?: string | null,"role_id"?: string | null,"token_hash"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "invite_tokens_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invite_tokens_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    }
                  ]
                },"role_members": {
                  Row: {
                    "created_at": string,"email": string,"event_id": string,"id": string,"invited_by": string | null,"joined_at": string | null,"name": string,"role_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"event_id": string,"id"?: string,"invited_by"?: string | null,"joined_at"?: string | null,"name": string,"role_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"event_id"?: string,"id"?: string,"invited_by"?: string | null,"joined_at"?: string | null,"name"?: string,"role_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "role_members_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "role_members_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    }
                  ]
                },"role_membership_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"event_id": string | null,"id": string,"role_id": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"event_id"?: string | null,"id"?: string,"role_id"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"event_id"?: string | null,"id"?: string,"role_id"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "role_membership_log_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "role_membership_log_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    }
                  ]
                },"roles": {
                  Row: {
                    "active": boolean,"event_id": string,"id": string,"key": Database["public"]['Enums']["role_key"],"toggled_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"event_id": string,"id"?: string,"key": Database["public"]['Enums']["role_key"],"toggled_at"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"event_id"?: string,"id"?: string,"key"?: Database["public"]['Enums']["role_key"],"toggled_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "roles_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "abuse_hit":
{ Args: { "p_bucket": string,"p_key_hash": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"events_cancel":
{ Args: { "p_event_id": string,"p_note": string }; Returns: undefined
                           },
"events_create":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"events_delete":
{ Args: { "p_event_id": string }; Returns: undefined
                           },
"events_invite_preview":
{ Args: { "p_token": string }; Returns: {
              "email": string,"event_id": string,"event_name": string,"has_account": boolean,"name": string,"role_key": Database["public"]['Enums']["role_key"],"status": string
            }[]
                           },
"events_invite_to_role":
{ Args: { "p_email": string,"p_name": string,"p_replaces"?: string,"p_role_id": string }; Returns: {
              "status": string,"token": string
            }[]
                           },
"events_join_role":
{ Args: { "p_token": string,"p_user_id": string }; Returns: {
              "event_id": string,"status": string
            }[]
                           },
"events_publish":
{ Args: { "p_event_id": string }; Returns: undefined
                           },
"events_save_questionnaire":
{ Args: { "p_default_roles"?: (Database["public"]['Enums']["role_key"])[],"p_duration_minutes": number,"p_event_id": string,"p_event_type": string,"p_guest_count": number,"p_guest_list_method": string,"p_language": string,"p_rsvp_due_date": string,"p_rsvp_wanted": boolean,"p_starts_local": string,"p_time_zone": string,"p_unknown_answers": (string)[],"p_venue_known": boolean }; Returns: undefined
                           },
"events_set_role_active":
{ Args: { "p_active": boolean,"p_role_id": string }; Returns: undefined
                           },
"events_update_schedule":
{ Args: { "p_ends_local": string,"p_event_id": string,"p_language": string,"p_rsvp_due_date": string,"p_starts_local": string,"p_time_zone": string }; Returns: undefined
                           },
"guests_add":
{ Args: { "p_event_id": string,"p_rows": Json }; Returns: (string)[]
                           },
"guests_remove":
{ Args: { "p_guest_id": string }; Returns: undefined
                           },
"guests_update":
{ Args: { "p_email": string,"p_guest_id": string,"p_name": string }; Returns: undefined
                           },
"invite_tokens_check_cap":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"invite_tokens_create":
{ Args: { "p_event_id": string,"p_kind": Database["public"]['Enums']["invite_kind"],"p_role_id"?: string,"p_user_id"?: string }; Returns: string
                           },
"invite_tokens_lookup":
{ Args: { "p_token": string }; Returns: {
              "event_id": string,"kind": Database["public"]['Enums']["invite_kind"],"role_id": string,"status": string,"token_id": string,"user_id": string
            }[]
                           },
"invite_tokens_revoke_for_user":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"invite_tokens_validate":
{ Args: { "p_event_id": string,"p_kind": Database["public"]['Enums']["invite_kind"],"p_token": string }; Returns: {
              "event_id": string,"kind": Database["public"]['Enums']["invite_kind"],"role_id": string,"status": string,"token_id": string,"user_id": string
            }[]
                           },
"is_organizer":
{ Args: { "p_event_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "invite_kind": "guest"|"role_holder"|"shared_event","role_key": "venue"|"guests"|"food_beverage"|"entertainment"|"travel_logistics"|"program"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "invite_kind": ["guest", "role_holder", "shared_event"],"role_key": ["venue", "guests", "food_beverage", "entertainment", "travel_logistics", "program"]
          }
        }
} as const
