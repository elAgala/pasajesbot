import { Dao } from "../dao";

interface User {
  chatId: number;
  name: string
}

export default class UserRepo {
  dao: Dao

  constructor(dao: Dao) {
    this.dao = dao
  }

 async  insert(user: User) {
    await this.dao.run('INSERT OR IGNORE INTO users (chatId, name) VALUES (?, ?)', [
      user.chatId,
      user.name
    ])
  }

  async get() {
    return await this.dao.get<User>('SELECT * FROM users')
  }

  async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        chatId INTEGER PRIMARY KEY,
        name TEXT
      )
    `;
    await this.dao.run(sql)
    console.log('CREATE TABLE :: [users]')
  }

}