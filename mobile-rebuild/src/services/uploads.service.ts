import { supabase } from './supabase';

export interface UploadAsset {
  mimeType?: string;
  name: string;
  uri: string;
}

async function uriToArrayBuffer(uri: string) {
  const response = await fetch(uri);
  return response.arrayBuffer();
}

function inferFileExtension(name: string) {
  const pieces = name.split('.');
  return pieces.length > 1 ? pieces[pieces.length - 1] : 'bin';
}

export async function uploadPaymentProof(userId: string, asset: UploadAsset) {
  const arrayBuffer = await uriToArrayBuffer(asset.uri);
  const extension = inferFileExtension(asset.name);
  const filePath = `${userId}/${Date.now()}.${extension}`;

  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .upload(filePath, arrayBuffer, {
      contentType: asset.mimeType ?? 'application/octet-stream',
    });

  if (error) {
    throw error;
  }

  return data.path;
}
