export const config = {
  PORT: parseInt(process.env.PORT || '5174'),
  DATA_DIR: process.env.DATA_DIR || './runs',
  PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS !== 'false',
  EXTRACT_MAX_DEPTH: parseInt(process.env.EXTRACT_MAX_DEPTH || '2'),
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;
