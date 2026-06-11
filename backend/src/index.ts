import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase, createConversation, getConversation, createMessage, getMessagesByConversationId } from './db';
import { generateReply } from './llm';

dotenv.config();
async function generateId() {
  const { v4: uuidv4 } = await import("uuid");
  return uuidv4();
}

const app = express();
const port = process.env.PORT || 3001;
const MAX_MESSAGE_LENGTH = 1000;

app.use(cors());
app.use(express.json({ limit: '16kb' }));

app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Invalid JSON request body' });
  }

  next(err);
});

// Initialize database on startup
initDatabase().then(() => {
  console.log('Database initialized successfully');
}).catch((err) => {
  console.error('Failed to initialize database:', err);
});

app.post('/chat/message', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { message, sessionId } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required and cannot be empty' });
    }

    const normalizedMessage = message.trim();
    const wasTruncated = normalizedMessage.length > MAX_MESSAGE_LENGTH;
    const trimmedMessage = normalizedMessage.slice(0, MAX_MESSAGE_LENGTH);

    let conversationId = typeof sessionId === 'string' && sessionId.length <= 100 ? sessionId : undefined;

    if (!conversationId || !await getConversation(conversationId)) {
      conversationId = await generateId();
      await createConversation(conversationId);
    }

    const userMessageId = await generateId();
    await createMessage(userMessageId, conversationId, 'user', trimmedMessage);

    const history = (await getMessagesByConversationId(conversationId)).map(msg => ({
      sender: msg.sender,
      text: msg.text
    }));

    const aiReply = await generateReply(history, trimmedMessage);

    const aiMessageId = await generateId();
    await createMessage(aiMessageId, conversationId, 'ai', aiReply);

    res.json({
      reply: aiReply,
      sessionId: conversationId,
      truncated: wasTruncated,
      maxLength: MAX_MESSAGE_LENGTH
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Sorry, something went wrong while processing your message. Please try again.' });
  }
});

app.get('/chat/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId || sessionId.length > 100) {
      return res.status(400).json({ error: 'Invalid conversation id' });
    }

    const conversation = await getConversation(sessionId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await getMessagesByConversationId(sessionId);

    res.json({
      messages: messages.map(msg => ({
        sender: msg.sender,
        text: msg.text,
        createdAt: msg.created_at.toISOString()
      }))
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Sorry, chat history could not be loaded right now.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
