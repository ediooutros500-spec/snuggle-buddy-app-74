const numberFromEnv = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export function readConfig(env = process.env) {
  return {
    host: env.GATOR_HOST || "127.0.0.1",
    port: numberFromEnv(env.GATOR_PORT, 20128),
    publicUrl: env.GATOR_PUBLIC_URL || "http://localhost:20128",
    hasSupabase: Boolean(env.GATOR_SUPABASE_URL && env.GATOR_SUPABASE_SERVICE_ROLE_KEY),
    hasEncryptionKey: Boolean(env.GATOR_ENCRYPTION_KEY),
    hasAdminToken: Boolean(env.GATOR_ADMIN_TOKEN),
    hasLovableKey: Boolean(env.LOVABLE_API_KEY),
  };
}
