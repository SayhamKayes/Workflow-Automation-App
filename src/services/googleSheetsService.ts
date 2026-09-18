import { WorkflowItem } from '../types';

export interface GoogleSpreadsheetInfo {
  id: string;
  name: string;
  url: string;
}

export const DEFAULT_WORKSHEET_NAME = 'Untitled Worksheet';

const APP_SPREADSHEET_NAME = 'LogCrafter - Workflow Database';

/**
 * Searches user's Google Drive for an existing spreadsheet created for this app.
 */
export async function findExistingSpreadsheet(accessToken: string): Promise<GoogleSpreadsheetInfo | null> {
  try {
    const query = encodeURIComponent(`(name = '${APP_SPREADSHEET_NAME}' or name = 'Dynamic Workflow - Automation') and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
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
  initialSheets: string[] = [DEFAULT_WORKSHEET_NAME]
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
        'Work Hours (hrs)',
        'Work 1 (Mandatory)',
        'Work 2',
        'Work 3',
        'Work 4',
        'Due Hours (hrs)',
        'Signature',
        'Worksheet',
        'Submitted At',
      ],
    ];

    // 1. Write Header Row values
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

    // 2. Fetch numeric sheetId for styling batchUpdate
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!metaRes.ok) return;
    const metaData = await metaRes.json();
    const sheetObj = metaData.sheets?.find(
      (s: { properties?: { title?: string; sheetId?: number } }) => s.properties?.title === sheetName
    );
    if (!sheetObj || sheetObj.properties?.sheetId === undefined) return;
    const sheetId = sheetObj.properties.sheetId;

    // 3. Apply header styling, column alignments, comfortable widths, and freeze row 1
    // Work 1, Work 2, Work 3, Work 4 all have the exact same generous width (280px)
    const columnWidthRequests = [
      { index: 0, width: 160 }, // Record ID
      { index: 1, width: 120 }, // Date
      { index: 2, width: 140 }, // Work Hours (hrs)
      { index: 3, width: 280 }, // Work 1 (Mandatory)
      { index: 4, width: 280 }, // Work 2
      { index: 5, width: 280 }, // Work 3
      { index: 6, width: 280 }, // Work 4
      { index: 7, width: 130 }, // Due Hours (hrs)
      { index: 8, width: 120 }, // Signature
      { index: 9, width: 130 }, // Worksheet
      { index: 10, width: 180 }, // Submitted At
    ].map(col => ({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: col.index,
          endIndex: col.index + 1,
        },
        properties: {
          pixelSize: col.width,
        },
        fields: 'pixelSize',
      },
    }));

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            // A. Header Row Styling (Row 0): Bold, White text, Navy Background, Centered
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 11,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: {
                      red: 30 / 255,
                      green: 41 / 255,
                      blue: 59 / 255,
                    },
                    textFormat: {
                      bold: true,
                      fontSize: 10,
                      foregroundColor: {
                        red: 1,
                        green: 1,
                        blue: 1,
                      },
                    },
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
              },
            },
            // B. Freeze Row 1 so it stays fixed while scrolling
            {
              updateSheetProperties: {
                properties: {
                  sheetId,
                  gridProperties: {
                    frozenRowCount: 1,
                  },
                },
                fields: 'gridProperties.frozenRowCount',
              },
            },
            // C. Task Columns (Work 1 to 4): Left aligned with text wrapping
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  startColumnIndex: 3,
                  endColumnIndex: 7,
                },
                cell: {
                  userEnteredFormat: {
                    horizontalAlignment: 'LEFT',
                    verticalAlignment: 'MIDDLE',
                    wrapStrategy: 'WRAP',
                  },
                },
                fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,wrapStrategy)',
              },
            },
            // D. Center alignment for Record ID, Date, Work Hours
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 3,
                },
                cell: {
                  userEnteredFormat: {
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)',
              },
            },
            // E. Center alignment for Due Hours, Signature, Worksheet, Submitted At
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  startColumnIndex: 7,
                  endColumnIndex: 11,
                },
                cell: {
                  userEnteredFormat: {
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)',
              },
            },
            // F. Set generous, equal widths for all columns (Work 1-4 are 280px)
            ...columnWidthRequests,
          ],
        }),
      }
    );
  } catch (err) {
    console.warn(`Could not initialize headers for sheet ${sheetName}:`, err);
  }
}

/**
 * Creates a new sheet tab in the existing Google Spreadsheet and adds headers.
 */
export async function createWorksheetTab(
  accessToken: string,
  spreadsheetId: string,
  title: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title,
                },
              },
            },
          ],
        }),
      }
    );

    if (res.ok) {
      await initSheetHeaders(accessToken, spreadsheetId, title);
    }
    return res.ok;
  } catch (err) {
    console.error('Error adding sheet tab to Google Sheets:', err);
    return false;
  }
}

/**
 * Renames an existing worksheet tab inside the user's Google Spreadsheet.
 */
export async function renameWorksheetTab(
  accessToken: string,
  spreadsheetId: string,
  oldTitle: string,
  newTitle: string
): Promise<boolean> {
  try {
    // 1. Fetch spreadsheet metadata to find the numeric sheetId for oldTitle
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!metaRes.ok) return false;
    const metaData = await metaRes.json();
    const sheetObj = metaData.sheets?.find(
      (s: { properties?: { title?: string; sheetId?: number } }) => s.properties?.title === oldTitle
    );
    if (!sheetObj || sheetObj.properties?.sheetId === undefined) return false;

    const sheetId = sheetObj.properties.sheetId;

    // 2. batchUpdate to rename sheet title
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId,
                  title: newTitle,
                },
                fields: 'title',
              },
            },
          ],
        }),
      }
    );

    return updateRes.ok;
  } catch (err) {
    console.error('Error renaming worksheet in Google Sheets:', err);
    return false;
  }
}

/**
 * Deletes a worksheet tab from the user's Google Spreadsheet.
 */
export async function deleteWorksheetTab(
  accessToken: string,
  spreadsheetId: string,
  title: string
): Promise<boolean> {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!metaRes.ok) return false;
    const metaData = await metaRes.json();
    const sheetObj = metaData.sheets?.find(
      (s: { properties?: { title?: string; sheetId?: number } }) => s.properties?.title === title
    );
    if (!sheetObj || sheetObj.properties?.sheetId === undefined) return false;

    const sheetId = sheetObj.properties.sheetId;

    const delRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              deleteSheet: {
                sheetId,
              },
            },
          ],
        }),
      }
    );
    return delRes.ok;
  } catch (err) {
    console.error('Error deleting sheet tab from Google Sheets:', err);
    return false;
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
    const sheetName = item.sheetName || DEFAULT_WORKSHEET_NAME;

    // Convert workHours and dueHours to pure numbers so Google Sheets can automatically calculate SUM and Average upon selection
    const parsedWorkHours = parseFloat(String(item.workHours || '0')) || 0;
    const parsedDueHours = parseFloat(String(item.workDueHours || '0')) || 0;

    const row = [
      item.id,
      item.date,
      parsedWorkHours,
      item.work1 || '',
      item.work2 || '',
      item.work3 || '',
      item.work4 || '',
      parsedDueHours,
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

    if (response.ok) {
      // Enforce equal 280px column widths and alignments in the background
      triggerSheetFormattingAndWidths(accessToken, spreadsheetId, sheetName).catch(() => {});
    }

    return response.ok;
  } catch (err) {
    console.error('Failed to append row to user Google Sheet:', err);
    return false;
  }
}

/**
 * Asynchronously enforces generous equal column widths (280px for tasks) and clean alignments to the sheet.
 */
export async function triggerSheetFormattingAndWidths(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!metaRes.ok) return;
    const metaData = await metaRes.json();
    const sheetObj = metaData.sheets?.find(
      (s: { properties?: { title?: string; sheetId?: number } }) => s.properties?.title === sheetName
    );
    if (!sheetObj || sheetObj.properties?.sheetId === undefined) return;
    const sheetId = sheetObj.properties.sheetId;

    const columnWidthRequests = [
      { index: 0, width: 160 }, // Record ID
      { index: 1, width: 120 }, // Date
      { index: 2, width: 140 }, // Work Hours (hrs)
      { index: 3, width: 280 }, // Work 1 (Mandatory)
      { index: 4, width: 280 }, // Work 2
      { index: 5, width: 280 }, // Work 3
      { index: 6, width: 280 }, // Work 4
      { index: 7, width: 130 }, // Due Hours (hrs)
      { index: 8, width: 120 }, // Signature
      { index: 9, width: 130 }, // Worksheet
      { index: 10, width: 180 }, // Submitted At
    ].map(col => ({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: col.index,
          endIndex: col.index + 1,
        },
        properties: {
          pixelSize: col.width,
        },
        fields: 'pixelSize',
      },
    }));

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            // 1. Enforce generous, equal column widths for all columns (Work 1-4 are 280px)
            ...columnWidthRequests,
            // 2. Align task description columns (Work 1, Work 2, Work 3, Work 4) to the LEFT with wrap
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  startColumnIndex: 3,
                  endColumnIndex: 7,
                },
                cell: {
                  userEnteredFormat: {
                    horizontalAlignment: 'LEFT',
                    verticalAlignment: 'MIDDLE',
                    wrapStrategy: 'WRAP',
                  },
                },
                fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,wrapStrategy)',
              },
            },
            // 3. Align Date, Work Hours to CENTER
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 3,
                },
                cell: {
                  userEnteredFormat: {
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)',
              },
            },
            // 4. Align Due Hours, Signature, Worksheet, Submitted At to CENTER
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  startColumnIndex: 7,
                  endColumnIndex: 11,
                },
                cell: {
                  userEnteredFormat: {
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                  },
                },
                fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)',
              },
            },
          ],
        }),
      }
    );
  } catch (err) {
    console.warn('Could not enforce sheet formatting and column widths:', err);
  }
}
