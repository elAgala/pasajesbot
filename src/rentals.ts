import { Page } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { Dao } from './db/dao'
import PropertyRepo, { Currency, Property } from './db/repositories/propertyRepo'

interface RawProperty {
  id: string;
  link: string;
  address: string;
  rooms: string;
  expenses: string;
  price: string;
  neighborhood: string;
}

const SELECTORS = {
  property: '[data-qa="posting PROPERTY"]',
  propertyPrice: '[data-qa="POSTING_CARD_PRICE"]',
  propertyExpenses: '[data-qa="expensas"]',
  propertyFeatures: '[data-qa="POSTING_CARD_FEATURES"]',
  propertyneighborhood: '[data-qa="POSTING_CARD_LOCATION"]',
}

const PRICE_LIMIT = {
  [Currency.usd]: process.env.PRICE_LIMIT_USD,
  [Currency.ars]: process.env.PRICE_LIMIT_ARS
}

function isNumeric(value: string) {
    return /^-?\d+$/.test(value);
}

async function getPages(page: Page) : Promise<string[]> {
  const pagingElements = await page.$$eval('[data-qa^="PAGING_"]', (paginations) => paginations.map(p => p.innerHTML))
  return !!pagingElements.length ? pagingElements.filter((p: string) => isNumeric(p)) : ['1']
}

async function getPagingElement(page: Page, pagingNumber: string) {
  return await page.$(`[data-qa="PAGING_${pagingNumber}"]`)
}

async function goToNextPage(page: Page, actualPage: string) {
  const pagingElement = await getPagingElement(page, actualPage)
  if(!pagingElement) return
  const paginationClassName = (await page.evaluate((paging) => paging.classList, pagingElement))['1']
  await pagingElement.click(),
  await page.waitForFunction(
    (paginationClassName, actualPage) => paginationClassName !== document.querySelector(`[data-qa="PAGING_${actualPage}"]`)?.classList['1' as keyof DOMTokenList],
    {},
    paginationClassName,
    actualPage
  )
}

function isFirstPage(pageNumber: string) {
  return pageNumber === '1'
}

function getNumberFromString(text: string) : string { 
  return text.replace( /[^\d\.]*/g, '').split('.').join('')
}

function formatAmount(amount: string) : number {
  const priceNumber = getNumberFromString(amount)
  return !!priceNumber ? parseInt(priceNumber) : 0
}

function getPriceCurrency(price: string) : Currency {
  return price.startsWith('USD') ? Currency.usd : Currency.ars
}


async function getRawProperties(page: Page) : Promise<RawProperty[]> {
  return await page.$$eval(SELECTORS.property, (properties, SELECTORS) => {
    return properties.map(p => {
      const id = p.getAttribute('data-id') ?? ''
      const link = p.getAttribute('data-to-posting') ?? ''
      const price = p.querySelector(SELECTORS.propertyPrice)?.textContent
      const expenses = p.querySelector(SELECTORS.propertyExpenses)?.textContent
      const neighborhood = p.querySelector(SELECTORS.propertyneighborhood)?.textContent ?? ''
      const address = p.querySelector('.sc-ge2uzh-0')?.textContent ?? ''
      const propertyFeatures = p.querySelector(SELECTORS.propertyFeatures)?.childNodes
      let rooms = '';
      if(propertyFeatures?.length) {
        propertyFeatures.forEach(pf => {
          const text = pf.textContent
          if(text?.includes('amb')) return rooms = text
        })
      }
      return {
        id,
        link,
        address,
        rooms,
        expenses,
        price,
        neighborhood
      } as RawProperty
    })
  }, SELECTORS)
}

function getRoomsNumber(roomsString: string) : number {
  return parseInt(getNumberFromString(roomsString))
}

async function getPageResult(page: Page) : Promise<Property[]>{
  const rawProperties = await getRawProperties(page)
  return rawProperties.map(p => ({
    ...p,
    rooms: getRoomsNumber(p.rooms),
    expenses: formatAmount(p.expenses ?? ''),
    priceCurrency: getPriceCurrency(p.price ?? ''),
    price: formatAmount(p.price ?? ''),
  }))
}

async function getProperties(page: Page) : Promise<Property[]> {
  const pages = await getPages(page)
  const properties = [] as Property[]
  for(const actualPage of pages){
    if(!isFirstPage(actualPage)) await goToNextPage(page, actualPage)
    const pageResult = await getPageResult(page)
    properties.push(...pageResult)
  }
  return properties
}

function matchesRequirements(property: Property) : boolean {
  const { priceCurrency } = property
  return priceCurrency === Currency.ars
  // return price < PRICE_LIMIT[priceCurrency]
}

async function saveProperties(properties: Property[]) : Promise<Property[]> {
  const propertyRepo = new PropertyRepo(Dao.getInstance())
  const newProperties = [] as Property[]
  for(const property of properties) {
    const exists = !!(await propertyRepo.getById(property.id))
    if(!exists && matchesRequirements(property)) {
      await propertyRepo.insert(property)
      newProperties.push(property)
    }
  }
  return newProperties
}

//FIXME: Deberia mandar la URL de cada usuario junto con sus constraints de precio (o mas)
export async function getAvailableRentals(searchLink: string) : Promise<Property[]> {
  puppeteer.use(StealthPlugin())
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox']})
  const page = await browser.newPage()
  await page.goto(searchLink)
  const properties = await getProperties(page)
  await browser.close()
  return await saveProperties(properties)
}
