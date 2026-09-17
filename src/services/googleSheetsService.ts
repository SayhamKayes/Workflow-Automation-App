import { WorkflowItem } from '../types';

export interface GoogleSpreadsheetInfo {
  id: string;
  name: string;
  url: string;
}

const APP_SPREADSHEET_NAME = 'Dynamic Workflow - Automation';

/**
 * Searches user's Google Drive for an existing spreadsheet created for this app.
 */
export async function findExistingSpreadsheet(accessToken: string): Promise<GoogleSpreadsheetInfo | null> {
  try {
    const query = encodeURIComponent(`name = '${APP_SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.warn('Could not search Google Drive files:', response.statusText);
      return null;
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      const file = data.files[0];
      return {
        id: file.id,
        name: file.name,
        url: file.webViewLink,
      };
    }
    return null;
  } catch (error) {
    console.error('Error finding existing spreadsheet in Google Drive:', error);
    return null;
  }
}

/**
 * Creates a brand new Google Spreadsheet in the user's personal Google Drive
 * with formatted headers.
 */
export async function createPersonalSpreadsheet(
  accessToken: string,
  initialSheets: string[] = ['Home Works']
): Promise<GoogleSpreadsheetInfo> {
  const sheetsPayload = initialSheets.map(title => ({
    properties: { title },
  }));

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: APP_SPREADSHEET_NAME,
      },
      sheets: sheetsPayload,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to create Google Spreadsheet: ${errorData.error?.message || response.statusText}`
    );
  }

  const result = await response.json();
  const spreadsheetId = result.spreadsheetId;
  const webViewLink = result.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Initialize header rows in the sheets
  for (const sheetName of initialSheets) {
    await initSheetHeaders(accessToken, spreadsheetId, sheetName);
  }

  return {
    id: spreadsheetId,
    name: APP_SPREADSHEET_NAME,
    url: webViewLink,
  };
}

/**
 * Writes the standard column headers into a worksheet if it is empty.
 */
export async function initSheetHeaders(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  try {
    const headers = [
      [
        'Record ID',
        'Date',
        'Work Hours',
        'Work 1 (Mandatory)',
        'Work 2',
        'Work 3',
        'Work 4',
        'Due Hours',
        'Signature',
        'Worksheet',
        'Submitted At',
      ],
    ];
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:K1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: headers }),
      }
    );
  } catch (err) {
    console.warn(`Could not initialize headers for sheet ${sheetName}:`, err);
  }
}

/**
 * Appends a workflow record row directly into the user's personal Google Sheet.
 */
export async function appendWorkflowRowToSheet(
  accessToken: string,
  spreadsheetId: string,
  item: WorkflowItem
): Promise<boolean> {
  try {
    const sheetName = item.sheetName || 'Home Works';
    const row = [
      item.id,
      item.date,
      item.workHours ? `${item.workHours} hrs` : '0 hrs',
      item.work1 || '',
      item.work2 || '',
      item.work3 || '',
      item.work4 || '',
      item.workDueHours || '0',
      item.signature ? '✔️ Signed' : '❌ No Signature',
      sheetName,
      item.submittedAt || new Date().toLocaleString(),
    ];

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );

    return response.ok;
  } catch (err) {
    console.error('Failed to append row to user Google Sheet:', err);
    return false;
  }
}
