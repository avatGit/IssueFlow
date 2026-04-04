
export async function sendTelegramAlert(chatId, issueData, env, options = {}){

    const { useMock = false} = options;

    // Mock Mode for development
    if(useMock) {
        console.log(" [MOCK Telegram] Envoie a chatID:", chatId);
        console.log(" Message:", formatIssueMessage(issueData));
        return { success: true, mock: true, message_id: "mock_" + Date.now()};
    }

    try {
        const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({
                chat_id: chatId,
                text: formatIssueMessage(issueData),
                parse_mode: "HTML",
                disable_web_page_review: true
            })
        });

        const result = await response.json();

        if(!result.ok) {
            console.log.error(" Telegram Error: ", result);
            throw new Error(result.description || `HTTP ${response.status}`);
        }

        console.log(" Telegram sent:", result.result.message_id);
        return { success: true, message_id: result.result.message_id};

    } catch(error){
        console.log(" Telegram send failed:", error.message);
        throw error;
    }

    // Message Formater for Telegram (ligt Html format)
    function formatIssueMessage(issue) {
        return `🌟 <b>Nouvelle Opportunité IssueFlow !</b>

<b>Projet :</b> <code>${issue.repo_name}</code> ${issue.repo_stars ? `(⭐ ${issue.repo_stars})` : ''}
<b>Issue :</b> ${escapeHtml(issue.title)}

🇫🇷 <b>Résumé :</b>
${escapeHtml(issue.summary_fr)}

🛠 <b>Technos :</b> ${issue.tech_stack?.join(', ') || 'Non détecté'}
💪 <b>Difficulté :</b> ${issue.difficulty_score}/10
⚡ <b>Réactivité :</b> ${issue.maintainer_response_time || 'Inconnue'}

🔗 <a href="${issue.url}">Voir l'issue sur GitHub</a>

<i>Pour gérer tes alerts : https://issueflow.app</i>`
    }

    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'};
        return text?.replace(/[&<>"']/g, m => map[m]) || '';
    }
}