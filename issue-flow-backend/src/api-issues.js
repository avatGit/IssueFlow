
export async function getRecentIssues(db, limit = 20) {
  const { result } = await db.prepare(
    "SELECT * FROM issues ORDER BY created_at DESC LIMIT ?"
  )
    .bind(limit)
    .run();

  return result.map(i => ({
    ...i,
    tech_stack: JSON.parse(i.tech_stack || '[]')
  }));
}

// Find issues by Tech
export async function getIssuesByTech(db, techList, limit = 10) {
  if (!techList || techList.length === 0) {
    return [];
  }

  const conditions = techList.map(() => "tech_stack LIKE ?").join(" OR ");
  const bindings = techList.map(tech => `%${tech}%`);

  // Ajouter la limite au tableau de bindings
  bindings.push(limit);

  const query = `
    SELECT * FROM issues 
    WHERE (${conditions})
    ORDER BY created_at DESC 
    LIMIT ?
  `;

  const { results } = await db.prepare(query)
    .bind(...bindings)
    .all();

  return results.map(i => ({
    ...i,
    tech_stack: JSON.parse(i.tech_stack || '[]')
  }));
}