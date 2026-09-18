import { WorkflowItem } from '../types';

export interface GoogleSpreadsheetInfo {
  id: string;
  name: string;
  url: string;
}

export const DEFAULT_WORKSHEET_NAME = 'Untitled Worksheet';

const APP_SPREADSHEET_NAME = 'LogCrafter - Workflow Database';

/**
 * Safely formats an A1 notation range for Google Sheets API.
 * Sheet names with spaces or special characters MUST be wrapped in single quotes, e.g.:
 * 'Untitled Worksheet'!A1:K1
 */
export function formatA1Range(sheetName: string, range?: string): string {
  const safeSheetName = `'${(sheetName || DEFAULT_WORKSHEET_NAME).replace(/'/g, "''")}'`;
  return range ? `${safeSheetName}!${range}` : safeSheetName;
}

/**
 * Searches user's Google Drive for an existing spreadsheet created for this app.
 */
export async function findExistingSpreadsheet(accessToken: string): Promise<GoogleSpreadsheetInfo | null> {
  try {
    const query = encodeURIComponent(
      `(name contains 'LogCrafter' or name contains 'Workflow' or name = '${APP_SPREADSHEET_NAME}' or name = 'Dynamic Workflow - Automation') and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&fields=files(id,name,webViewLink)`,
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
        url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
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
    const headerRange = formatA1Range(sheetName, 'A1:K1');
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(headerRange)}?valueInputOption=USER_ENTERED`,
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
    const columnWidthRequests = [
      { index: 0, width: 130 }, // Record ID
      { index: 1, width: 115 }, // Date
      { index: 2, width: 135 }, // Work Hours (hrs)
      { index: 3, width: 260 }, // Work 1 (Mandatory)
      { index: 4, width: 210 }, // Work 2
      { index: 5, width: 210 }, // Work 3
      { index: 6, width: 210 }, // Work 4
      { index: 7, width: 135 }, // Due Hours (hrs)
      { index: 8, width: 125 }, // Signature
      { index: 9, width: 140 }, // Worksheet
      { index: 10, width: 170 }, // Submitted At
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
            // F. Set comfortable initial widths
            ...columnWidthRequests,
            // G. Auto-resize all columns based on content
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 11,
                },
              },
            },
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

    const rangeA1 = formatA1Range(sheetName, 'A1');
    let response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeA1)}:append?valueInputOption=USER_ENTERED`,
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

    // If tab doesn't exist yet, automatically create the tab and retry
    if (!response.ok && response.status === 400) {
      console.warn(`Tab '${sheetName}' might not exist. Creating tab and retrying append...`);
      const created = await createWorksheetTab(accessToken, spreadsheetId, sheetName);
      if (created) {
        response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeA1)}:append?valueInputOption=USER_ENTERED`,
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
      }
    }

    if (response.ok) {
      // Auto-fit column widths and ensure alignment asynchronously in the background
      triggerAutoResizeAndFormatting(accessToken, spreadsheetId, sheetName).catch(() => {});
    }

    return response.ok;
  } catch (err) {
    console.error('Failed to append row to user Google Sheet:', err);
    return false;
  }
}

/**
 * Bulk appends workflow items grouped by worksheet tab into the Google Sheet.
 * Used for initial sync when a connected Google Sheet is empty.
 */
export async function batchAppendWorkflowRowsToSheet(
  accessToken: string,
  spreadsheetId: string,
  items: WorkflowItem[]
): Promise<boolean> {
  if (!items || items.length === 0) return true;

  try {
    // 1. Group items by sheetName
    const grouped: Record<string, WorkflowItem[]> = {};
    for (const item of items) {
      const s = item.sheetName || DEFAULT_WORKSHEET_NAME;
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(item);
    }

    // 2. Fetch existing tabs to see if we need to create any
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const existingTabs = new Set<string>();
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      (metaData.sheets || []).forEach((sh: { properties?: { title?: string } }) => {
        if (sh.properties?.title) existingTabs.add(sh.properties.title);
      });
    }

    // 3. For each sheet group, ensure tab exists and append rows
    for (const [sheetName, sheetItems] of Object.entries(grouped)) {
      if (!existingTabs.has(sheetName)) {
        await createWorksheetTab(accessToken, spreadsheetId, sheetName);
        existingTabs.add(sheetName);
      }

      const rows = sheetItems.map(item => [
        item.id,
        item.date,
        parseFloat(String(item.workHours || '0')) || 0,
        item.work1 || '',
        item.work2 || '',
        item.work3 || '',
        item.work4 || '',
        parseFloat(String(item.workDueHours || '0')) || 0,
        item.signature ? '✔️ Signed' : '❌ No Signature',
        sheetName,
        item.submittedAt || new Date().toLocaleString(),
      ]);

      const rangeA1 = formatA1Range(sheetName, 'A1');
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeA1)}:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: rows,
          }),
        }
      );

      triggerAutoResizeAndFormatting(accessToken, spreadsheetId, sheetName).catch(() => {});
    }

    return true;
  } catch (err) {
    console.error('Failed to batch append rows to Google Sheet:', err);
    return false;
  }
}

/**
 * Asynchronously auto-resizes columns and applies clean alignments to the sheet.
 */
async function triggerAutoResizeAndFormatting(
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
            // 1. Auto-resize all 11 columns to fit their longest content
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 11,
                },
              },
            },
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
    console.warn('Could not auto-resize/format sheet columns:', err);
  }
}

/**
 * Updates an existing row in the user's Google Spreadsheet matching item.id (stored in column A).
 */
export async function updateWorkflowRowInSheet(
  accessToken: string,
  spreadsheetId: string,
  item: WorkflowItem
): Promise<boolean> {
  try {
    const sheetName = item.sheetName || DEFAULT_WORKSHEET_NAME;

    // 1. Fetch column A (Record IDs) to find the exact row number
    const rangeColA = formatA1Range(sheetName, 'A:A');
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeColA)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!getRes.ok) return false;
    const getData = await getRes.json();
    const rows = getData.values as string[][] | undefined;
    if (!rows || rows.length === 0) return false;

    // Find the row index where column A matches item.id
    const rowIndex = rows.findIndex(r => r && r[0] === item.id);
    if (rowIndex === -1) {
      console.warn(`Could not find row with ID ${item.id} in sheet ${sheetName}`);
      return false;
    }
    const rowNumber = rowIndex + 1; // 1-indexed for Sheets

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

    // 2. Overwrite the specific row range A{rowNumber}:K{rowNumber}
    const rowRange = formatA1Range(sheetName, `A${rowNumber}:K${rowNumber}`);
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rowRange)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );

    if (updateRes.ok) {
      triggerAutoResizeAndFormatting(accessToken, spreadsheetId, sheetName).catch(() => {});
    }

    return updateRes.ok;
  } catch (err) {
    console.error('Failed to update row in Google Sheet:', err);
    return false;
  }
}

/**
 * Deletes a row from the user's Google Spreadsheet matching itemId (stored in column A).
 */
export async function deleteWorkflowRowFromSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  itemId: string
): Promise<boolean> {
  try {
    // 1. Fetch spreadsheet metadata to get numeric sheetId
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!metaRes.ok) return false;
    const metaData = await metaRes.json();
    const sheetObj = metaData.sheets?.find(
      (s: { properties?: { title?: string; sheetId?: number } }) => s.properties?.title === sheetName
    );
    if (!sheetObj || sheetObj.properties?.sheetId === undefined) return false;
    const sheetId = sheetObj.properties.sheetId;

    // 2. Fetch Column A to find the 0-indexed row index
    const rangeColA = formatA1Range(sheetName, 'A:A');
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeColA)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!getRes.ok) return false;
    const getData = await getRes.json();
    const rows = getData.values as string[][] | undefined;
    if (!rows || rows.length === 0) return false;

    const rowIndex = rows.findIndex(r => r && r[0] === itemId);
    if (rowIndex === -1) return false;

    // 3. Delete the specific row using deleteDimension batchUpdate
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
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
                },
              },
            },
          ],
        }),
      }
    );

    return delRes.ok;
  } catch (err) {
    console.error('Failed to delete row from Google Sheet:', err);
    return false;
  }
}

/**
 * Clears all data rows in a worksheet tab while preserving the header row.
 */
export async function clearWorksheetRowsInSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<boolean> {
  try {
    const rangeClear = formatA1Range(sheetName, 'A2:K');
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeClear)}:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return res.ok;
  } catch (err) {
    console.error('Failed to clear worksheet data in Google Sheet:', err);
    return false;
  }
}

/**
 * Loads all worksheet tabs and their workflow entries directly from Google Sheets.
 */
export async function fetchSpreadsheetData(
  accessToken: string,
  spreadsheetId: string
): Promise<{ worksheets: string[]; items: WorkflowItem[] } | null> {
  try {
    // 1. Fetch all sheet tab names
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title,sheetId)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!metaRes.ok) return null;
    const metaData = await metaRes.json();
    const sheetTitles = (metaData.sheets || [])
      .map((s: { properties?: { title?: string } }) => s.properties?.title)
      .filter(Boolean) as string[];

    if (sheetTitles.length === 0) return null;

    // 2. Fetch rows for all sheets via batchGet using safe single-quoted ranges
    const queryRanges = sheetTitles
      .map(t => `ranges=${encodeURIComponent(formatA1Range(t, 'A2:K'))}`)
      .join('&');

    const batchRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${queryRanges}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!batchRes.ok) {
      console.warn('Could not batchGet sheet data:', batchRes.statusText);
      return { worksheets: sheetTitles, items: [] };
    }
    const batchData = await batchRes.json();

    const loadedItems: WorkflowItem[] = [];

    (batchData.valueRanges || []).forEach((vr: { range?: string; values?: (string | number)[][] }, idx: number) => {
      const sheetName = sheetTitles[idx] || DEFAULT_WORKSHEET_NAME;
      const rows = vr.values || [];

      rows.forEach((r, rowIdx) => {
        if (!r || r.length === 0 || !r[1]) return; // Skip empty rows or rows without date
        loadedItems.push({
          id: String(r[0] || `item_${Date.now()}_${idx}_${rowIdx}`),
          date: String(r[1] || ''),
          workHours: String(r[2] ?? '0'),
          work1: String(r[3] || ''),
          work2: String(r[4] || ''),
          work3: String(r[5] || ''),
          work4: String(r[6] || ''),
          workDueHours: String(r[7] ?? '0'),
          signature: r[8] && String(r[8]).includes('Signed') ? 'attached' : '',
          sheetName: String(r[9] || sheetName),
          submittedAt: String(r[10] || ''),
        });
      });
    });

    return {
      worksheets: sheetTitles,
      items: loadedItems,
    };
  } catch (err) {
    console.error('Failed to fetch spreadsheet data from Google Sheets:', err);
    return null;
  }
}

