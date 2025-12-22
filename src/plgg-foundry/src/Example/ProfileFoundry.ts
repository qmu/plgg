import {
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
const isProfile = (v: unknown): v is Profile => {
  return (
    isRawObj<object>(v) &&
    hasProp(v, "name") &&
    hasProp(v, "interests") &&
    isSoftStr(v["name"]) &&
    Array.isArray(v["interests"]) &&
    v["interests"].every(isSoftStr)
  );
};

/**
 * Stores the last greeting generated.
 */
export let lastGreeting = "";

/**
 * ProfileFoundry demonstrates AI assigning JSON objects.
 * The AI extracts user profile from input and assigns it as JSON,
 * then the greet processor uses the parsed object.
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
      returns: {
        greeting: { type: "string" },
      },
      fn: ({ params }) => {
        const v = params["profile"];
        if (!isProfile(v)) {
          throw new Error(
            "Invalid profile object",
          );
        }
        const interests = v.interests.join(", ");
        lastGreeting = `Hello ${v.name}! You like: ${interests}.`;
        return { greeting: lastGreeting };
      },
    }),
  ],
});
