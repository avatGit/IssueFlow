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

			// 3. Si le token est là, on teste GitHub
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

		return new Response('IssueFlow OK. Va sur /test-fetch');
	},
};
