// netlify/functions/debug.js — ta bort efter test!
exports.handler = async () => {
  const hasOpenAI      = !!process.env.OPENAI_API_KEY;
  const hasAnthropic   = !!process.env.ANTHROPIC_API_KEY;
  const hasSupabaseUrl = !!process.env.SUPABASE_URL;
  const hasSupabaseSvc = !!process.env.SUPABASE_SERVICE_KEY;

  const anthropicPrefix = process.env.ANTHROPIC_API_KEY?.slice(0, 10) || 'saknas';
  const openaiPrefix    = process.env.OPENAI_API_KEY?.slice(0, 10)    || 'saknas';

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      ANTHROPIC_API_KEY:   hasAnthropic   ? `✅ finns (${anthropicPrefix}...)` : '❌ SAKNAS — AI fungerar inte!',
      OPENAI_API_KEY:      hasOpenAI      ? `✅ finns (${openaiPrefix}...)`    : '❌ SAKNAS — Voice fungerar inte!',
      SUPABASE_URL:        hasSupabaseUrl ? '✅ finns'                          : '❌ SAKNAS',
      SUPABASE_SERVICE_KEY:hasSupabaseSvc ? '✅ finns'                          : '⚠️  SAKNAS (usage tracking av)',
    }, null, 2)
  };
};
