export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      combat_encounters: {
        Row: {
          created_at: string
          id: string
          log: Json
          resolved_at: string | null
          room_index: number
          round_pointer: number
          run_id: string
          state: Json
          status: string
          turn_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          log?: Json
          resolved_at?: string | null
          room_index: number
          round_pointer?: number
          run_id: string
          state?: Json
          status?: string
          turn_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          log?: Json
          resolved_at?: string | null
          room_index?: number
          round_pointer?: number
          run_id?: string
          state?: Json
          status?: string
          turn_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "combat_encounters_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "dungeon_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      dungeon_runs: {
        Row: {
          catch_chance: number | null
          catch_roll: number | null
          catch_succeeded: boolean | null
          caught_monster_id: string | null
          completed_at: string | null
          current_room_index: number
          dungeon_id: string
          expected_turns_per_room: number
          gold_awarded: number
          id: string
          owner_id: string
          performance: number | null
          rng_cursor: number
          rng_seed: number
          rooms: Json
          scrap_awarded: Json
          started_at: string
          status: string
          team_snapshot: Json
          total_expected_turns: number
          total_turns: number
          xp_awarded: number
        }
        Insert: {
          catch_chance?: number | null
          catch_roll?: number | null
          catch_succeeded?: boolean | null
          caught_monster_id?: string | null
          completed_at?: string | null
          current_room_index?: number
          dungeon_id: string
          expected_turns_per_room?: number
          gold_awarded?: number
          id?: string
          owner_id: string
          performance?: number | null
          rng_cursor?: number
          rng_seed?: number
          rooms?: Json
          scrap_awarded?: Json
          started_at?: string
          status?: string
          team_snapshot?: Json
          total_expected_turns?: number
          total_turns?: number
          xp_awarded?: number
        }
        Update: {
          catch_chance?: number | null
          catch_roll?: number | null
          catch_succeeded?: boolean | null
          caught_monster_id?: string | null
          completed_at?: string | null
          current_room_index?: number
          dungeon_id?: string
          expected_turns_per_room?: number
          gold_awarded?: number
          id?: string
          owner_id?: string
          performance?: number | null
          rng_cursor?: number
          rng_seed?: number
          rooms?: Json
          scrap_awarded?: Json
          started_at?: string
          status?: string
          team_snapshot?: Json
          total_expected_turns?: number
          total_turns?: number
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "dungeon_runs_caught_monster_id_fkey"
            columns: ["caught_monster_id"]
            isOneToOne: false
            referencedRelation: "monsters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dungeon_runs_dungeon_id_fkey"
            columns: ["dungeon_id"]
            isOneToOne: false
            referencedRelation: "dungeons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dungeon_runs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dungeons: {
        Row: {
          base_catch_rate: number
          boss_species_id: string | null
          created_at: string
          description: string | null
          difficulty_tier: number
          enemies_per_room: number
          enemy_level: number
          enemy_species_ids: string[]
          gold_reward: number
          id: string
          name: string
          room_layout: Json
        }
        Insert: {
          base_catch_rate?: number
          boss_species_id?: string | null
          created_at?: string
          description?: string | null
          difficulty_tier: number
          enemies_per_room?: number
          enemy_level?: number
          enemy_species_ids?: string[]
          gold_reward?: number
          id?: string
          name: string
          room_layout?: Json
        }
        Update: {
          base_catch_rate?: number
          boss_species_id?: string | null
          created_at?: string
          description?: string | null
          difficulty_tier?: number
          enemies_per_room?: number
          enemy_level?: number
          enemy_species_ids?: string[]
          gold_reward?: number
          id?: string
          name?: string
          room_layout?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dungeons_boss_species_id_fkey"
            columns: ["boss_species_id"]
            isOneToOne: false
            referencedRelation: "monster_species"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          item_id: string
          owner_id: string
          quantity: number
        }
        Insert: {
          item_id: string
          owner_id: string
          quantity?: number
        }
        Update: {
          item_id?: string
          owner_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_instances: {
        Row: {
          acquired_at: string
          id: string
          item_id: string
          owner_id: string
          reforge_level: number
        }
        Insert: {
          acquired_at?: string
          id?: string
          item_id: string
          owner_id: string
          reforge_level?: number
        }
        Update: {
          acquired_at?: string
          id?: string
          item_id?: string
          owner_id?: string
          reforge_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_instances_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          drop_weight: number
          effect: Json
          id: string
          name: string
          rarity: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          drop_weight?: number
          effect?: Json
          id?: string
          name: string
          rarity?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          drop_weight?: number
          effect?: Json
          id?: string
          name?: string
          rarity?: string
        }
        Relationships: []
      }
      monster_species: {
        Row: {
          ability_pool: Json
          base_stats: Json
          created_at: string
          element: string
          emoji: string
          id: string
          min_tier: number
          name: string
          rarity: number
          signature_ability: string
        }
        Insert: {
          ability_pool?: Json
          base_stats?: Json
          created_at?: string
          element?: string
          emoji?: string
          id?: string
          min_tier?: number
          name: string
          rarity?: number
          signature_ability?: string
        }
        Update: {
          ability_pool?: Json
          base_stats?: Json
          created_at?: string
          element?: string
          emoji?: string
          id?: string
          min_tier?: number
          name?: string
          rarity?: number
          signature_ability?: string
        }
        Relationships: []
      }
      monsters: {
        Row: {
          abilities: Json
          caught_at: string
          current_hp: number | null
          equipped_instance_id: string | null
          equipped_item_id: string | null
          healing_until: string | null
          id: string
          is_starter: boolean
          level: number
          owner_id: string
          species_id: string
          stats: Json
          team_slot: number | null
          xp: number
        }
        Insert: {
          abilities?: Json
          caught_at?: string
          current_hp?: number | null
          equipped_instance_id?: string | null
          equipped_item_id?: string | null
          healing_until?: string | null
          id?: string
          is_starter?: boolean
          level?: number
          owner_id: string
          species_id: string
          stats?: Json
          team_slot?: number | null
          xp?: number
        }
        Update: {
          abilities?: Json
          caught_at?: string
          current_hp?: number | null
          equipped_instance_id?: string | null
          equipped_item_id?: string | null
          healing_until?: string | null
          id?: string
          is_starter?: boolean
          level?: number
          owner_id?: string
          species_id?: string
          stats?: Json
          team_slot?: number | null
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "monsters_equipped_instance_id_fkey"
            columns: ["equipped_instance_id"]
            isOneToOne: false
            referencedRelation: "item_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monsters_equipped_item_id_fkey"
            columns: ["equipped_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monsters_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monsters_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "monster_species"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bootstrapped: boolean
          created_at: string
          currency: number
          id: string
          reforge_rng_cursor: number
          reforge_rng_seed: number
          scrap_common: number
          scrap_epic: number
          scrap_legendary: number
          scrap_rare: number
          username: string
        }
        Insert: {
          bootstrapped?: boolean
          created_at?: string
          currency?: number
          id: string
          reforge_rng_cursor?: number
          reforge_rng_seed?: number
          scrap_common?: number
          scrap_epic?: number
          scrap_legendary?: number
          scrap_rare?: number
          username: string
        }
        Update: {
          bootstrapped?: boolean
          created_at?: string
          currency?: number
          id?: string
          reforge_rng_cursor?: number
          reforge_rng_seed?: number
          scrap_common?: number
          scrap_epic?: number
          scrap_legendary?: number
          scrap_rare?: number
          username?: string
        }
        Relationships: []
      }
      reforge_attempts: {
        Row: {
          chance: number
          created_at: string
          from_level: number
          id: string
          instance_id: string
          owner_id: string
          rng_cursor: number
          rng_seed: number
          roll: number
          scrap_rarity: string
          success: boolean
          target_level: number
        }
        Insert: {
          chance: number
          created_at?: string
          from_level: number
          id?: string
          instance_id: string
          owner_id: string
          rng_cursor: number
          rng_seed: number
          roll: number
          scrap_rarity: string
          success: boolean
          target_level: number
        }
        Update: {
          chance?: number
          created_at?: string
          from_level?: number
          id?: string
          instance_id?: string
          owner_id?: string
          rng_cursor?: number
          rng_seed?: number
          roll?: number
          scrap_rarity?: string
          success?: boolean
          target_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "reforge_attempts_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "item_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      run_room_results: {
        Row: {
          choice: string | null
          item_id: string | null
          room_index: number
          room_type: string
          run_id: string
          turns: number | null
        }
        Insert: {
          choice?: string | null
          item_id?: string | null
          room_index: number
          room_type: string
          run_id: string
          turns?: number | null
        }
        Update: {
          choice?: string | null
          item_id?: string | null
          room_index?: number
          room_type?: string
          run_id?: string
          turns?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "run_room_results_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_room_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "dungeon_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_purchases: {
        Row: {
          hour_bucket: number
          item_id: string | null
          owner_id: string
          price_paid: number
          purchased_at: string
          quantity: number
          scrap_rarity: string | null
          slot_index: number
        }
        Insert: {
          hour_bucket: number
          item_id?: string | null
          owner_id: string
          price_paid: number
          purchased_at?: string
          quantity?: number
          scrap_rarity?: string | null
          slot_index: number
        }
        Update: {
          hour_bucket?: number
          item_id?: string | null
          owner_id?: string
          price_paid?: number
          purchased_at?: string
          quantity?: number
          scrap_rarity?: string | null
          slot_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
