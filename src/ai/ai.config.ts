import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.6'),
    topP: parseFloat(process.env.AI_TOP_P || '0.8'),
    frequencyPenalty: parseFloat(process.env.AI_FREQ_PENALTY || '0.2'),
  },
  rateLimitPerMinute: parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '60', 10),
  refineEnabled: process.env.AI_REFINE_ENABLED === 'true',
  qualityThreshold: parseFloat(process.env.AI_QUALITY_THRESHOLD || '0.7'),
}));
