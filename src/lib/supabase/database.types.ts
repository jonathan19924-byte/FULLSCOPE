/**
 * Hand-written mirror of supabase/migrations/0001_init.sql.
 * Once the project is linked, regenerate with:
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 */

export interface Database {
  public: {
    Tables: {
      stories: {
        Row: {
          id: string;
          slug: string;
          title: string;
          category: string;
          summary: string;
          what_happened: string;
          timeline: unknown;
          perspective_a: unknown;
          perspective_b: unknown;
          key_differences_cause: string;
          key_differences_impact: string;
          sources: unknown;
          entities: unknown;
          published_at: string;
          reading_time_minutes: number;
          created_at: string;
          generated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["stories"]["Row"]> &
          Pick<
            Database["public"]["Tables"]["stories"]["Row"],
            | "slug"
            | "title"
            | "category"
            | "summary"
            | "what_happened"
            | "perspective_a"
            | "perspective_b"
            | "key_differences_cause"
            | "key_differences_impact"
            | "published_at"
          >;
        Update: Partial<Database["public"]["Tables"]["stories"]["Row"]>;
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          story_id: string;
          display_name: string;
          perspective: string;
          content: string;
          is_generated: boolean;
          like_count: number;
          reply_count: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["posts"]["Row"]> &
          Pick<
            Database["public"]["Tables"]["posts"]["Row"],
            "story_id" | "display_name" | "perspective" | "content"
          >;
        Update: Partial<Database["public"]["Tables"]["posts"]["Row"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          username: string | null;
          bio: string | null;
          preferences: unknown;
          approval_status: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> &
          Pick<Database["public"]["Tables"]["profiles"]["Row"], "user_id">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      page_views: {
        Row: {
          id: string;
          path: string;
          user_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["page_views"]["Row"]> &
          Pick<Database["public"]["Tables"]["page_views"]["Row"], "path">;
        Update: Partial<Database["public"]["Tables"]["page_views"]["Row"]>;
        Relationships: [];
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          followee_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["follows"]["Row"]> &
          Pick<Database["public"]["Tables"]["follows"]["Row"], "follower_id" | "followee_id">;
        Update: Partial<Database["public"]["Tables"]["follows"]["Row"]>;
        Relationships: [];
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          story_slug: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["bookmarks"]["Row"]> &
          Pick<
            Database["public"]["Tables"]["bookmarks"]["Row"],
            "user_id" | "story_slug"
          >;
        Update: Partial<Database["public"]["Tables"]["bookmarks"]["Row"]>;
        Relationships: [];
      };
      community_posts: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          related_story_slug: string | null;
          related_story_title: string | null;
          related_story_category: string | null;
          created_at: string;
          credited_at: string | null;
          moderation_checked_at: string | null;
          is_hidden: boolean;
          flagged_reason: string | null;
          media_url: string | null;
          media_status: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["community_posts"]["Row"]> &
          Pick<Database["public"]["Tables"]["community_posts"]["Row"], "user_id" | "content">;
        Update: Partial<Database["public"]["Tables"]["community_posts"]["Row"]>;
        Relationships: [];
      };
      community_post_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["community_post_likes"]["Row"]> &
          Pick<Database["public"]["Tables"]["community_post_likes"]["Row"], "post_id" | "user_id">;
        Update: Partial<Database["public"]["Tables"]["community_post_likes"]["Row"]>;
        Relationships: [];
      };
      community_post_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          moderation_checked_at: string | null;
          is_hidden: boolean;
          flagged_reason: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["community_post_comments"]["Row"]> &
          Pick<Database["public"]["Tables"]["community_post_comments"]["Row"], "post_id" | "user_id" | "content">;
        Update: Partial<Database["public"]["Tables"]["community_post_comments"]["Row"]>;
        Relationships: [];
      };
      post_contributions: {
        Row: {
          id: string;
          story_id: string;
          story_slug: string;
          post_ids: string[];
          theme: string;
          update_target: string;
          added_text: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["post_contributions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["post_contributions"]["Row"]>;
        Relationships: [];
      };
      story_updates: {
        Row: {
          id: string;
          story_id: string;
          story_slug: string;
          update_type: string;
          summary: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["story_updates"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["story_updates"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
