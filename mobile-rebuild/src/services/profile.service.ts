import type { ProfileRow } from '../types/database';
import { supabase } from './supabase';

interface UpdateProfilePayload {
  fullName: string;
  phone: string;
  userId: string;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileRow | null> {
  const normalizedName = payload.fullName.trim();
  const normalizedPhone = payload.phone.trim();

  if (!normalizedName) {
    throw new Error('Full name is required.');
  }

  const profileDetails = {
    full_name: normalizedName,
    phone: normalizedPhone || null,
  };

  const { data: existingProfiles, error: readProfileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', payload.userId);

  if (readProfileError) {
    throw new Error(`Could not check your profile details. ${readProfileError.message}`);
  }

  if ((existingProfiles?.length ?? 0) > 0) {
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update(profileDetails)
      .eq('user_id', payload.userId);

    if (updateProfileError) {
      throw new Error(`Could not save your profile details. ${updateProfileError.message}`);
    }
  } else {
    const { error: insertProfileError } = await supabase.from('profiles').insert({
      ...profileDetails,
      user_id: payload.userId,
    });

    if (insertProfileError) {
      throw new Error(`Could not save your profile details. ${insertProfileError.message}`);
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', payload.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}
