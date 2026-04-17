import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Required for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/generate', async (req, res) => {
  const { htmlInput, productName, targetCurrency } = req.body;

  if (!htmlInput) {
    return res.status(400).json({ error: 'Falta el código HTML de origen' });
  }

  const systemPrompt = `You are a Senior HTML/CSS Expert and Conversion Rate Optimization (CRO) Specialist.
Your task is to take a raw HTML structure and transform it into a high-converting landing page in SPANISH.
The user has provided the origin of the html code as URL e.g. https://tdah2.exercitandoocerebro.com/ in the first lines of the input string.

RULES:
1. TRADUCCIÓN: Translate all visible text to Spanish, maintaining a persuasive "copywriting" tone.
2. PRESERVACIÓN: Keep all original CSS (internal <style> tags and inline styles) exactly as they are to maintain the "proven" visual vibe.
3. IMÁGENES: Keep all original <img src="..."> URLs. Do not remove them. If relative path is used, the adjust it to be absolute. E.g. this: <img src="/assets/ebook-cover-CjC6MyiB.png" alt="E-book 50 Atividades para TDAH"> needs to be <img src="https://tdah2.exercitandoocerebro.com/assets/ebook-cover-CjC6MyiB.png/assets/ebook-cover-CjC6MyiB.png" alt="E-book 50 Atividades para TDAH"> where https://tdah2.exercitandoocerebro.com/ is the url root
4. REBRANDING: The new product name is "${productName}". Replace the old product name everywhere.
5. PRECIO: Convert all prices mentioned to ${targetCurrency} amounts.
6. OUTPUT: Return ONLY the complete, valid HTML code starting with <!DOCTYPE html>. No explanations, no markdown blocks.`;

  const userQuery = `Transform this landing page code to Spanish for "${productName}" and ensure all styles are preserved: \n\n ${htmlInput}`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY no detectada en el backend.' });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'API request failed');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Respuesta inválida desde Gemini');
    }

    // Clean up markdown markers if present
    const cleanedHtml = text.replace(/```html|```/g, '').trim();

    res.json({ html: cleanedHtml });
  } catch (error) {
    console.error('Error al contactar Gemini API:', error.message);
    res.status(500).json({ error: 'Error interno en la generación.' });
  }
});

// Production: Serve static UI files from /dist
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
