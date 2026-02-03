import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { analyzeConversation } from '../services/aiClient';

const router = Router();

router.use(authMiddleware);

// POST /api/agent/analyze
router.post('/analyze', async (req: AuthRequest, res) => {
    try {
        const { conversationId, messages, context } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        const analysis = await analyzeConversation({
            conversation_id: conversationId,
            messages,
            context
        });

        if (!analysis) {
            return res.status(502).json({ error: 'AI Service unavailable' });
        }

        res.json(analysis);
    } catch (error) {
        console.error('Agent Analyze Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
