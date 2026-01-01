// doer-backend/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Petit helper pour tronquer le texte
function truncateText(text, maxChars = 8000) {
  if (!text) return "";
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

app.post("/summarize", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing 'text' in body" });
    }

    const cleanText = truncateText(text);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // ou gpt-4o si tu veux plus costaud
      messages: [
        {
          role: "system",
          content: `
            Tu es Doer, un assistant exécutif ultra exigeant.

            RÈGLES ABSOLUES :
            - Tu aides l'utilisateur à GAGNER DU TEMPS.
            - Tu ne proposes une action QUE si elle est réellement utile.
            - Si le texte est seulement informatif, tu ne proposes AUCUNE action.

            TA MISSION :
            1) Produire un résumé exécutif clair (max 5 bullet points).
            2) Identifier les actions IMPORTANTES à faire, si et seulement si :
              - quelqu’un attend une réponse ou une décision
              - il y a une échéance ou un suivi implicite
              - une opportunité ou un risque existe si on n’agit pas

            NE JAMAIS :
            - proposer des actions vagues ("réfléchir", "analyser", "se souvenir")
            - transformer une information en tâche inutile

            FORMAT STRICT (JSON valide uniquement) :
            {
              "summary": ["..."],
              "suggestedActions": ["..."]
            }
            `
          },
        {
          role: "user",
          content: `Texte à analyser :\n\n${cleanText}`,
        },
      ],
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content || "";

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error("Erreur de parsing JSON, réponse brute :", raw);
      // fallback ultra simple
      data = {
        summary: [raw],
        suggestedActions: [],
      };
    }

    // Sécurise un minimum les champs
    if (!Array.isArray(data.summary)) data.summary = [String(data.summary || "")];
    if (!Array.isArray(data.suggestedActions))
      data.suggestedActions = [String(data.suggestedActions || "")];

    res.json({
      summary: data.summary,
      suggestedActions: data.suggestedActions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur interne côté Doer API" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Doer backend running on http://localhost:${port}`);
});

