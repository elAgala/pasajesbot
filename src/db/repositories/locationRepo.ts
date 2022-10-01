import { Dao } from "../dao";

const LOCATIONS = [
  {
    id: 452,
    name: 'Maipu'
  },
  {
    id: 481,
    name: 'CABA'
  },
  {
    id: 158,
    name: 'Guido'
  },
  {
    id: 255,
    name: 'Mar del Plata'
  },
  {
    id: 114,
    name: 'Dolores'
  },
]

export interface Location {
  id?: number;
  name: string
}

export default class LocationRepo {
  dao: Dao

  constructor(dao: Dao) {
    this.dao = dao
  }

  async insert(location: Location) {
    await this.dao.run('INSERT INTO locations (id, name) VALUES (?, ?)', [
      location.id,
      location.name,
    ])
  }

  async get() {
    return await this.dao.get<Location>(`
      SELECT * FROM locations
      ORDER BY name
    `)
  }

  async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY,
        name TEXT
      )
    `;
    await this.dao.run(sql)
    console.log('CREATE TABLE :: [locations]')
    LOCATIONS.forEach(async location => {
      await this.dao.run(`INSERT OR IGNORE INTO locations (id, name) VALUES (?, ?)`, [location.id, location.name])
    })
  }

}