

export async function saveAnalyzedIssue(db, githubIssue, analysis) {
  await db.prepare(`
    INSERT OR IGNORE INTO issues (
      github_id, title, url, repo_name, 
      summary_fr, difficulty_score, tech_stack, sent_to_users
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  .bind(
    githubIssue.id,
    githubIssue.title,
    githubIssue.html_url,
    githubIssue.repository_url?.split('/').slice(-2).join('/'),
    analysis.summary_fr,
    analysis.difficulty_score,
    JSON.stringify(analysis.tech_stack),
    0 // Pas encore envoyé
  )
  .run();
}