import { Scenes, session, Telegraf } from 'telegraf'
import { Dao } from './db/dao';
import UserRepo from './db/repositories/userRepo';
import { locationScene } from './scenes/locationScene';
import { Message, Messages, staticMessages, TicketDepartureConstraints, TicketLocations } from './Messages';
import { TicketDates } from './tickets';
import { CustomContext, Scene } from './scenes/types';
import { removeTripScene } from './scenes/removeTripScene';
import UserTripRepo from './db/repositories/userTripRepo';

const TelegramToken = '5610696122:AAGgKZHCerubkX038oQIoyVBrX3-8ZPOgM8'

export class TelegramBot {
  static instance?: TelegramBot;
  private bot?: Telegraf<CustomContext>;
  private userRepo;
  private userTripRepo;

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
    this.userTripRepo = new UserTripRepo(Dao.getInstance())
    this.bot = new Telegraf<CustomContext>(TelegramToken)
    const stage = new Scenes.Stage<CustomContext>([locationScene(), removeTripScene()])
    this.bot.use(session())
    this.bot.use(stage.middleware())
    this.bot.command('/agregarViaje', (ctx) => this.enterLocationScene(ctx))
    this.bot.command('/eliminarViaje', (ctx) => this.enterRemoveTripScene(ctx))
    this.bot.start((ctx) => this.startBot(ctx))
    this.bot.launch()
  }

  private async enterLocationScene(ctx: CustomContext) {
    const userTrips = await this.userTripRepo.countTripForUsers(ctx.chat?.id as number)
    userTrips < 3 ? ctx.scene.enter(Scene.locationScene) : ctx.sendMessage('Has alcanzado el maximo de viajes disponible (3).')
  }

  private async enterRemoveTripScene(ctx: CustomContext) {
    const userTrips = await this.userTripRepo.countTripForUsers(ctx.chat?.id as number)
    userTrips !== 0 ? ctx.scene.enter(Scene.removeTripScene) : ctx.sendMessage('No tienes viajes disponibles.')
  }

  startBot(ctx: CustomContext) {
    const chatId = ctx.chat?.id
    const userName = ctx.from?.first_name
    if(!chatId || !userName) return
    this.userRepo.insert({chatId, name: userName})
    ctx.sendMessage(staticMessages[Message.welcomeMessage])
  }

  sendTicketsFound(chatId: number, ticketsAvailable: TicketDates, locations: TicketLocations, departureConstraints: TicketDepartureConstraints) {
    const message = Messages[Message.ticketsFound](ticketsAvailable, locations, departureConstraints)
    this.sendMessage(chatId, message)
  }

  sendMessage(chatId: number, message: string) {
    this.bot?.telegram.sendMessage(chatId, message, { parse_mode: 'MarkdownV2'})
  }
}