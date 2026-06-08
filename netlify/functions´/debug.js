// netlify/functions/debug.js — ta bort efter test!
exports.handler = async () => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey    = process.env.OPENAI_API_KEY;

  // Test Anthropic key live
  let anthropicTest = '❌ saknas';
  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });
      const data = await res.json();
      if (res.ok) anthropicTest = '✅ fungerar!';
      else anthropicTest = '❌ fel: ' + (data.error?.message || res.status);
    } catch(e) {
      anthropicTest = '❌ exception: ' + e.message;
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ANTHROPIC_API_KEY: anthropicKey ? `finns (${anthropicKey.slice(0,12)}...)` : '❌ SAKNAS',
      ANTHROPIC_TEST:    anthropicTest,
      OPENAI_API_KEY:    openaiKey    ? `finns (${openaiKey.slice(0,10)}...)`    : '❌ SAKNAS',
    }, null, 2)
  };
};
