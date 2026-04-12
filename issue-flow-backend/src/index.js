import { registerUser, getUserByChatId, updateUserPreferences, listUsers } from "./api-users";
import { getRecentIssues } from "./api-issues";
import { sendTelegramAlert } from "./telegram-sender";
import { analyzeIssue } from "./ai-analyzer";
import { saveAnalyzedIssue } from "./db-utils";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;


    // POST /api/register - Enregistrer un utilisateur
    if (path === "/api/register" && request.method === "POST") {
      try {
        const body = await request.json();
        const { chat_id, username, first_name, tech_stack } = body;

        if (!chat_id) {
          return new Response(JSON.stringify({ error: "chat_id requis" }), {
            status: 400, headers: { "Content-Type": "application/json" }
          });
        }

        const result = await registerUser(env.DB, chat_id, { username, first_name, tech_stack });

        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { "Content-Type": "application/json" }
        });
      }
    }

    // GET /api/user/:chat_id - Récupérer un utilisateur
    if (path.startsWith("/api/user/") && request.method === "GET") {
      try {
        const chatId = path.split("/")[3];
        const user = await getUserByChatId(env.DB, chatId);

        if (!user) {
          return new Response(JSON.stringify({ error: "Utilisateur non trouvé" }), {
            status: 404, headers: { "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify(user), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { "Content-Type": "application/json" }
        });
      }
    }

    // PUT /api/user/:chat_id - Mettre à jour les préférences
    if (path.startsWith("/api/user/") && request.method === "PUT") {
      try {
        const chatId = path.split("/")[3];
        const body = await request.json();
        const { tech_stack, notification_enabled } = body;

        await updateUserPreferences(env.DB, chatId, tech_stack, notification_enabled);

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { "Content-Type": "application/json" }
        });
      }
    }

    // GET /api/issues - Lister les issues récentes
    if (path === "/api/issues" && request.method === "GET") {
      try {
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const issues = await getRecentIssues(env.DB, limit);

        return new Response(JSON.stringify({ issues }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { "Content-Type": "application/json" }
        });
      }
    }

    // GET /api/users - Lister tous les users (admin)
    if (path === "/api/users" && request.method === "GET") {
      try {
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const users = await listUsers(env.DB, limit);

        return new Response(JSON.stringify({ users }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { "Content-Type": "application/json" }
        });
      }
    }


    // POST /webhook-telegram - Recevoir les updates Telegram
    if (path === "/webhook-telegram" && request.method === "POST") {
      try {
        const update = await request.json();

        // commande /start
        if (update.message?.text === "/start") {
          const chatId = update.message.chat.id;
          const username = update.message.from.username;
          const firstName = update.message.from.first_name;

          await registerUser(env.DB, chatId.toString(), {
            username,
            first_name: firstName,
            tech_stack: []
          });

          // Répondre avec un message de bienvenue + lien dashboard
          const dashboardUrl = `https://5a9bac2e.issue-flow-dashboard.pages.dev/?chat_id=${chatId}`;

          await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: `👋 Bienvenue <b>${firstName}</b> sur IssueFlow !\n\nJe vais t'envoyer les meilleures issues GitHub en français.\n\n<b>⚙️ Configure tes préférences :</b>\n${dashboardUrl}`,
              parse_mode: "HTML"
            })
          });
        }

        return new Response("OK", { status: 200 });

      } catch (error) {
        console.error("❌ Webhook error:", error);
        return new Response("Error", { status: 500 });
      }
    }


    if (path === '/test-db-list') {
      const { results } = await env.DB.prepare(
        'SELECT id, title, summary_fr, difficulty_score FROM issues ORDER BY created_at DESC LIMIT 10',
      ).all();

      return new Response(JSON.stringify({ issues: results }, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Telegram
    if (path === '/test-telegram') {
      try {
        const query = encodeURIComponent('label:"good first issue" language:JavaScript sort:created-desc');

        // Get Github issue
        const githubRes = await fetch(`https://api.github.com/search/issues?q=${query}&per_page=1`, {
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'IssueFlow-App',
          },
        });
        const githubData = await githubRes.json();
        if (githubData.total_count === 0) {
          return new Response(JSON.stringify({ erreur: 'Aucune issue' }), { status: 404 });
        }
        const issue = githubData.items[0];

        const analysis = await analyzeIssue(issue.title, issue.body || '', env, { useMock: true });

        // Prepare Data
        const issueData = {
          repo_name: issue.repository_url?.split('/').slice(-2).join('/') || 'Unknown',
          repo_stars: issue?.repository?.stargazers_count,
          title: issue.title,
          summary_fr: analysis.summary_fr,
          tech_stack: analysis.tech_stack,
          difficulty_score: analysis.difficulty_score,
          maintainer_response_time: 'Inconnue',
          url: issue.html_url,
        };

        // SSave in D1
        await saveAnalyzedIssue(env.DB, issue, { ...analysis, ...issueData });

        // Send Telegram (Mock Mode)
        const TEST_CHAT_ID = '1902263215';
        const result = await sendTelegramAlert(TEST_CHAT_ID, issueData, env, { useMock: false });

        return new Response(
          JSON.stringify(
            {
              message: 'Alerte Telegram traitée !',
              telegram: result,
              issue: { title: issue.title, url: issue.html_url },
              analysis: analysis,
            },
            null,
            2,
          ),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        );
      } catch (error) {
        return new Response(JSON.stringify({ erreur: error.message }), { status: 500 });
      }
    }


    return new Response("IssueFlow API is running. Docs: /api/docs");
  },
};
