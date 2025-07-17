// Utility function to safely execute Prisma operations
import { getErrorMessage } from "@/utils/utils";
import { User } from "@supabase/supabase-js";

export async function safePrismaOperation<T>(
  operation: () => Promise<T>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const result = await operation();
    return { data: result, error: null };
  } catch (error) {
    console.error("Prisma operation error:", error);
    
    // Handle specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;
      
      switch (prismaError.code) {
        case 'P2002':
          return { data: null, error: "A record with this information already exists" };
        case 'P2025':
          return { data: null, error: "Record not found" };
        case 'P2003':
          return { data: null, error: "Foreign key constraint failed" };
        case 'P2021':
          return { data: null, error: "Table does not exist in the database" };
        case 'P2022':
          return { data: null, error: "Column does not exist in the database" };
        default:
          return { data: null, error: `Database error: ${prismaError.message || 'Unknown error'}` };
      }
    }
    
    return { data: null, error: getErrorMessage(error) };
  }
}

export async function safeSupabaseUserOperation(
  operation: () => Promise<{ data: { user: User | null }; error: any }>
): Promise<{ data: User | null; error: string | null }> {
  try {
    const result = await operation();
    
    if (result.error) {
      console.error("Supabase user operation error:", result.error);
      return { data: null, error: result.error.message || 'Authentication error' };
    }
    
    return { data: result.data.user, error: null };
  } catch (error) {
    console.error("Supabase user operation exception:", error);
    return { data: null, error: getErrorMessage(error) };
  }
}

export async function safeSupabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const result = await operation();
    
    if (result.error) {
      console.error("Supabase operation error:", result.error);
      return { data: null, error: result.error.message || 'Supabase error' };
    }
    
    return { data: result.data, error: null };
  } catch (error) {
    console.error("Supabase operation exception:", error);
    return { data: null, error: getErrorMessage(error) };
  }
}