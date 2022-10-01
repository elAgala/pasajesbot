import { Markup, Scenes } from 'telegraf'
import { Message } from 'telegraf/typings/core/types/typegram'
import { Dao } from '../db/dao'
import UserTripRepo, { UserTrip } from '../db/repositories/userTripRepo'
import { removeTrip } from '../saveUserData'
import { CustomContext, RemoveTripPayload, Scene } from './types'

const DepartureDayMapper = [
  'LUN',
  'MAR',
  'MIE',
  'JUE',
  'VIE',
  'SAB',
  'DOM'
]

async function initializeSession(ctx: CustomContext, payload: RemoveTripPayload) {
  const userTripRepo = new UserTripRepo(Dao.getInstance())
  const userTrips = await userTripRepo.get()
  payload.userTrips = userTrips
  return ctx.wizard.next()
}

/* type CallbackFunction = (ctx: CustomContext2) => void */

function getUserTripMessage(userTrip: UserTrip) : string {
  const origin = userTrip.origin?.name
  const originDays = `(${userTrip.outboundDepartureDays.map(d => DepartureDayMapper[d - 1]).join(', ')})`
  const destination = userTrip.destination?.name
  const destinationDays = `(${userTrip.returnDepartureDays.map(d => DepartureDayMapper[d - 1]).join(', ')})`
  return `${origin} ${originDays} -- ${destination} ${destinationDays}`
}

function sendUserTripsOptions(ctx: CustomContext, payload: RemoveTripPayload) {
  const { userTrips } = payload
  ctx.reply('Elija el viaje que desea eliminar', Markup.inlineKeyboard([
   userTrips.map(u => Markup.button.callback(getUserTripMessage(u), u.id?.toString() ?? '-1'))
  ]))
}

function removeTripScene() {
  const payload = {} as RemoveTripPayload
  return new Scenes.WizardScene<CustomContext>(
  Scene.removeTripScene,
    async (ctx) => {
      await initializeSession(ctx, payload)
      sendUserTripsOptions(ctx, payload)
    },
    async (ctx) => {
      const { userTrips } = payload
      const isCbQuery = !!ctx.callbackQuery?.message
      if(!isCbQuery) return ctx.sendMessage('Por favor, elija una de las opciones disponibles')
      ctx.answerCbQuery('Viaje seleccionado')
      const answer = parseInt(ctx.callbackQuery?.data ?? '-1')
      payload.selectedUserTripId = answer
      const selectedUserTrip = userTrips.find(u => u.id === answer) as UserTrip
      ctx.sendMessage(`El viaje:\n\n${getUserTripMessage(selectedUserTrip)}\n\nha sido eliminado correctamente`)
      removeTrip(selectedUserTrip.id as number)
      ctx.scene.leave()
    }
  )
}

export { removeTripScene }