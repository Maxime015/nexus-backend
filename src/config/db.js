import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import { ENV } from "./env.js";

// Configuration de la connexion Neon
const sql = neon(ENV.DATABASE_URL);

// Initialisation des tables
export async function initDB() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clerk_id VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) NOT NULL,
        fullname VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        bio TEXT,
        image TEXT,
        followers INTEGER DEFAULT 0,
        following INTEGER DEFAULT 0,
        posts INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS posts (
        _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(_id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        storage_id VARCHAR(255),
        caption TEXT,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS likes (
        _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(_id) ON DELETE CASCADE,
        post_id UUID REFERENCES posts(_id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(_id) ON DELETE CASCADE,
        post_id UUID REFERENCES posts(_id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS follows (
        _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id UUID REFERENCES users(_id) ON DELETE CASCADE,
        following_id UUID REFERENCES users(_id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        receiver_id UUID REFERENCES users(_id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(_id) ON DELETE CASCADE,
        type VARCHAR(20) CHECK (type IN ('like', 'comment', 'follow')),
        post_id UUID REFERENCES posts(_id) ON DELETE CASCADE,
        comment_id UUID REFERENCES comments(_id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS bookmarks (
        _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(_id) ON DELETE CASCADE,
        post_id UUID REFERENCES posts(_id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      )
    `;

    // Création des index
    await sql`CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_likes_user_post ON likes(user_id, post_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_follows_both ON follows(follower_id, following_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_receiver ON notifications(receiver_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_post ON notifications(post_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bookmarks_post ON bookmarks(post_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bookmarks_user_post ON bookmarks(user_id, post_id)`;

    console.log('Database initialized successfully ✅');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export default sql;