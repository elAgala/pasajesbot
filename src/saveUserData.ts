import { Dao } from "./db/dao";
import UserTripRepo from "./db/repositories/userTripRepo";
import { LocationSceneResults } from "./scenes/types";

export async function saveNewTrip(data: LocationSceneResults) {
  const { chatId, destination, origin, returnDepartureDays, outboundDepartureDays } = data
  const dao = Dao.getInstance()
  const userTripRepo = new UserTripRepo(dao)
  await userTripRepo.insert({
    chatId,
    destination,
    origin,
    outboundDepartureDays,
    returnDepartureDays
  })
}

export async function removeTrip(userTripId: number) {
  const dao = Dao.getInstance()
  const userTripRepo = new UserTripRepo(dao)
  await userTripRepo.delete(userTripId)
}