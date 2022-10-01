import createDb from './db/createDb'
import { Dao } from './db/dao'
import { scheduledMessages } from './scheduledSend'
import { TelegramBot } from './telegramBot'

async function main() {
  await createDb()
  TelegramBot.initialize()
  scheduledMessages.start()
}

main()