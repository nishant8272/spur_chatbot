import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export interface Conversation {
  id: string;
  created_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'ai';
  text: string;
  created_at: Date;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
}

export async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender TEXT NOT NULL CHECK(sender IN ('user', 'ai')),
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS faqs (
      id SERIAL PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT NOT NULL
    );
  `);

  await seedFAQs();
}

export async function seedFAQs() {
  const faqCheck = await pool.query('SELECT COUNT(*) FROM faqs');
  if (parseInt(faqCheck.rows[0].count) > 0) {
    return;
  }

  const faqs = [
    {
      question: 'What is your shipping policy?',
      answer: 'We ship worldwide! Standard shipping takes 5-10 business days, and express shipping takes 2-3 business days. Shipping costs are calculated at checkout.',
      category: 'Shipping'
    },
    {
      question: 'What is your return policy?',
      answer: 'We accept returns within 30 days of purchase. Items must be in their original condition with tags attached. Refunds will be processed within 7 business days of receiving the returned item.',
      category: 'Returns'
    },
    {
      question: 'What are your support hours?',
      answer: 'Our support team is available Monday to Friday, 9 AM to 6 PM UTC. We aim to respond to all inquiries within 24 hours.',
      category: 'Support'
    },
    {
      question: 'Do you ship to the USA?',
      answer: 'Yes! We ship to the USA, Canada, UK, Australia, and most other countries.',
      category: 'Shipping'
    },
    {
      question: 'How long does shipping take?',
      answer: 'Standard shipping takes 5-10 business days, and express shipping takes 2-3 business days.',
      category: 'Shipping'
    },
    {
      question: 'How do I track my order?',
      answer: 'Once your order has shipped, you will receive an email with a tracking number and link to track your package.',
      category: 'Shipping'
    }
  ];

  for (const faq of faqs) {
    await pool.query(
      'INSERT INTO faqs (question, answer, category) VALUES ($1, $2, $3)',
      [faq.question, faq.answer, faq.category]
    );
  }
}

export async function getFAQs(): Promise<FAQ[]> {
  const result = await pool.query('SELECT * FROM faqs');
  return result.rows;
}

export async function createConversation(id: string): Promise<void> {
  await pool.query('INSERT INTO conversations (id) VALUES ($1)', [id]);
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  const result = await pool.query('SELECT * FROM conversations WHERE id = $1', [id]);
  if (result.rows.length > 0) {
    return {
      ...result.rows[0],
      created_at: new Date(result.rows[0].created_at)
    };
  }
  return undefined;
}

export async function createMessage(id: string, conversationId: string, sender: 'user' | 'ai', text: string): Promise<void> {
  await pool.query(
    'INSERT INTO messages (id, conversation_id, sender, text) VALUES ($1, $2, $3, $4)',
    [id, conversationId, sender, text]
  );
}

export async function getMessagesByConversationId(conversationId: string): Promise<Message[]> {
  const result = await pool.query(
    'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [conversationId]
  );
  return result.rows.map(row => ({
    ...row,
    created_at: new Date(row.created_at)
  }));
}

export default pool;
