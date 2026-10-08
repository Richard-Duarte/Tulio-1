export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      app_secrets: {
        Row: {
          key: string;
          updated_at: string;
          value: string;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: string;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: string;
        };
        Relationships: [];
      };
      live_sets: {
        Row: {
          cover_url: string | null;
          created_at: string;
          description: string | null;
          duration_seconds: number | null;
          id: string;
          published: boolean;
          set_date: string | null;
          sort_order: number;
          title: string;
          updated_at: string;
          youtube_id: string;
          youtube_url: string;
        };
        Insert: {
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          duration_seconds?: number | null;
          id?: string;
          published?: boolean;
          set_date?: string | null;
          sort_order?: number;
          title: string;
          updated_at?: string;
          youtube_id: string;
          youtube_url: string;
        };
        Update: {
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          duration_seconds?: number | null;
          id?: string;
          published?: boolean;
          set_date?: string | null;
          sort_order?: number;
          title?: string;
          updated_at?: string;
          youtube_id?: string;
          youtube_url?: string;
        };
        Relationships: [];
      };
      media: {
        Row: {
          alt_text: string;
          created_at: string;
          captured_at: string | null;
          credit: string | null;
          downloadable: boolean;
          homepage_enabled: boolean;
          id: string;
          kind: Database["public"]["Enums"]["media_kind"];
          party_id: string | null;
          poster_url: string | null;
          presskit_enabled: boolean;
          public_url: string | null;
          sort_order: number;
          storage_bucket: string;
          storage_path: string;
          title: string;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          alt_text?: string;
          captured_at?: string | null;
          created_at?: string;
          credit?: string | null;
          downloadable?: boolean;
          homepage_enabled?: boolean;
          id?: string;
          kind: Database["public"]["Enums"]["media_kind"];
          party_id?: string | null;
          poster_url?: string | null;
          presskit_enabled?: boolean;
          public_url?: string | null;
          sort_order?: number;
          storage_bucket?: string;
          storage_path: string;
          title: string;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          alt_text?: string;
          captured_at?: string | null;
          created_at?: string;
          credit?: string | null;
          downloadable?: boolean;
          homepage_enabled?: boolean;
          id?: string;
          kind?: Database["public"]["Enums"]["media_kind"];
          party_id?: string | null;
          poster_url?: string | null;
          presskit_enabled?: boolean;
          public_url?: string | null;
          sort_order?: number;
          storage_bucket?: string;
          storage_path?: string;
          title?: string;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "media_party_id_fkey";
            columns: ["party_id"];
            isOneToOne: false;
            referencedRelation: "parties";
            referencedColumns: ["id"];
          },
        ];
      };
      parties: {
        Row: {
          created_at: string;
          happened_at: string | null;
          id: string;
          name: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          happened_at?: string | null;
          id?: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          happened_at?: string | null;
          id?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          id: string;
          updated_at?: string;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      release_links: {
        Row: {
          id: string;
          platform: string;
          release_id: string;
          sort_order: number;
          url: string;
        };
        Insert: {
          id?: string;
          platform: string;
          release_id: string;
          sort_order?: number;
          url: string;
        };
        Update: {
          id?: string;
          platform?: string;
          release_id?: string;
          sort_order?: number;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "release_links_release_id_fkey";
            columns: ["release_id"];
            isOneToOne: false;
            referencedRelation: "releases";
            referencedColumns: ["id"];
          },
        ];
      };
      release_sections: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          image_url: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      releases: {
        Row: {
          audio_url: string | null;
          cover_url: string | null;
          created_at: string;
          credits: string | null;
          description: string | null;
          download_enabled: boolean;
          download_url: string | null;
          id: string;
          published: boolean;
          released_at: string | null;
          sort_order: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          audio_url?: string | null;
          cover_url?: string | null;
          created_at?: string;
          credits?: string | null;
          description?: string | null;
          download_enabled?: boolean;
          download_url?: string | null;
          id?: string;
          published?: boolean;
          released_at?: string | null;
          sort_order?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          audio_url?: string | null;
          cover_url?: string | null;
          created_at?: string;
          credits?: string | null;
          description?: string | null;
          download_enabled?: boolean;
          download_url?: string | null;
          id?: string;
          published?: boolean;
          released_at?: string | null;
          sort_order?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sets: {
        Row: {
          audio_url: string | null;
          cover_url: string | null;
          created_at: string;
          description: string | null;
          duration_seconds: number | null;
          external_url: string | null;
          id: string;
          played_at: string | null;
          published: boolean;
          soundcloud_url: string | null;
          sort_order: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          audio_url?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          duration_seconds?: number | null;
          external_url?: string | null;
          id?: string;
          played_at?: string | null;
          published?: boolean;
          soundcloud_url?: string | null;
          sort_order?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          audio_url?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          duration_seconds?: number | null;
          external_url?: string | null;
          id?: string;
          played_at?: string | null;
          published?: boolean;
          soundcloud_url?: string | null;
          sort_order?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          artist_name: string;
          bandcamp_url: string | null;
          id: string;
          instagram_url: string | null;
          logo_url: string | null;
          player_enabled: boolean;
          player_shuffle: boolean;
          sets_shuffle: boolean;
          primary_hue: number;
          release_body: string;
          release_title: string;
          singleton_key: string;
          soundcloud_url: string | null;
          spotify_url: string | null;
          updated_at: string;
          youtube_url: string | null;
        };
        Insert: {
          artist_name?: string;
          bandcamp_url?: string | null;
          id?: string;
          instagram_url?: string | null;
          logo_url?: string | null;
          player_enabled?: boolean;
          player_shuffle?: boolean;
          sets_shuffle?: boolean;
          primary_hue?: number;
          release_body?: string;
          release_title?: string;
          singleton_key?: string;
          soundcloud_url?: string | null;
          spotify_url?: string | null;
          updated_at?: string;
          youtube_url?: string | null;
        };
        Update: {
          artist_name?: string;
          bandcamp_url?: string | null;
          id?: string;
          instagram_url?: string | null;
          logo_url?: string | null;
          player_enabled?: boolean;
          player_shuffle?: boolean;
          sets_shuffle?: boolean;
          primary_hue?: number;
          release_body?: string;
          release_title?: string;
          singleton_key?: string;
          soundcloud_url?: string | null;
          spotify_url?: string | null;
          updated_at?: string;
          youtube_url?: string | null;
        };
        Relationships: [];
      };
      tracks: {
        Row: {
          active: boolean;
          artist: string;
          audio_url: string;
          cover_url: string | null;
          created_at: string;
          id: string;
          sort_order: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          artist?: string;
          audio_url: string;
          cover_url?: string | null;
          created_at?: string;
          id?: string;
          sort_order?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          artist?: string;
          audio_url?: string;
          cover_url?: string | null;
          created_at?: string;
          id?: string;
          sort_order?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      upcoming_dates: {
        Row: {
          city: string | null;
          created_at: string;
          description: string | null;
          event_date: string;
          event_time: string | null;
          id: string;
          image_url: string | null;
          name: string;
          published: boolean;
          ticket_image_url: string | null;
          ticket_url: string | null;
          updated_at: string;
          venue: string | null;
        };
        Insert: {
          city?: string | null;
          created_at?: string;
          description?: string | null;
          event_date: string;
          event_time?: string | null;
          id?: string;
          image_url?: string | null;
          name: string;
          published?: boolean;
          ticket_image_url?: string | null;
          ticket_url?: string | null;
          updated_at?: string;
          venue?: string | null;
        };
        Update: {
          city?: string | null;
          created_at?: string;
          description?: string | null;
          event_date?: string;
          event_time?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          published?: boolean;
          ticket_image_url?: string | null;
          ticket_url?: string | null;
          updated_at?: string;
          venue?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "editor";
      media_kind: "image" | "video" | "audio";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor"],
      media_kind: ["image", "video", "audio"],
    },
  },
} as const;
