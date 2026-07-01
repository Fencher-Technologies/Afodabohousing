import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export interface PaymentReceiptDraft {
  amount: number;
  createdAt: string;
  managerName?: string | null;
  notes?: string | null;
  paymentId: string;
  propertyTitle?: string | null;
  status: string;
  tenantName?: string | null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function buildReceiptHtml(draft: PaymentReceiptDraft) {
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: Georgia, serif;
            color: #2C241E;
            padding: 32px 28px;
            line-height: 1.5;
            background: #FBF7F1;
          }
          .sheet {
            background: #FFFFFF;
            border: 1px solid #E6D9C8;
            border-radius: 18px;
            padding: 28px;
          }
          h1 {
            color: #236048;
            font-size: 28px;
            margin: 0 0 8px 0;
          }
          .pill {
            display: inline-block;
            background: #E9F0EC;
            color: #236048;
            border-radius: 999px;
            padding: 6px 12px;
            font-size: 12px;
            margin-bottom: 18px;
          }
          .summary {
            background: #F4EDE1;
            border-radius: 14px;
            padding: 16px;
            margin-bottom: 20px;
          }
          p {
            margin: 0 0 8px 0;
            font-size: 14px;
          }
          strong {
            display: inline-block;
            min-width: 140px;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <h1>Afodabo Housing Payment Receipt</h1>
          <div class="pill">${escapeHtml(draft.status.toUpperCase())}</div>
          <div class="summary">
            <p><strong>Amount</strong> UGX ${draft.amount.toLocaleString()}</p>
            <p><strong>Property</strong> ${escapeHtml(draft.propertyTitle || 'Property payment')}</p>
            <p><strong>Date</strong> ${escapeHtml(format(new Date(draft.createdAt), 'MMMM d, yyyy'))}</p>
            <p><strong>Receipt ID</strong> ${escapeHtml(draft.paymentId)}</p>
          </div>
          <p><strong>Tenant</strong> ${escapeHtml(draft.tenantName || 'Tenant')}</p>
          <p><strong>House Manager</strong> ${escapeHtml(draft.managerName || 'Afodabo Housing')}</p>
          <p><strong>Notes</strong> ${escapeHtml(draft.notes || 'No additional notes supplied.')}</p>
        </div>
      </body>
    </html>
  `;
}

export async function downloadPaymentReceiptPdf(draft: PaymentReceiptDraft) {
  const html = buildReceiptHtml(draft);
  const printed = await Print.printToFileAsync({ html });
  const safeTitle = slugify(draft.propertyTitle || 'payment-receipt');
  const targetUri =
    FileSystem.documentDirectory != null
      ? `${FileSystem.documentDirectory}${safeTitle}-${draft.paymentId}-receipt.pdf`
      : printed.uri;

  if (FileSystem.documentDirectory) {
    await FileSystem.copyAsync({
      from: printed.uri,
      to: targetUri,
    });
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(targetUri, {
      dialogTitle: 'Download payment receipt',
      mimeType: 'application/pdf',
      UTI: '.pdf',
    });
  }

  return targetUri;
}
