import { addMonths, addYears, format, isBefore, parseISO } from 'date-fns';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Database } from '../types/supabase';

export interface TenancyAgreementDraft {
  generatedByEmail?: string | null;
  generatedByName?: string | null;
  generatedDate?: string;
  managerContact?: string | null;
  managerName?: string | null;
  propertyLocation?: string | null;
  propertyTitle: string;
  rentAmount: number;
  rentPeriod: Database['public']['Enums']['rent_period'];
  startDate: string;
  tenantEmail: string;
  tenantName?: string | null;
  endDate: string;
}

export interface TenancyAgreementSummary {
  billingCycles: number;
  rentScheduleLabel: string;
  tenancyPeriodLabel: string;
  totalRentAmount: number;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatAgreementDate(value: string, fallback = 'To be selected') {
  if (!value?.trim()) {
    return fallback;
  }

  const parsedDate = parseISO(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return format(parsedDate, 'MMMM d, yyyy');
}

function rentPeriodLabel(value: Database['public']['Enums']['rent_period']) {
  return (
    {
      annually: 'yearly',
      monthly: 'monthly',
      quarterly: 'quarterly',
    }[value] ?? value
  );
}

function cycleUnitLabel(value: Database['public']['Enums']['rent_period'], count: number) {
  if (value === 'annually') {
    return count === 1 ? 'year' : 'years';
  }

  if (value === 'quarterly') {
    return count === 1 ? 'quarter' : 'quarters';
  }

  return count === 1 ? 'month' : 'months';
}

function advanceBillingCycle(value: Database['public']['Enums']['rent_period'], currentDate: Date) {
  if (value === 'annually') {
    return addYears(currentDate, 1);
  }

  if (value === 'quarterly') {
    return addMonths(currentDate, 3);
  }

  return addMonths(currentDate, 1);
}

export function calculateTenancyBillingCycles(
  startDate: string,
  endDate: string,
  rentPeriod: Database['public']['Enums']['rent_period'],
) {
  const parsedStartDate = parseISO(startDate);
  const parsedEndDate = parseISO(endDate);

  if (
    Number.isNaN(parsedStartDate.getTime()) ||
    Number.isNaN(parsedEndDate.getTime()) ||
    isBefore(parsedEndDate, parsedStartDate)
  ) {
    return 1;
  }

  let billingCycles = 0;
  let cursor = parsedStartDate;

  while (isBefore(cursor, parsedEndDate)) {
    billingCycles += 1;
    cursor = advanceBillingCycle(rentPeriod, cursor);
  }

  return Math.max(billingCycles, 1);
}

export function summarizeTenancyAgreement(draft: TenancyAgreementDraft): TenancyAgreementSummary {
  const billingCycles = calculateTenancyBillingCycles(
    draft.startDate,
    draft.endDate,
    draft.rentPeriod,
  );

  return {
    billingCycles,
    rentScheduleLabel: rentPeriodLabel(draft.rentPeriod),
    tenancyPeriodLabel: `${billingCycles}-${cycleUnitLabel(draft.rentPeriod, billingCycles)} tenancy period`,
    totalRentAmount: draft.rentAmount * billingCycles,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function buildTenancyAgreementText(draft: TenancyAgreementDraft) {
  const summary = summarizeTenancyAgreement(draft);
  const generatedDate = draft.generatedDate
    ? formatAgreementDate(draft.generatedDate)
    : format(new Date(), 'MMMM d, yyyy');

  return [
    'AFODABO HOUSING TENANCY AGREEMENT',
    `Generated on: ${generatedDate}`,
    '',
    `Property: ${draft.propertyTitle}`,
    `Location: ${draft.propertyLocation || 'As agreed between the parties'}`,
    `Tenant name: ${draft.tenantName || 'To be confirmed'}`,
    `Tenant email: ${draft.tenantEmail}`,
    `House manager: ${draft.managerName || draft.generatedByName || 'Afodabo Housing Manager'}`,
    `House manager contact: ${draft.managerContact || draft.generatedByEmail || 'To be confirmed'}`,
    `Billing cycle: ${summary.rentScheduleLabel}`,
    `Tenancy period: ${summary.tenancyPeriodLabel}`,
    `Billing cycles in agreement: ${summary.billingCycles}`,
    `Rent per billing cycle: UGX ${draft.rentAmount.toLocaleString()}`,
    `Total rent for ${summary.tenancyPeriodLabel}: UGX ${summary.totalRentAmount.toLocaleString()}`,
    `Tenancy start date: ${formatAgreementDate(draft.startDate)}`,
    `Tenancy end date: ${formatAgreementDate(draft.endDate)}`,
    '',
    'Agreement Terms:',
    `1. ${draft.tenantName || 'The tenant'} agrees to occupy ${draft.propertyTitle} for the tenancy period stated above.`,
    `2. Total rent for the ${summary.tenancyPeriodLabel} is UGX ${summary.totalRentAmount.toLocaleString()}, based on ${summary.billingCycles} ${cycleUnitLabel(draft.rentPeriod, summary.billingCycles)} billed on a ${summary.rentScheduleLabel} basis unless otherwise agreed in writing.`,
    '3. The tenant agrees to keep the property in good condition and report maintenance needs promptly through Afodabo Housing.',
    `4. ${draft.managerName || 'The house manager'} agrees to provide reasonable access to the property and respond to tenancy concerns in a timely manner.`,
    '5. Either party may terminate or renew the tenancy according to the applicable platform and property terms.',
    '',
    `Prepared by: ${draft.managerName || draft.generatedByName || 'Afodabo Housing Manager'}`,
    `Prepared from account: ${draft.generatedByEmail || 'Manager account'}`,
  ].join('\n');
}

export function buildTenancyAgreementHtml(draft: TenancyAgreementDraft) {
  const summary = summarizeTenancyAgreement(draft);
  const agreementText = buildTenancyAgreementText(draft)
    .split('\n')
    .map((line) => `<p>${escapeHtml(line || ' ')}</p>`)
    .join('');

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
          .subhead {
            color: #675C53;
            font-size: 14px;
            margin: 0 0 20px 0;
          }
          .summary {
            background: #F4EDE1;
            border-radius: 14px;
            padding: 16px;
            margin-bottom: 20px;
          }
          .summary strong {
            display: inline-block;
            min-width: 140px;
          }
          p {
            margin: 0 0 8px 0;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <h1>Afodabo Housing Tenancy Agreement</h1>
          <p class="subhead">Draft agreement generated from the mobile tenancy workflow.</p>
          <div class="summary">
            <p><strong>Property</strong> ${escapeHtml(draft.propertyTitle)}</p>
            <p><strong>Tenant</strong> ${escapeHtml(draft.tenantName || draft.tenantEmail)}</p>
            <p><strong>House manager</strong> ${escapeHtml(
              draft.managerName || draft.generatedByName || 'Afodabo Housing Manager',
            )}</p>
            <p><strong>Rent per cycle</strong> UGX ${draft.rentAmount.toLocaleString()}</p>
            <p><strong>Billing cycle</strong> ${escapeHtml(summary.rentScheduleLabel)}</p>
            <p><strong>Tenancy period</strong> ${escapeHtml(summary.tenancyPeriodLabel)}</p>
            <p><strong>Period total</strong> UGX ${summary.totalRentAmount.toLocaleString()}</p>
            <p><strong>Term</strong> ${escapeHtml(formatAgreementDate(draft.startDate))} to ${escapeHtml(
              formatAgreementDate(draft.endDate),
            )}</p>
          </div>
          ${agreementText}
        </div>
      </body>
    </html>
  `;
}

export async function downloadTenancyAgreementPdf(draft: TenancyAgreementDraft) {
  const html = buildTenancyAgreementHtml(draft);
  const printed = await Print.printToFileAsync({ html });
  const safeTitle = slugify(draft.propertyTitle || 'tenancy-agreement');
  const targetUri =
    FileSystem.documentDirectory != null
      ? `${FileSystem.documentDirectory}${safeTitle}-tenancy-agreement.pdf`
      : printed.uri;

  if (FileSystem.documentDirectory) {
    await FileSystem.copyAsync({
      from: printed.uri,
      to: targetUri,
    });
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(targetUri, {
      dialogTitle: 'Download tenancy agreement PDF',
      mimeType: 'application/pdf',
      UTI: '.pdf',
    });
  }

  return targetUri;
}

export async function downloadTenancyAgreementEditable(draft: TenancyAgreementDraft) {
  const html = buildTenancyAgreementHtml(draft);
  const safeTitle = slugify(draft.propertyTitle || 'tenancy-agreement');
  const targetUri =
    FileSystem.documentDirectory != null
      ? `${FileSystem.documentDirectory}${safeTitle}-tenancy-agreement.html`
      : `${safeTitle}-tenancy-agreement.html`;

  await FileSystem.writeAsStringAsync(targetUri, html, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(targetUri, {
      dialogTitle: 'Download editable tenancy agreement',
      mimeType: 'text/html',
      UTI: '.html',
    });
  }

  return targetUri;
}
