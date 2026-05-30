import {
  Result,
  InvalidError,
  proc,
  ok,
  err,
  isRawObj,
  hasProp,
  isSoftStr,
} from "plgg";
import {
  makeFoundry,
  makeProcessor,
} from "plgg-foundry/index";

/**
 * Type for user profile object that AI assigns as JSON.
 */
type Profile = {
  name: string;
  interests: string[];
};

/**
 * Type guard for Profile.
 */
const isProfile = (v: unknown): v is Profile =>
  isRawObj<object>(v) &&
  hasProp(v, "name") &&
  hasProp(v, "interests") &&
  isSoftStr(v["name"]) &&
  Array.isArray(v["interests"]) &&
  v["interests"].every(isSoftStr);

/**
 * Decodes an AI-assigned profile as a value — a malformed profile becomes an
 * `InvalidError` on the Result channel rather than a thrown exception.
 */
const asProfile = (
  v: unknown,
): Result<Profile, InvalidError> =>
  isProfile(v)
    ? ok(v)
    : err(
        new InvalidError({
          message: "Invalid profile object",
        }),
      );

/**
 * ProfileFoundry demonstrates AI assigning JSON objects.
 * The AI extracts user profile from input and assigns it as JSON,
 * then the greet processor decodes it (via `asProfile`, errors-as-values) and
 * returns the personalized greeting.
 */
export const profileFoundry = makeFoundry({
  description: `Greets users based on their profile.`,
  apparatuses: [
    makeProcessor({
      name: "greet",
      description: `Generates a personalized greeting.`,
      arguments: {
        profile: {
          type: '{ "name": string, "interests": string[] }',
        },
      },
      fn: ({ params }) =>
        proc(
          params["profile"],
          asProfile,
          (p) => ({
            greeting: `Hello ${p.name}! You like: ${p.interests.join(", ")}.`,
          }),
        ),
    }),
  ],
});
