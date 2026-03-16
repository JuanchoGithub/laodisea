import { Difficulty, Question } from "../types";
import { canto1Questions } from "./questions/canto1";
import { canto2Questions } from "./questions/canto2";
import { canto3Questions } from "./questions/canto3";
import { canto4Questions } from "./questions/canto4";
import { canto5Questions } from "./questions/canto5";
import { canto6Questions } from "./questions/canto6";
import { canto7Questions } from "./questions/canto7";
import { canto8Questions } from "./questions/canto8";
import { canto9Questions } from "./questions/canto9";
import { canto10Questions } from "./questions/canto10";
import { canto11Questions } from "./questions/canto11";
import { canto12Questions } from "./questions/canto12";
import { canto13Questions } from "./questions/canto13";
import { canto14Questions } from "./questions/canto14";
import { canto15Questions } from "./questions/canto15";
import { canto16Questions } from "./questions/canto16";
import { canto17Questions } from "./questions/canto17";
import { canto18Questions } from "./questions/canto18";
import { canto19Questions } from "./questions/canto19";
import { canto20Questions } from "./questions/canto20";
import { canto21Questions } from "./questions/canto21";
import { canto22Questions } from "./questions/canto22";
import { canto23Questions } from "./questions/canto23";
import { canto24Questions } from "./questions/canto24";

export const STATIC_QUESTIONS: Record<number, Record<Difficulty, Omit<Question, 'id'>[]>> = {
  1: canto1Questions,
  2: canto2Questions,
  3: canto3Questions,
  4: canto4Questions,
  5: canto5Questions,
  6: canto6Questions,
  7: canto7Questions,
  8: canto8Questions,
  9: canto9Questions,
  10: canto10Questions,
  11: canto11Questions,
  12: canto12Questions,
  13: canto13Questions,
  14: canto14Questions,
  15: canto15Questions,
  16: canto16Questions,
  17: canto17Questions,
  18: canto18Questions,
  19: canto19Questions,
  20: canto20Questions,
  21: canto21Questions,
  22: canto22Questions,
  23: canto23Questions,
  24: canto24Questions,
};
