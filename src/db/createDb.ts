import { join } from 'path'
import { Dao } from "./dao";
import PropertyRepo from './repositories/propertyRepo';
import UserRepo from "./repositories/userRepo";

export default async function createDb() {
  const dao = await Dao.initialize(join(__dirname, '../../data/database.sqlite3'))
  const userRepo = new UserRepo(dao)
  const propertyRepo = new PropertyRepo(dao)
  await propertyRepo.createTable()
  await userRepo.createTable()
}
