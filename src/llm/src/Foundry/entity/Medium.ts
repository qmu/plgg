export type Medium = Readonly<{
  startedAt: string;
  endedAt: string;
  lastMedium: Medium | undefined;
  value: unknown;
}>;
