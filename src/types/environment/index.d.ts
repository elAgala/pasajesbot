declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAGE_BASE_URL: string,
      PAGE_URL: string,
      PRICE_LIMIT_USD: number,
      PRICE_LIMIT_ARS: number,
      BOT_TOKEN: string,
      CRON: string,
      INIT_USERS_IDS: string
    }
  }
}

export {}