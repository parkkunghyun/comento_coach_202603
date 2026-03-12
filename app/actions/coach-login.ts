"use server";

import { updateCoachLoginProfile as updateProfile } from "@/lib/data";

export async function updateCoachLoginProfileAction(
  rowIndex: number,
  updates: {
    status?: string;
    name?: string;
    affiliation?: string;
    email?: string;
    contact?: string;
    birthDate?: string;
    address?: string;
  }
) {
  return updateProfile(rowIndex, updates);
}
