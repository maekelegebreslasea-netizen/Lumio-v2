// netlify/functions/debug.js
// TILLFÄLLIG fil — ta bort efter test!
// Besök: /.netlify/functions/debug för att se env-status
exports.handler = async () => {
  const hasOpenAI    = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const openAIPrefix = process.env.OPENAI_API_KEY?.slice(0, 7) || 'saknas';

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      OPENAI_API_KEY:    hasOpenAI    ? `✅ finns (börjar med: ${openAIPrefix}...)` : '❌ SAKNAS',
      ANTHROPIC_API_KEY: hasAnthropic ? '✅ finns'                                  : '❌ SAKNAS',
    }, null, 2)
  };
};
