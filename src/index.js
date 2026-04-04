import { analyzeIssue } from './ai-analyzer';
import { saveAnalyzedIssue } from './db-utils';
import { sendTelegramAlert } from './telegram-sender';

/* Note: To receive webhooks, need to configure the URL of  deployed Worker via: */
export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (url.pathname === '/test-fetch') {
			console.log('🔍 CONTENU DE ENV:', Object.keys(env));

			const token = env.GITHUB_TOKEN;
			console.log('🔑 TOKEN TROUVÉ ?', !!token);
			console.log('🔑 TYPE DE TOKEN:', typeof token);

			if (!token) {
				return new Response(
					JSON.stringify({
						erreur: 'Token introuvable',
						clés_disponibles: Object.keys(env),
						conseil: 'Vérifie le nom exact du secret',
					}),
					{ status: 500, headers: { 'Content-Type': 'application/json' } },
				);
			}

			//  test Github if token
			try {
				const query = encodeURIComponent('label:"good first issue" language:JavaScript sort:created-desc');
				const githubUrl = `https://api.github.com/search/issues?q=${query}&per_page=2`;

				const response = await fetch(githubUrl, {
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: 'application/vnd.github.v3+json',
						'User-Agent': 'IssueFlow-App',
					},
				});

				if (!response.ok) throw new Error(`Status ${response.status}`);

				const data = await response.json();
				return new Response(JSON.stringify({ success: true, total_count: data.total_count }), {
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (error) {
				return new Response(JSON.stringify({ erreur: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
			}
		}

		if (url.pathname === '/test-db') {
			try {
				console.log('🔍 DB Binding:', env.DB ? 'PRÉSENT ✅' : 'ABSENT ❌');

				if (!env.DB) {
					return new Response(JSON.stringify({ erreur: 'DB non liée' }), { status: 500 });
				}
				// user test
				await env.DB.prepare('INSERT OR IGNORE INTO users (phone_number, tech_stack) VALUES (?, ?)')
					.bind('+22600000000', '["JavaScript", "React"]')
					.run();

				const { results } = await env.DB.prepare('SELECT * FROM users').all();
				return new Response(
					JSON.stringify(
						{
							message: 'DB Connected',
							users: results,
						},
						null,
						2,
					),
					{
						headers: { 'Content-Type': 'application/json' },
					},
				);
			} catch (error) {
				return new Response(
					JSON.stringify(
						{
							erreur: error.message,
						},
						null,
						2,
					),
					{ status: 500, headers: { 'Content-Type': 'application/json' } },
				);
			}
		}

		//Routes test IA
		if (url.pathname === '/test-ai') {
			try {
				// Get real issue from Github
				const query = encodeURIComponent('label:"good first issue" language:Javascript sort:created-desc');
				const githubUrl = `https://api.github.com/search/issues?q=${query}&per_page=1`;

				const githubRes = await fetch(githubUrl, {
					headers: {
						Authorization: `Bearer ${env.GITHUB_TOKEN}`,
						Accept: 'application/vnd.github.v3+json',
						'User-Agent': 'IssueFlow-App',
					},
				});

				const githubData = await githubRes.json();

				if (githubData.total_count === 0) {
					return new Response(JSON.stringify({ erreur: 'Aucune issue trouvée' }), { status: 404 });
				}

				const issue = githubData.items[0];

				// Send to AI
				// Dans src/index.js, route /test-ai
				const analysis = await analyzeIssue(
					issue.title,
					issue.body || '',
					env,
					{ useMock: true }, // ✅ Active le mode mock pour le dev
				);

				await saveAnalyzedIssue(env.DB, issue, analysis);

				/* return new Response(
					JSON.stringify(
						{
							message: 'Issue analysée et sauvegardée !',
							issue_originale: { title: issue.title, url: issue.html_url },
							analyse_ia: analysis,
						},
						null,
						2,
					),
					{
						headers: { 'Content-Type': 'application/json' },
					},
				);
				// Return the result
				return new Response(
					JSON.stringify(
						{
							issue_originale: {
								title: issue.title,
								url: issue.html_url,
								repo: issue.repository_url,
							},
							analyse_ia: analysis,
						},
						null,
						2,
					),
					{
						headers: { 'Content-Type': 'application/json' },
					},
				); */
			} catch (error) {
				return new Response(JSON.stringify({ erreur: error.message }), { status: 500 });
			}
		}

		if (url.pathname === '/test-db-list') {
			const { results } = await env.DB.prepare(
				'SELECT id, title, summary_fr, difficulty_score FROM issues ORDER BY created_at DESC LIMIT 10',
			).all();

			return new Response(JSON.stringify({ issues: results }, null, 2), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Telegram
		if (url.pathname === '/test-telegram') {
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

		if (url.pathname === '/webhook-telegram' && request.method === 'POST') {
			const update = await request.json();

			// Manage /start command
			if (update.message?.text === '/start') {
				const chatId = update.message.chat.id;
				const firstname = update.message.from.first_name;

				// Save user in D1
				// await saveTelegramUser(env.DB, chatId, firstname);

				// Respond to user
				await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						chat_id: chatId,
						text: `👋 Bienvenue ${firstName} !\n\nIssueFlow va t'envoyer les meilleures issues GitHub en français.\n\nPour configurer tes préférences : https://issueflow.app`,
						parse_mode: 'HTML',
					}),
				});

				return new Response('OK', { status: 200 });
			}
		}

		return new Response('IssueFlow OK. Va sur /test-fetch');
	},
};
