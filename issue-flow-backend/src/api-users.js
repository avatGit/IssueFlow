// src/api-users.js
export async function registerUser(db, chatId, data) {
    const { username, first_name, tech_stack } = data;
    const now = new Date().toISOString();

    await db.prepare(`
    INSERT INTO users (chat_id, username, first_name, tech_stack, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET
      username = excluded.username,
      first_name = excluded.first_name,
      tech_stack = excluded.tech_stack,
      updated_at = excluded.updated_at
  `)
        .bind(
            chatId,
            username || null,
            first_name || null,
            JSON.stringify(tech_stack || []),
            now,
            now
        )
        .run();

    return { success: true, chat_id: chatId };
}

// Get a user by his chat_id
export async function getUserByChatId(db, chatId) {
    const user = await db.prepare(
        "SELECT * FROM users WHERE chat_id = ?"
    )
        .bind(chatId)
        .run();

    if (!user) return null;

    // Parse Json tech_stack
    return {
        ...user,
        tech_stack: JSON.parse(user.tech_stack || '[]')
    };
}

// Update user preferences
export async function updateUserPreferences(db, chatId, techStack, notificationEnabled) {
    await db.prepare(`
        UPDATE users
        SET tech_stack = ?, notification_enabled = ?, updated_at = CURRENT_TIMESTAMP
        WHERE chat_id = ?
        `)
        .bind(JSON.stringify(techStack), notificationEnabled ? 1 : 0, chatId)
        .run();

    return { success: true };
}

// Get all users
export async function listUsers(db, limit = 50) {
    const { results } = await db.prepare(
        "SELECT id, chat_id, username, first_name, tech_stack, notification_enabled, created_at FROM users ORDER BY created_at DESC LIMIT ?"
    )
        .bind(limit)
        .run()

    return results.map(u => ({
        ...u,
        tech_stack: JSON.parse(u.tech_stack || '[]')
    }));
}