import { createClient, type Session, type User } from "@supabase/supabase-js";

// Proyecto Supabase "somber-ai-studio". Ambos valores son públicos por diseño
// (van en el JS de la web); la seguridad está en RLS (supabase/001_schema.sql).
// Se pueden sobrescribir con VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
const DEFAULT_URL = "https://gdamdrgrtcncuwzmqiub.supabase.co";
const DEFAULT_KEY = "sb_publishable_NbS7gpKngLZ2JsHWUIHZQw_PXoeV1zA";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL;
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_KEY;

export const supabaseConfigured = Boolean(url && anon && !url.includes("TU_PROYECTO"));

export const supabase = supabaseConfigured
  ? createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  plan: string;
  credits: number;
  is_creator: boolean;
};

export type JobRow = {
  id: string;
  prompt: string;
  style: string | null;
  aspect: string | null;
  status: string;
  video_url: string | null;
  provider_request_id: string | null;
  created_at: string;
};

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

/** Cobra un trabajo propio (una sola vez). Los creadores no pagan. */
export async function chargeJob(jobId: string, amount: number, reason = "generate") {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.rpc("charge_job", {
    p_job_id: jobId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) throw error;
  return data as Profile;
}

/** Marca el trabajo como fallido y devuelve lo cobrado (una sola vez). */
export async function refundJob(jobId: string, errorMessage?: string) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.rpc("refund_job", {
    p_job_id: jobId,
    p_error: errorMessage ?? null,
  });
  if (error) throw error;
  return data as Profile;
}

export async function insertJob(input: {
  prompt: string;
  style?: string;
  aspect?: string;
  duration_sec?: number;
  provider_request_id?: string;
  status?: string;
}) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      user_id: user.id,
      prompt: input.prompt,
      style: input.style ?? null,
      aspect: input.aspect ?? "9:16",
      duration_sec: input.duration_sec ?? 5,
      provider_request_id: input.provider_request_id ?? null,
      status: input.status ?? "queued",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as JobRow;
}

export async function updateJob(
  id: string,
  patch: Partial<{ status: string; video_url: string | null; error_message: string | null; provider_request_id: string }>
) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase
    .from("jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as JobRow;
}

export async function listMyJobs(limit = 20): Promise<JobRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("jobs")
    .select("id,prompt,style,aspect,status,video_url,provider_request_id,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as JobRow[];
}

export type { Session, User };
