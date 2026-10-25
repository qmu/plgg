import { answer } from "./answer.js";

const result: number = answer(21);
if (result !== 42) {
  throw new Error(`Expected 42, got ${result}`);
}
console.log(`packed bundle runtime: ${result}`);
