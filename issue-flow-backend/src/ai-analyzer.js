
export async function analyzeIssue(title, body, env, options = {}) {
  const { useMock = false } = options;

  //  MODE MOCK : Pour le développement sans quota
  if (useMock || !env.GEMINI_API_KEY) {
    console.log("🎭 Using MOCK mode for AI analysis");
    await new Promise(r => setTimeout(r, 300)); // Simule un délai réseau
    return {
      summary_fr: `[MOCK] ${title.substring(0, 80)}...`,
      difficulty_score: Math.floor(Math.random() * 8) + 2, // 2-10
      tech_stack: ["JavaScript", "Node.js"].slice(0, Math.floor(Math.random() * 2) + 1),
      is_beginner_friendly: Math.random() > 0.5,
      _mock: true
    };
  }

  //  MODE RÉEL : Appel à Gemini
  const MODEL_NAME = "gemini-2.0-flash-lite"; // Modèle léger et gratuit
  const prompt = `
Réponds UNIQUEMENT avec ce JSON valide (pas de texte avant/après, pas de markdown) :
{
  "summary_fr": "Résumé en français simple, max 120 caractères",
  "difficulty_score": 5,
  "tech_stack": ["JavaScript"],
  "is_beginner_friendly": true
}

Issue GitHub :
TITRE: ${title}
DESCRIPTION: ${body ? body.substring(0, 600) : "Aucune description"}
`;

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${env.GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 300
        }
      })
    });

    const responseText = await response.text();
    
    // 🔄 Gestion du quota dépassé : fallback vers mock
    if (response.status === 429) {
      console.warn("⚠️ Quota Gemini dépassé, fallback vers MOCK");
      return {
        summary_fr: `[Quota] ${title.substring(0, 60)}...`,
        difficulty_score: 5,
        tech_stack: ["Unknown"],
        is_beginner_friendly: false,
        _quota_error: true
      };
    }
    
    if (!response.ok) {
      console.error("❌ Gemini Error:", responseText);
      throw new Error(`API Error ${response.status}`);
    }

    const data = JSON.parse(responseText);
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) throw new Error("Réponse vide");

    // Nettoyer le JSON (Gemini ajoute parfois des ```json)
    const cleanJson = textResponse.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error("❌ IA Error:", error.message);
    // Fallback sécurisé
    return {
      summary_fr: `[Erreur] ${title.substring(0, 50)}...`,
      difficulty_score: 5,
      tech_stack: [],
      is_beginner_friendly: false,
      _error: error.message
    };
  }
}