import { z } from "zod";

// Loose schemas until real example JSON is available.
// TODO(ESIMERGE): tighten once sample responses are provided.
export const anyObject = z.record(z.string(), z.unknown());
export const listResponse = z.union([z.array(z.unknown()), anyObject]);
export const pingResponse = z.unknown();
