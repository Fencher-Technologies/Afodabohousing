import { getAccessToken, refreshStoredAuthSession } from './auth-storage';
import { getBackendApiEnv } from '../utils/env';

export interface UploadAsset {
  mimeType?: string;
  name: string;
  uri: string;
}

async function uploadWithAuthRetry(
  path: string,
  asset: UploadAsset,
  defaultMimeType: string,
  allowRefreshRetry = true,
  expectUrl = true,
) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('You must be signed in to upload files.');
  }

  const { apiBaseUrl } = getBackendApiEnv();
  const formData = new FormData();
  formData.append('file', {
    name: asset.name,
    type: asset.mimeType ?? defaultMimeType,
    uri: asset.uri,
  } as never);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const payload = await response.json().catch(() => null);

  if (response.status === 401 && allowRefreshRetry) {
    const refreshedSession = await refreshStoredAuthSession();

    if (refreshedSession?.accessToken) {
      return uploadWithAuthRetry(path, asset, defaultMimeType, false, expectUrl);
    }
  }

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === 'object' && 'detail' in payload
        ? String(payload.detail)
        : 'File upload failed.',
    );
  }

  if (!expectUrl) {
    return payload;
  }

  if (!payload || typeof payload !== 'object' || !('url' in payload)) {
    throw new Error('Upload completed without a file URL.');
  }

  return String(payload.url);
}

export async function uploadPaymentProof(userId: string, asset: UploadAsset) {
  void userId;
  return uploadWithAuthRetry('/uploads/payment-proof', asset, 'application/octet-stream');
}

export async function uploadPropertyImages(userId: string, assets: UploadAsset[]) {
  void userId;
  const uploadedUrls: string[] = [];

  for (const asset of assets) {
    uploadedUrls.push(await uploadWithAuthRetry('/uploads/property-image', asset, 'image/jpeg'));
  }

  return uploadedUrls;
}

export async function uploadAgreementDocument(leaseId: string, asset: UploadAsset) {
  return uploadWithAuthRetry(
    `/agreements/${leaseId}/upload`,
    asset,
    asset.mimeType ?? 'application/pdf',
    true,
    false,
  );
}
