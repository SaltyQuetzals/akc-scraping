export interface Event {
  id: number;
  eventName: string;
  eventNumber: string;
  eventType: string;
  eventStatusCode: string;
  days: number;
  eventStatus: string;
  startDate: string;
  endDate: string;
  keyStakeholderClub: number;
  clubName: string;
  city: string;
  state: string;
  site: Site;
  superintendentSecretary: AdditionalContactOrSuperintendentSecretary;
  additionalContact: AdditionalContact;
  isNationalOwner: boolean;
  isJuniorShowcase: boolean;
  isJuniorShowmanship: boolean;
  isAcceptingOnlineEntries: boolean;
  items?: ItemsEntity[] | null;
  documents?: DocumentsEntity[] | null;
}
interface Site {
  id: number;
  name: string;
  location1: string;
  location2?: string | null;
  location3?: string | null;
  postalCode: string;
  coordinates: Coordinates;
}
interface Coordinates {
  lat: number;
  lon: number;
}
interface AdditionalContactOrSuperintendentSecretary {
  name: string;
  phone: string;
  email: string;
  address: Address;
}
interface Address {
  location1: string;
  location2?: string | null;
  city: string;
  zipCode: string;
  stateCode: string;
}
interface AdditionalContact {
  name: string;
  phone: string;
  email?: string | null;
  address?: Address1 | null;
}
interface Address1 {
  location1: string;
  location2?: string | null;
  city: string;
  zipCode: string;
  stateCode: string;
}
interface ItemsEntity {
  openingDate: number;
  closingDate: number;
  startDate: string;
  endDate: string;
  timeZone: string;
  entryFee?: number[] | null;
  insideOut: string;
  competitionGroupCode: string;
  competitionGroup: string;
  entryLimit: number;
  bvgSpecialty: string;
  bvgSpecialty2: string;
  acceptance: string;
  competitionMethodCode: string;
  competitionMethod: string;
  primaryClass?: null;
  displayOpening: boolean;
  displayClosing: boolean;
  judges?: JudgesEntity[] | null;
  breeds?: BreedsEntity[] | null;
}
interface JudgesEntity {
  id: number;
  number?: null;
  name?: null;
}
interface BreedsEntity {
  number: string;
  description?: string | null;
  alphaCode?: string | null;
}
interface DocumentsEntity {
  name: string;
  code: string;
  keyBinary: number;
}
/**
 * Extracts and processes information about an event from the AKC API.
 * @param eventInfo An event response from the AKC API.
 * @returns Desired information about the event.
 */
const extractEventInfo = (eventInfo: Event) => {
  const {
    eventNumber,
    eventName,
    clubName,
    startDate: startDateString,
    endDate: endDateString,
  } = eventInfo;
  const startDate = new Date(startDateString);
  const endDate = new Date(endDateString);
  return {eventNumber, eventName, clubName, startDate, endDate};
};
export {extractEventInfo};
