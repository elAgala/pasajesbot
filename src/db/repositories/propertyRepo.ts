import { Dao } from "../dao";

export enum Currency {
  usd = 'USD',
  ars = 'ARS'
}

export interface Property {
  id: string;
  link: string;
  address: string;
  rooms: number;
  price: number;
  priceCurrency: Currency;
  expenses: number;
  neighborhood: string;
  timestamp?: Date
}

export interface PropertiesResume {
  rooms: number;
  avgPrice: number;
  avgExpenses: number
}

export default class PropertyRepo {
  private dao: Dao

  constructor(dao: Dao) {
    this.dao = dao
  }

 async insert(property: Property) {
    await this.dao.run(`
      INSERT INTO properties (id, link, address, rooms, price, priceCurrency, expenses, neighborhood)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        property.id,
        property.link,
        property.address,
        property.rooms,
        property.price,
        property.priceCurrency,
        property.expenses,
        property.neighborhood
    ])
  }

  async getResumes(initialDate: string, finishDate: string) : Promise<PropertiesResume[]> {
    return await this.dao.get<PropertiesResume>(`
      SELECT rooms, ROUND(AVG(price), 0) avgPrice, ROUND(AVG(expenses), 0) avgExpenses FROM properties
      WHERE timestamp BETWEEN ? AND ?
      GROUP BY rooms
    `, [initialDate, finishDate])
  }

  async get() : Promise<Property[]> {
    return await this.dao.get<Property>('SELECT * FROM properties')
  }

  async getById(id: string) : Promise<Property | undefined> {
    const properties =  await this.dao.get<Property>('SELECT * FROM properties WHERE id = ?', [ id ])
    return properties[0]
  }

  async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY,
        link TEXT,
        address TEXT,
        rooms INTEGER,
        price INTEGER,
        priceCurrency TEXT,
        expenses INTEGER,
        neighborhood TEXT,
        timestamp DATE DEFAULT CURRENT_TIMESTAMP,
        CHECK(priceCurrency IN ("USD", "ARS"))
      )
    `;
    await this.dao.run(sql)
    console.log('CREATE TABLE :: [properties]')
  }

}