"use server";

import { updateCoachLevelAvailability as updateAvailability } from "@/lib/data";

export async function updateCoachLevelAvailabilityAction(
  email: string,
  updates: { genAiAvailable?: boolean; pythonAvailable?: boolean; handsonAvailable?: boolean }
) {
  return updateAvailability(email, updates);
}
