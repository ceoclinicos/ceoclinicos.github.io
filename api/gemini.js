module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

  var body = req.body || {};
  var prompt = body.prompt;
  var provider = body.provider || 'deepseek';

  if (!prompt) return res.status(400).json({ error: 'Falta el prompt' });

  try {
    var text;

    if (provider === 'deepseek') {
      var dsKey = process.env.DEEPSEEK_API_KEY;
      if (!dsKey) return res.status(500).json({ error: 'DEEPSEEK_API_KEY no configurada en Vercel' });

      var dsResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + dsKey
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4096
        })
      });

      var dsData = await dsResponse.json();
      if (!dsResponse.ok) {
        var dsErr = (dsData.error && (dsData.error.message || dsData.error)) || 'Error de DeepSeek API';
        return res.status(dsResponse.status).json({ error: dsErr });
      }

      text = dsData.choices
        && dsData.choices[0]
        && dsData.choices[0].message
        && dsData.choices[0].message.content;

    } else {
      var gmKey = process.env.GEMINI_API_KEY;
      if (!gmKey) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en Vercel' });

      var gmUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + gmKey;
      var gmResponse = await fetch(gmUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
        })
      });

      var gmData = await gmResponse.json();
      if (!gmResponse.ok) {
        var gmErr = (gmData.error && gmData.error.message) || 'Error de Gemini API';
        return res.status(gmResponse.status).json({ error: gmErr });
      }

      text = gmData.candidates
        && gmData.candidates[0]
        && gmData.candidates[0].content
        && gmData.candidates[0].content.parts
        && gmData.candidates[0].content.parts[0]
        && gmData.candidates[0].content.parts[0].text;
    }

    if (!text) return res.status(500).json({ error: 'Respuesta vacía de la IA' });
    return res.status(200).json({ text: text });

  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error del servidor' });
  }
};
