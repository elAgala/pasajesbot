import createDb from './db/createDb'
import { searchAvailableRentalsCron } from './scheduledSend'
import { TelegramBot } from './telegramBot'

async function main() {
  await createDb()
  TelegramBot.initialize()
  searchAvailableRentalsCron.start()  
}

main()