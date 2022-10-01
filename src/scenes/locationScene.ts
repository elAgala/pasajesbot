import { Markup, Scenes } from 'telegraf'
import { Message } from 'telegraf/typings/core/types/typegram'
import { Dao } from '../db/dao'
import LocationRepo, { Location } from '../db/repositories/locationRepo'
import { saveNewTrip } from '../saveUserData'
import { CustomContext, LocationScenePayload, Scene } from './types'

const selectWeekdaysText = `Elija en que dias de la semana esta interesado en viajar.\nPuede seleccionar todos los que quiera y luego haga click en LISTO`

const WEEKDAYS = [
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
  'Domingo'
]

function parseLocations(locations: Location[]) : Record<string, Location> {
  const locationsObject: Record<string, Location> = {}
  locations.forEach(l => locationsObject[l.name] = l)
  return locationsObject
}

function getMessage(message?: Message) : string {
  const parsedMessage = message as Message.TextMessage
  return parsedMessage.text
}

function validateDestination(ctx: CustomContext, payload: LocationScenePayload) : boolean {
  const { locationSceneResults, locations } = payload
  const message = getMessage(ctx.message)
  const destination = locations && locations[message]
  return destination?.id === locationSceneResults?.origin?.id
}

async function initializePayload(ctx: CustomContext, payload: LocationScenePayload) {
  const locationRepo = new LocationRepo(Dao.getInstance())
  const locations = await locationRepo.get()
  payload.locationsArray = locations.map(l => l.name)
  payload.locations = parseLocations(locations)
  const chatId = ctx.chat?.id
  payload.locationSceneResults = {
    chatId, 
    outboundDepartureDays: [],
    returnDepartureDays: []
  };
  return ctx.wizard.next()
}

function isValidLocation(locations: string[], location: string) : boolean {
  return locations.includes(location)
}

function saveLocation(ctx: CustomContext, payload: LocationScenePayload, tripType: 'outbound' | 'return') {
  const { locations, locationSceneResults } = payload
  const message = getMessage(ctx.message)
  const location = locations && locations[message]
  if(locationSceneResults) {
    const key = tripType === 'outbound' ? 'origin' : 'destination'
    locationSceneResults[key] = location;
  }
}

function isValidDay(answer: number, tripDays: number[]) : boolean {
  return answer !== -1 && !tripDays.includes(answer)
}

type CallbackFunction = (ctx: CustomContext) => void

function selectDays(ctx: CustomContext, payload: LocationScenePayload, tripType: 'outbound' | 'return', callback: CallbackFunction) {
  const { locationSceneResults } = payload
  const isCbQuery = !!ctx.callbackQuery?.message
  if(!isCbQuery) return ctx.sendMessage('Por favor, elija una de las opciones disponibles')
  const answer = parseInt(ctx.callbackQuery?.data ?? '-1')
  const day = WEEKDAYS[answer - 1]
  const stopSelection = answer === -1 //FIXME: Tiene que tener al menos una seleccionada para poder poner listo
  if(stopSelection) {
    ctx.answerCbQuery('Dias seleccionados correctamente')
    callback(ctx)
    return ctx.wizard.next()
  }
  const tripDays = tripType === 'outbound' ? locationSceneResults.outboundDepartureDays : locationSceneResults.returnDepartureDays
  const isValid = isValidDay(answer, tripDays)
  if(isValid) {
    ctx.answerCbQuery(day + ' seleccionado correctamente')
    tripDays?.push(answer)
  }
  else ctx.answerCbQuery('El dia ' + day + ' ya ha sido seleccionado')
}

function sendDaysMessage(ctx: CustomContext) {
  const daysArray = WEEKDAYS.reduce((arr, w, index) => {
    const button = Markup.button.callback(w, (index + 1).toString())
    if(index < 4)
      arr[0].push(button)
    else arr[1].push(button)
    return arr
  }, [[] as any[], [] as any[]])
  ctx.reply(selectWeekdaysText, Markup.inlineKeyboard([
    ...daysArray,
    [Markup.button.callback('LISTO', '-1')]
  ]))
}

function sendLocationsKeyboard(ctx: CustomContext, payload: LocationScenePayload, text: string) {
  const { locationsArray } = payload
  ctx.reply(text, Markup.keyboard([locationsArray ?? ['Options error']]).oneTime())
}

function locationScene() {
  let payload = {} as LocationScenePayload
  return new Scenes.WizardScene<CustomContext>(
    Scene.locationScene,
      async (ctx) => {
        await initializePayload(ctx, payload)
        sendLocationsKeyboard(ctx, payload, 'Elija la localidad de origen de su viaje')
      },
      async (ctx) => {
        const { locationsArray } = payload
        const message = getMessage(ctx.message)
        const isValid = isValidLocation(locationsArray ?? [''], message)
        if(!isValid) return ctx.sendMessage('Por favor, seleccione una localidad valida')
        saveLocation(ctx, payload, 'outbound')
        sendDaysMessage(ctx)
        ctx.wizard.next()
      },
      async (ctx) => {
        selectDays(ctx, payload, 'outbound', (ctx) => sendLocationsKeyboard(ctx, payload, 'Elija la localidad de destino de su viaje'))
      },
      async (ctx) => {
        const { locationsArray } = payload
        const message = getMessage(ctx.message)
        const isValid = isValidLocation(locationsArray ?? [''], message)
        if(!isValid) return ctx.sendMessage('Por favor, seleccione una localidad valida')
        const hasError = validateDestination(ctx, payload)
        if(hasError) return sendLocationsKeyboard(ctx, payload, 'La localidad de destino no puede ser la misma que la de origen')
        saveLocation(ctx, payload, 'return')
        sendDaysMessage(ctx)
        return ctx.wizard.next()
      },
      async (ctx) => {
        selectDays(ctx, payload, 'return', (ctx) => {
          ctx.sendMessage('Muchas gracias, el bot automaticamente buscara pasajes para las localidades y fechas ingresadas cada 30 minutos.\nEn caso de encontrar pasajes, se le notificara con un mensaje.')
          ctx.scene.leave()
          saveNewTrip(payload.locationSceneResults)
        })
      },
  )
}

export { locationScene }