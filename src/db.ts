// deno-lint-ignore-file camelcase
import { Bson, MongoClient } from "https://deno.land/x/mongo/mod.ts";

const client = new MongoClient();

await client.connect("mongodb://localhost:27017");

const db = client.database("akc");

export interface Dog {
  _id: Bson.ObjectID;
  CallName: string;
  Name: string;
  Breed?: string | null;
  DOB?: Date;
  Sex?: string | null;
  Height?: string | null;
  Weight?: string | null;
  createdBy: Bson.ObjectID;
  CurrYr_Mach?: string | null;
  PrevYr_Mach?: string | null;
  Lifetime_Mach?: string | null;
  CurrYr_HighMachStd?: string | null;
  PrevYr_HighMachStd?: string | null;
  Lifetime_HighMachStd?: string | null;
  CurrYr_HighMachJWW?: string | null;
  PrevYr_HighMachJWW?: string | null;
  Lifetime_HighMachJWW?: string | null;
  CurrYr_QQ?: string | null;
  PrevYr_QQ?: string | null;
  Lifetime_QQ?: string | null;
  CurrYr_Pach?: string | null;
  PrevYr_Pach?: string | null;
  Lifetime_Pach?: string | null;
  CurrYr_HighPachStd?: string | null;
  PrevYr_HighPachStd?: string | null;
  Lifetime_HighPachStd?: string | null;
  CurrYr_HighPachJWW?: string | null;
  PrevYr_HighPachJWW?: string | null;
  Lifetime_HighPachJWW?: string | null;
  CurrYr_PQQ?: string | null;
  PrevYr_PQQ?: string | null;
  Lifetime_PQQ?: string | null;
  CurrYr_AvgYPSStd?: string | null;
  PrevYr_AvgYPSStd?: string | null;
  Lifetime_AvgYPSStd?: string | null;
  CurrYr_AvgYPSJWW?: string | null;
  PrevYr_AvgYPSJWW?: string | null;
  Lifetime_AvgYPSJWW?: string | null;
  CurrYr_HighYPSStd?: string | null;
  PrevYr_HighYPSStd?: string | null;
  Lifetime_HighYPSStd?: string | null;
  CurrYr_HighYPSJWW?: string | null;
  PrevYr_HighYPSJWW?: string | null;
  Lifetime_HighYPSJWW?: string | null;
  curr_nat_QQs?: string | null;
  curr_nat_Qs?: string | null;
  curr_nat_Pts?: string | null;
  InvPtTotal?: string | null;
  ypsstd_with_min?: string | null;
  ypsjww_with_min?: string | null;
  curr_world_QQs?: string | null;
  USDAACurrYr_AvgYPSStd?: string | null;
  USDAAPrevYr_AvgYPSStd?: string | null;
  USDAALifetime_AvgYPSStd?: string | null;
  USDAACurrYr_AvgYPSJWW?: string | null;
  USDAAPrevYr_AvgYPSJWW?: string | null;
  USDAALifetime_AvgYPSJWW?: string | null;
  USDAACurrYr_HighYPSStd?: string | null;
  USDAAPrevYr_HighYPSStd?: string | null;
  USDAALifetime_HighYPSStd?: string | null;
  USDAACurrYr_HighYPSJWW?: string | null;
  USDAAPrevYr_HighYPSJWW?: string | null;
  USDAALifetime_HighYPSJWW?: string | null;
  curr_nat_GPQs?: string | null;
  curr_nat_StplQs?: string | null;
  curr_nat_TeamQs?: string | null;
  Last_Run_Update?: string | null;
  Titles?: (string | null)[] | null;
  AKCnum?: string | null;
  USDAAnum?: string | null;
  StartMach?: string | null;
  StartQQ?: string | null;
  StartPach?: string | null;
  StartPQQ?: string | null;
  StartT2B?: string | null;
  ChipNum?: string | null;
  VetName?: string | null;
  VetNum?: string | null;
  Sire?: string | null;
  SireNote?: string | null;
  Dam?: string | null;
  DamNote?: string | null;
  Breeder?: string | null;
  UnmappedData?: (string)[] | null;
  Picture_Email?: string | null;
  Picture_URL?: string | null;
  Picture_Name?: string | null;
  curr_nat_Prem_QQs?: string | null;
  curr_nat_Prem_Pts?: string | null;
  InvPPtTotal?: string | null;
  TattooNum?: string | null;
  Instructor?: string | null;
  UKInum?: string | null;
  OtherRegistrations?: string | null;
}
export interface Run {
  _id: Bson.ObjectID;
  Dog: string;
  CurrentDate: Date | string;
  Org?: string | null;
  Division?: string | null;
  Class?: string | null;
  Height?: string | null;
  Qual?: boolean | null;
  YPS?: string | null;
  Mach?: string | null;
  Pach?: string | null;
  T2B?: string | null;
  Dog1YPS: number;
  Dog2YPS?: number | null;
  Dog3YPS?: number | null;
  DogCallName: string;
  TimeZone: string;
  createdBy: Bson.ObjectID;
  Date_As_String: string;
  Surface?: (string | null)[] | null;
  Weather?: string | null;
  Judge?: string | null;
  Club?: string | null;
  Location?: string | null;
  Place?: number | null;
  Time?: number | null;
  Score?: number | null;
  SCT?: number | null;
  Yards?: number | null;
  Dog1Name?: string | null;
  Dog1Time?: number | null;
  Dog2Name?: string | null;
  Dog2Time?: number | null;
  Dog3Name?: string | null;
  Dog3Time?: number | null;
  SingleJump?: (string | null)[] | null;
  Double?: (string | null)[] | null;
  Triple?: (string | null)[] | null;
  Tire?: (string | null)[] | null;
  Panel?: (string | null)[] | null;
  Broad?: (string | null)[] | null;
  BackJump?: (string | null)[] | null;
  DogWalk?: (string | null)[] | null;
  AFrame?: (string | null)[] | null;
  Teeter?: (string | null)[] | null;
  WeavePoleEntry?: (string | null)[] | null;
  WeavePoleExit?: (string | null)[] | null;
  WeavePoleOther?: (string | null)[] | null;
  OffCourse?: (string | null)[] | null;
  Refusal?: (string | null)[] | null;
  TunnelOrContact?: (string | null)[] | null;
  WrongEndOfTunnel?: (string | null)[] | null;
  TableFault?: (string | null)[] | null;
  UnmappedData?: (string | null)[] | null;
  Map_URL?: string | null;
  Picture_URLs?: (string | null)[] | null;
  MishapNotes?: string | null;
  Notes?: string | null;
}
