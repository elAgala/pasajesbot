import { CronJob } from 'cron'
import { Dao } from './db/dao'
import UserTripRepo, { UserTrip } from './db/repositories/userTripRepo'
import { TelegramBot } from './telegramBot'
import { getAvailableTickets, TicketDates, TicketInfo } from './tickets'

const DepartureDayMapper = [
  'LUN',
  'MAR',
  'MIE',
  'JUE',
  'VIE',
  'SAB',
  'DOM'
]

function getUserTripsByLocations(userTrips: UserTrip[]) : Array<UserTrip[]> {
  const userTripsArray: Array<UserTrip[]> = []
  userTrips.forEach((userTrip, index) => {
    if(index === 0) return userTripsArray.push([userTrip])
    const { destination, origin } = userTripsArray[userTripsArray.length - 1][0]
    if(destination?.id === userTrip.destination?.id && origin?.id === userTrip.origin?.id)
      userTripsArray[userTripsArray.length - 1].push(userTrip)
    else
      userTripsArray.push([userTrip])
  })
  return userTripsArray
}

function isSelectedDepartureDay(ticket: TicketInfo, departureDays: number[]) : boolean {
  const departureDay = ticket.date.split(' ')[0] // Aca tengo la informacion del dia y del mes tambien en [1] y en [2]
  return departureDays.some(d => DepartureDayMapper[d - 1] === departureDay)
}

function getTicketsForUser(tickets: TicketDates, userTrip: UserTrip) : TicketDates {
  const finalTickets: TicketDates = {outbound: [], return: []}
  Object.keys(tickets).forEach((ticketType) => {
    const departureDays = ticketType === 'outbound' ? userTrip.outboundDepartureDays : userTrip.returnDepartureDays
    const parsedKey = ticketType as keyof TicketDates
    const actualTickets = tickets[parsedKey] 
    finalTickets[parsedKey] = actualTickets.filter(t => isSelectedDepartureDay(t, departureDays))
  })
  return finalTickets
}


async function sendScheduledMessages() {
  const bot = TelegramBot.getInstance()
  const userTripRepo = new UserTripRepo(Dao.getInstance())
  const userTrips = await userTripRepo.get()
  const userTripsArray = getUserTripsByLocations(userTrips)
  userTripsArray.forEach(async userTrips => {
    const { destination, origin } = userTrips[0]
    if(!!destination && !!origin) {
      const availableTickets = await getAvailableTickets(origin, destination)
      userTrips.forEach(u => {
        const finalTickets = getTicketsForUser(availableTickets, u)
        if(!finalTickets.outbound.length && !finalTickets.return.length) return
        const parsedOutboundConstraints = u.outboundDepartureDays.map(d => DepartureDayMapper[d - 1])
        const parsedReturnConstraints = u.returnDepartureDays.map(d => DepartureDayMapper[d - 1])
        bot?.sendTicketsFound(u.chatId ?? 0, finalTickets, {
          origin: origin.name,
          destination: destination.name,
        },
        {
          outbound: parsedOutboundConstraints,
          return: parsedReturnConstraints
        })
      })
    }
  })
}


export const scheduledMessages = new CronJob('*/30 7-23 * * *', sendScheduledMessages)