import { Dao } from "../dao";

interface User {
  chatId: number;
  searchLink?: string
}

export default class UserRepo {
  dao: Dao

  constructor(dao: Dao) {
    this.dao = dao
  }
  
  async insert(user: User) {
    await this.dao.run('INSERT OR IGNORE INTO users (chatId) VALUES (?)', [
      user.chatId,
    ])
  }

  async setSearchLink(chatId: number, searchLink: string) {
    await this.dao.run('UPDATE users SET searchLink = ? WHERE chatId = ?', [ searchLink, chatId ])
  }

  async getValid() : Promise<Required<User>[]> {
    return (await this.dao.get<User>('SELECT * FROM users WHERE searchLink IS NOT NULL')) as Array<Required<User>>
  }

  async getById(chatId: number) : Promise<User> {
    const users = await this.dao.get<User>('SELECT * FROM users WHERE chatId = ?', [ chatId ])
    return users[0]
  }

  async initializeValidUsers() {
    const usersIds = process.env.INIT_USERS_IDS?.split(',')
    for(const id of usersIds) {
      await this.insert({chatId: parseInt(id)})
    }
  }

  async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        chatId INTEGER PRIMARY KEY,
        searchLink INTEGER
      )
    `;
    await this.dao.run(sql)
    await this.initializeValidUsers()
    console.log('CREATE TABLE :: [users]')
  }

}