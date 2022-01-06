// deno-lint-ignore-file camelcase
import { connect, model, Schema, Types } from "mongoose";

export interface Dog {
  // _id: Types.ObjectId;
  Name: string;
  AKCnum?: string | null;
}

const dogSchema = new Schema<Dog>({
  Name: { type: String, required: true },
  AKCnum: { type: String, required: false },
});

export const DogModel = model<Dog>("Dog", dogSchema);

export interface Run {
  _id: Types.ObjectId;
  Dog: Types.ObjectId;
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
  Dog1YPS?: number;
  Dog2YPS?: number | null;
  Dog3YPS?: number | null;
  DogCallName?: string;
  TimeZone?: string;
  createdBy?: Types.ObjectId;
  Date_As_String?: string;
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

const runSchema = new Schema<Run>({
  Dog: Schema.Types.ObjectId,
  CurrentDate: {
    type: Date,
    required: true,
  },
  Division: {
    type: String,
    required: false,
  },
  Class: { type: String, required: false },
  Height: { type: String, required: false },
  Judge: { type: String, required: false },
  Place: { type: Number, required: false },
  SCT: { type: Number, required: false },
  Yards: { type: Number, required: false },
});

export const RunModel = model<Run>("Run", runSchema);
