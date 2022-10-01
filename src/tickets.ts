import axios from 'axios'
import { format, add } from 'date-fns'
import { JSDOM } from 'jsdom'
import { Location } from './db/repositories/locationRepo'

const URL = 'https://webventas.sofse.gob.ar/calendario.php'

const headers = {
  // 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.81 Safari/537.36',
  'Content-Type': 'application/x-www-form-urlencoded'
}

const SELECTORS = {
  viajesIda: '#calendario_ida .web .dia_disponible',
  viajesVuelta: '#calendario_vuelta .web .dia_disponible',
  ticketDate: '.dia_numero',
  ticketSeats: '.disponibles p span'
}

enum TicketType {
  outbound = 'outbound',
  return = 'return'
}

enum PassengerType {
  adulto = 'adulto',
  jubilado = 'jubilado',
  discapacitado = 'discapacitado',
  menor = 'menor'
}

type PassengerQuantity = Record<PassengerType, 0 | 1>

interface TicketSearch {
  tipo_viaje: number;
  origen?: number;
  destino?: number;
  fecha_ida?: string;
  fecha_vuelta?: string;
  cantidad_pasajeros: PassengerQuantity
}

interface TicketSearchPayload {
  origin?: number,
  destination?: number,
  initialDate: string,
  returnDate: string
}

export interface TicketInfo {
  date: string;
  seatsAvailable: string
}

export interface TicketDates {
  outbound: TicketInfo[],
  return: TicketInfo[]
}

const searchObject: TicketSearch = {
  tipo_viaje: 2,
  cantidad_pasajeros: {
    adulto: 1,
    jubilado: 0, 
    discapacitado: 0,
    menor: 0,
  }
}

function formatDate(date: Date) : string {
  return format(date, 'dd/MM/yyyy')
}

function getSearchDates() : string[] {
  const today = new Date()
  const initialDate = add(today, {days: 3})
  const datesArray: string[] = []
  for(let i = 0; i < 4; i++)
    datesArray.push(formatDate(add(initialDate, { days: (7 * i) })))
  return datesArray
}

function getFormData(payload: TicketSearchPayload) {
  const formData = new URLSearchParams()
  Object.entries(searchObject).forEach(([key, value]) => {
    if(typeof value !== 'object')
      formData.append(`busqueda[${key}]`, value.toString())
    else {
      Object.keys(value).forEach(k => formData.append(`busqueda[cantidad_pasajeros][${k}]`, value[k]))
    }
  })
  formData.append('busqueda[origen]', payload.origin?.toString() ?? '')
  formData.append('busqueda[destino]', payload.destination?.toString() ?? '')
  formData.append('busqueda[fecha_ida]', payload.initialDate)
  formData.append('busqueda[fecha_vuelta]', payload.returnDate)
  return formData
}

async function getPage(payload: TicketSearchPayload) {
  try {
    const body = getFormData(payload)
    const response = await axios.post(URL, body, {headers})
    return response.data
  } catch(err) {
/*     console.log(err) */
  }
}

function getTickets(document: Document, ticketType: TicketType) : TicketInfo[] {
  const selector = ticketType === TicketType.outbound ? SELECTORS.viajesIda : SELECTORS.viajesVuelta
  const tickets = document.querySelectorAll(selector)
  const ticketsInfo: TicketInfo[] = []
  if(tickets.length) { //Hay viajes en esa fecha
    tickets.forEach(ticket => {
      const date = ticket.querySelector(SELECTORS.ticketDate)?.innerHTML as string
      const seats = ticket.querySelector(SELECTORS.ticketSeats)?.textContent as string
      ticketsInfo.push({date, seatsAvailable: seats})
    })
  }
  return ticketsInfo
}

async function getTicketsForDate(date: string, origin: Location, destination: Location) : Promise<TicketDates> {
  const page = await getPage({origin: origin.id, destination: destination.id, initialDate: date, returnDate: date})
  const { document } = new JSDOM(page).window
  const outboundDates = getTickets(document, TicketType.outbound)
  const returnDates = getTickets(document, TicketType.return)
  return {
    outbound: outboundDates,
    return: returnDates
  }
}

export async function getAvailableTickets(origin: Location, destination: Location) : Promise<TicketDates> {
  const searchDates = getSearchDates() 
  const promises: Promise<TicketDates>[] = []
  searchDates.forEach((date) => promises.push(getTicketsForDate(date, origin, destination)))
  const tickets = await Promise.all(promises)
  return tickets.reduce((finalTickets, ticket) => {
    finalTickets.outbound.push(...ticket.outbound)
    finalTickets.return.push(...ticket.return)
    return finalTickets
  }, {outbound: [], return: []} as TicketDates)
}
