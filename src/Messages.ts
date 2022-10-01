import { TicketDates, TicketInfo } from "./tickets"

export enum Message {
  welcomeMessage = 'welcomeMessage',
  ticketsFound = 'ticketsFound'
}

export const staticMessages = {
  [Message.welcomeMessage]: `Bienvenido a PasajesBot.\nPara comenzar a utilizarlo debes ejectutar el comando '/agregarViaje\nRecorda que puedes agregar hasta 3 viajes en simultaneo`
}

function ticketInfoMessage(ticket: TicketInfo, index: number) : string {
  return `${index + 1}\\. *Fecha*: ${ticket.date} \\- *Asientos disponibles*: ${ticket.seatsAvailable}`
}

function getTicketInfo(tickets: TicketInfo[]) : string {
  return tickets.reduce((finalText, ticket, index) => {
    return finalText += ticketInfoMessage(ticket, index) + '\n\\'
  }, '')
}

export interface TicketLocations {
  origin: string,
  destination: string
}

export interface TicketDepartureConstraints {
  outbound: string[],
  return: string[]
}

function getTicketInfoText(tickets: TicketDates, locations: TicketLocations, departureConstraints: TicketDepartureConstraints) {
  return `Pasajes encontrados para el tramo *${locations.origin} \\- ${locations.destination}* para los proximos 30 dias\n\n` +
    `Viajes de ida \\(${departureConstraints.outbound.join(', ')}\\):\n\n` + 
    `${getTicketInfo(tickets.outbound) || '_No se encontraron pasajes para estas fechas_'}\n` +
    `Viajes de vuelta \\(${departureConstraints.return.join(', ')}\\):\n\n` +
    `${ getTicketInfo(tickets.return) || '_No se encontraron pasajes para estas fechas_' }\n`
}

export const Messages = {
  [Message.ticketsFound]: (tickets: TicketDates, locations: TicketLocations, departureConstraints: TicketDepartureConstraints) => getTicketInfoText(tickets, locations, departureConstraints)
}