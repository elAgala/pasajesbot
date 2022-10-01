import { Context, Scenes } from "telegraf"
import { Location } from "../db/repositories/locationRepo"
import { UserTrip } from "../db/repositories/userTripRepo";

export enum Scene {
  locationScene = 'locationScene',
  removeTripScene = 'removeTripScene'
}

export interface RemoveTripPayload {
  userTrips: UserTrip[],
  selectedUserTripId: number
}

export interface LocationSceneResults {
  chatId?: number;
  origin?: Location,
  destination?: Location,
  outboundDepartureDays: number[],
  returnDepartureDays: number[]
}

export interface LocationScenePayload {
  locations?: Record<string, Location>,
  locationsArray?: string[],
  locationSceneResults: LocationSceneResults
}

export interface CustomContext extends Context {
  scene: Scenes.SceneContextScene<CustomContext, Scenes.WizardSessionData>,
  wizard: Scenes.WizardContextWizard<CustomContext>
}
