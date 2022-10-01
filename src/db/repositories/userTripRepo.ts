import { Dao } from "../dao";
import { Location } from "./locationRepo";

export interface UserTripModel {
  id: number;
  chatId: number;
  destinationName: string;
  destinationId: number;
  originName: string;
  originId: number;
  outboundDepartureDays: string;
  returnDepartureDays: string;
}

export class UserTrip {
  id?: number;
  chatId?: number;
  destination?: Location;
  origin?: Location;
  outboundDepartureDays: number[];
  returnDepartureDays: number[];


  static fromRaw(userTrip: UserTripModel) : UserTrip {
    return new UserTrip({
      id: userTrip.id,
      chatId: userTrip.chatId,
      origin: {
        id: userTrip.originId,
        name: userTrip.originName
      },
      destination: {
        id: userTrip.destinationId ,
        name: userTrip.destinationName
      },
      outboundDepartureDays: userTrip.outboundDepartureDays.split(',').map((d => parseInt(d))),
      returnDepartureDays: userTrip.returnDepartureDays.split(',').map(d => parseInt(d))
    });
  }

  private constructor(userTrip: UserTrip) {
    this.id = userTrip.id
    this.chatId = userTrip.chatId
    this.destination = userTrip.destination
    this.origin = userTrip.origin
    this.outboundDepartureDays = userTrip.outboundDepartureDays
    this.returnDepartureDays = userTrip.returnDepartureDays
  }

}

export default class UserTripRepo {
  dao: Dao

  constructor(dao: Dao) {
    this.dao = dao
  }

 async insert(userTrip: UserTrip) {
    const outboundDepatureDays = userTrip.outboundDepartureDays.join(',')
    const returnDepatureDays = userTrip.returnDepartureDays.join(',')
    await this.dao.run('INSERT INTO user_trips (chatId, destinationId, originId, outboundDepartureDays, returnDepartureDays) VALUES (?, ?, ?, ?, ?)', [
      userTrip.chatId,
      userTrip.destination?.id,
      userTrip.origin?.id,
      outboundDepatureDays,
      returnDepatureDays
    ])
  }

  async delete(userTripId: number) {
    await this.dao.run('DELETE FROM user_trips WHERE id = ?', [ userTripId ])
  }

  async countTripForUsers(chatId: number) {
    const result = await this.dao.get<{userTripsCount: number}>(`
      SELECT COUNT(*) AS userTripsCount FROM user_trips WHERE chatId = ?`, [ chatId ])
    return result[0]?.userTripsCount ?? 0
  }

  async get() {
    const userTrips = await this.dao.get<UserTripModel>(`
      SELECT
        UT.id, UT.chatId, UT.outboundDepartureDays, UT.returnDepartureDays,
        OL.name AS originName,
        OL.id AS originId,
        RL.name AS destinationName,
        RL.id AS destinationId 
      FROM user_trips UT
      JOIN locations OL
      ON originId = OL.id
      JOIN locations RL
      ON destinationId = RL.id
      ORDER BY originId, destinationId
    `)
    return userTrips.map(u => UserTrip.fromRaw(u))
  }

  async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS user_trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chatId INTEGER NOT NULL REFERENCES users(chatId),
        destinationId INTEGER NOT NULL REFERENCES locations(id),
        originId INTEGER NOT NULL REFERENCES locations(id),
        outboundDepartureDays TEXT NOT NULL,
        returnDepartureDays TEXT NOT NULL
      )
    `;
    await this.dao.run(sql)
    console.log('CREATE TABLE :: [user_trips]')
  }

}
