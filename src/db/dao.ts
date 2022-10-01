import sqlite3, { Database } from 'sqlite3'

export class Dao {
  static instance?: Dao = undefined
  db?: Database = undefined

  private constructor(db: Database) {
    this.db = db
  }

  static async initialize(dbPath: string) : Promise<Dao> {
    if(!dbPath) throw new Error('No db path provided')
    const db = await this.createDb(dbPath)
    this.instance = new Dao(db)
    this.instance.run('PRAGMA foreign_keys = ON')
    return this.instance
  }

  static getInstance() {
    if(!this.instance) throw new Error('DAO is not initialized')
    return this.instance
  }

  private static createDb(dbPath: string) : Promise<Database> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if(!!err)
          reject(new Error('Could not connect to DB :: ' + err.message))
        console.log('Connected to DB') 
        resolve(db)
      })
    })
  }

  async get<T>(sql: string, params?: any[]) : Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db?.all(sql, params, (err, rows) => {
        if(err) reject(err)
        resolve(rows)
      })
    })
  }

  async run(sql: string, params?: any[]) {
    return new Promise((resolve, reject) => {
      this.db?.run(sql, params, (err) => {
        if(!!err) reject(err)
        resolve('Ok')
      })
    })
  }

}