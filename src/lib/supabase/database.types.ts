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
      };
      profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          preferences: unknown;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> &
          Pick<Database["public"]["Tables"]["profiles"]["Row"], "user_id">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          story_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["bookmarks"]["Row"]> &
          Pick<
            Database["public"]["Tables"]["bookmarks"]["Row"],
            "user_id" | "story_id"
          >;
        Update: Partial<Database["public"]["Tables"]["bookmarks"]["Row"]>;
      };
    };
  };
}
