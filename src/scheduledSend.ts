import { CronJob } from 'cron'
import { Dao } from './db/dao'
import UserRepo from './db/repositories/userRepo'
import { getAvailableRentals } from './rentals'
import { TelegramBot } from './telegramBot'

async function searchAvailableRentals() {
  const bot = TelegramBot.getInstance()
  const userRepo = new UserRepo(Dao.getInstance())
  const users = await userRepo.getValid()
  for(const user of users) {
    const newProperties = await getAvailableRentals(user.searchLink)
    if(newProperties.length) {
      newProperties.sort((a, b) => a.address.localeCompare(b.address) || a.rooms - b.rooms)
      bot.sendNewRentalsFound(user.chatId, newProperties)
    }
  }
}

export const searchAvailableRentalsCron = new CronJob(process.env.CRON, searchAvailableRentals)