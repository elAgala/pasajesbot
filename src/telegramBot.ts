import { Context, Telegraf } from 'telegraf'
import { Dao } from './db/dao';
import UserRepo from './db/repositories/userRepo';
import PropertyRepo, { Property } from './db/repositories/propertyRepo'
import { Message } from 'telegraf/typings/core/types/typegram'
import { MessageType, Messages } from './Messages';
/* import { Message, staticMessages } from './Messages'; */

const TelegramToken = process.env.BOT_TOKEN

function formatDate(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

export class TelegramBot {
  static instance?: TelegramBot;
  private bot?: Telegraf<Context>;
  private userRepo;
  private propertiesRepo;

  static initialize() {
    if(!!this.instance) throw new Error('Bot has been already initialized')
    console.log('Bot Initialized')
    return this.instance = new TelegramBot()
  }

  static getInstance() {
    if(!this.instance) throw new Error('Bot is not initialized')
    return this.instance
  }

  private constructor() {
    this.userRepo = new UserRepo(Dao.getInstance())
    this.propertiesRepo = new PropertyRepo(Dao.getInstance())
    this.bot = new Telegraf<Context>(TelegramToken)
    this.bot.on('message', async (ctx, next) => await this.checkIfUserIsValid(ctx, next))
    this.bot.start((ctx) => ctx.sendMessage('Bienvenido!'))
    this.bot.command('setSearchLink', (ctx) => this.setSearchLink(ctx))
    this.bot.command('getAvgPrices', (ctx) => this.getAvgPrices(ctx))
    this.bot.launch()
  }

  async setSearchLink(ctx: Context) {
    const chatId = ctx.chat?.id
    if(!chatId) return
    const message = ctx.message as Message.TextMessage
    const [ _, searchLink ] = message.text.split(' ')
    this.userRepo.setSearchLink(chatId, searchLink)
    ctx.reply('Link de búsqueda actualizado')
  }

  async getAvgPrices(ctx: Context) {
    const chatId = ctx.chat?.id
    if(!chatId) return
    const today = new Date()
    today.setDate(today.getDate() + 1)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(today.getDate() - 7)
    const resumes = await this.propertiesRepo.getResumes(formatDate(oneWeekAgo), formatDate(today))
    await this.sendMessage(chatId, 'Resumen de las propiedades encontradas en la última semana')
    this.sendMessage(chatId, Messages[MessageType.avgPrices](resumes))
  }

  async checkIfUserIsValid(ctx: Context, next: Function) {
    if(!ctx.chat?.id) return ctx.sendMessage('Este bot es de uso privado y por lo tanto no esta disponible')
    const exists = await this.userRepo.getById(ctx.chat?.id as number)
    if(!exists)
      return ctx.sendMessage('Este bot es de uso privado y por lo tanto no esta disponible')
    next()
  }

  async sendNewRentalsFound(chatId: number, properties: Property[]) { //FIXME: ARREGLAR EL SORT
    await this.sendMessage(chatId, 'Nuevos alquileres encontrados\\!')
    for(const property of properties) {
      try {
        const message = Messages[MessageType.newRental](property)
        await this.sendMessage(chatId, message, false)
      } catch(err) {
        console.log('FATAL ERROR')
        console.log(err)
      }
    }
  }

  async sendMessage(chatId: number, message: string, linkPreview: boolean = true) {
    await this.bot?.telegram.sendMessage(chatId, message, { parse_mode: 'MarkdownV2', disable_web_page_preview: linkPreview})
  }
}