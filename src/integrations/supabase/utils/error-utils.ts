
// Helper function to handle errors from Supabase operations
export const handleSupabaseError = (error: any, defaultMessage = "An error occurred"): string => {
  console.error("Supabase operation error:", error);
  return error?.message || defaultMessage;
};
