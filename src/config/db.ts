import supabase from "./supabase";

export async function testConnection(): Promise<void> {
  try {
    const { error } = await supabase.from("users").select("id").limit(1);

    if (error) {
      console.error("Database connection failed:", error.message);
    } else {
      console.log("Database connection successful");
    }
  } catch (err) {
    console.error("Database connection error:", err);
  }
}
