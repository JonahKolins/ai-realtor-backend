import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  rateLimitPerMinute: parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '60', 10),
  refineEnabled: process.env.AI_REFINE_ENABLED === 'true',
  qualityThreshold: parseFloat(process.env.AI_QUALITY_THRESHOLD || '0.7'),
}));
