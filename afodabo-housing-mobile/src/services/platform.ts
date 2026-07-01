import { apiRequest } from './backend-api';

export function resolvePaymentProofUrl(proofUrl: string | null | undefined) {
  if (!proofUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(proofUrl)) {
    return proofUrl;
  }

  return null;
}

export function extractPaymentProofUrlFromNotes(notes: string | null | undefined) {
  if (!notes) {
    return null;
  }

  const match = notes.match(/Payment proof:\s*(https?:\/\/\S+|\S+)/i);
  return match?.[1] ?? null;
}

export async function sendSmsMessage(phone: string | null | undefined, message: string) {
  if (!phone) {
    return;
  }

  await apiRequest('/sms/send', {
    body: {
      message,
      to: phone,
    },
    method: 'POST',
  });
}
