import { PropertiesResume, Property } from './db/repositories/propertyRepo'

export enum MessageType {
  unavailable = 'unavailable',
  welcome = 'welcome',
  newRental = 'newRental',
  avgPrices = 'avgPrices'
}

export const staticMessages = {
  [MessageType.unavailable]: `Este es un bot privado y por lo tanto no esta disponible`,
  [MessageType.welcome]: `Bienvenido!`
}

function cleanText(text: string) : string {
  return text.replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\./g, '\\.').replace(/-/g, '\\-')
}

function propertyDetails(property: Property) {
  const link = (process.env.PAGE_BASE_URL + property.link)
  return `Barrio: *${cleanText(property.neighborhood)}*\n\n` +
    `Dirección: ${cleanText(property.address)}\n` +
    `Ambientes: ${property.rooms}\n` +
    `Precio: $${property.price} \\(${property.priceCurrency}\\)\n` +
    `Expensas: $${property.expenses}\n` +
    `Link: [Click aquí](${link})\n\n`
}

function averagePrices(propertiesResumes: PropertiesResume[]) {
  return propertiesResumes.map(p => 
    `*Ambientes*: ${p.rooms}\n` +
    `*Precio promedio*: $${p.avgPrice}\n` +
    `*Expensas promedio*: $${p.avgExpenses}`
  ).join('\n\n')
}

export const Messages = {
  [MessageType.newRental]: (property: Property) => propertyDetails(property),
  [MessageType.avgPrices]: (propertiesResumes: PropertiesResume[]) => averagePrices(propertiesResumes)
}