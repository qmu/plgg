export type Medium = Readonly<{
  startedAt: string;
  endedAt: string;
  currentOpId: string | undefined;
  nextOpId: string | undefined;
  lastMedium: Medium | undefined;
  output: unknown;
}>;
