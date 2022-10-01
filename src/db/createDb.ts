import { join } from 'path'
import { Dao } from "./dao";
import LocationRepo from './repositories/locationRepo';
import UserRepo from "./repositories/userRepo";
import UserTripRepo from './repositories/userTripRepo';

export default async function createDb() {
  const dao = await Dao.initialize(join(__dirname, '../../data/database.sqlite3'))
  const userRepo = new UserRepo(dao)
  const locationRepo = new LocationRepo(dao)
  const userTripRepo = new UserTripRepo(dao)
  await userRepo.createTable()
  await locationRepo.createTable()
  await userTripRepo.createTable()
}
