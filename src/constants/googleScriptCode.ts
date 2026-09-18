/**
 * Google Apps Script Code (Code.gs)
 * এই স্ক্রিপ্টটি Google Sheets-এর সাথে Web App হিসেবে যুক্ত হয়ে কাজ করবে।
 * এতে রয়েছে ডায়নামিক মান্থ হেডার লজিক এবং CORS সমর্থিত doPost হ্যান্ডলার।
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * 📋 LogCrafter - Google Apps Script (Code.gs)
 * =========================================================================
 * 
 * বিবরণ:
 * এই স্ক্রিপ্টটি React ফ্রন্টএন্ড থেকে POST রিকোয়েস্ট রিসিভ করে এবং
 * স্বয়ংক্রিয়ভাবে গুগল শিটে মাস পরিবর্তন (Month Change) শনাক্ত করে:
 *  ১) নতুন মাস হলে: একটি মাসের হেডার রো (যেমন: "September 2026") তৈরি করে
 *  ২) এরপর কলাম হেডার রো (Date, Work 1, Work 2, ...) বসায়
 *  ৩) এরপর ডেটা রো ইনসার্ট করে
 *  ৪) একই মাস থাকলে: শুধুমাত্র ডেটা রো যোগ করে
 * 
 * সেটআপ নির্দেশিকা নিচে দেওয়া হয়েছে।
 */

// কনফিগারেশন
const SHEET_NAME = "WorkflowData"; // আপনার গুগল শিটের ট্যাবের নাম

/**
 * doPost(e): React অ্যাপ থেকে আসা POST রিকোয়েস্ট প্রসেস করে
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // সমসাময়িক রিকোয়েস্ট আটকানোর জন্য লক (Lock) ব্যবহার করা হয়েছে
  lock.tryLock(10000);

  try {
    // ১. ইনপুট ডেটা পার্স করা
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        status: "error",
        message: "কোনো ডেটা পাওয়া যায়নি (No payload received)."
      }, 400);
    }

    const payload = JSON.parse(e.postData.contents);
    
    // প্রয়োজনীয় ফিল্ড ভ্যালিডেশন
    const dateStr = payload.date; // ফরম্যাট: "YYYY-MM-DD"
    const work1 = payload.work1 || "";

    if (!dateStr || !work1.trim()) {
      return createJsonResponse({
        status: "error",
        message: "Date এবং Work 1 ম্যান্ডেটরি ফিল্ড।"
      }, 400);
    }

    const targetSheetName = payload.sheetName || "Home Works";
    const work2 = payload.work2 || "";
    const work3 = payload.work3 || "";
    const work4 = payload.work4 || "";
    const workHours = payload.workHours || "0";
    const workDueHours = payload.workDueHours || "";
    const signature = payload.signature || ""; // Base64 Data URL
    const submittedAt = payload.submittedAt || new Date().toISOString();

    // ২. গুগল স্প্রেডশিট ওপেন করা ও নির্দিষ্ট ওয়ার্কশিট (ট্যাব) নির্বাচন/তৈরি
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(targetSheetName);
    if (!sheet) {
      // যদি এই নামের শিট না থাকে, তবে স্বয়ংক্রিয়ভাবে নতুন ট্যাব তৈরি হবে
      sheet = ss.insertSheet(targetSheetName);
    }

    // ৩. সাবমিট করা তারিখ থেকে মাস ও বছর নির্ণয়
    // উদাহরণ: "2026-09-17" -> "September 2026"
    const parsedDate = new Date(dateStr + "T00:00:00");
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const currentEntryMonth = monthNames[parsedDate.getMonth()] + " " + parsedDate.getFullYear();
    const currentMonthKey = parsedDate.getFullYear() + "-" + String(parsedDate.getMonth() + 1).padStart(2, '0');

    // ৪. আগের রো-এর মাস যাচাই করা (ডায়নামিক মান্থ হেডার লজিক)
    const lastRow = sheet.getLastRow();
    let isNewMonth = false;

    // প্রতিটি শিটের জন্য পৃথকভাবে মাস ট্র্যাকিং প্রপার্টি
    const lastMonthPropKey = "LAST_MONTH_" + targetSheetName.replace(/[^a-zA-Z0-9]/g, "_");

    if (lastRow === 0) {
      // শিটটি সম্পূর্ণ খালি থাকলে নতুন মাস ধরা হবে
      isNewMonth = true;
    } else {
      // শেষ সংরক্ষিত ডেটার তারিখ থেকে মাস খুঁজে বের করা
      const lastMonthProperty = PropertiesService.getScriptProperties().getProperty(lastMonthPropKey);
      
      if (!lastMonthProperty || lastMonthProperty !== currentMonthKey) {
        isNewMonth = true;
      }
    }

    // ৫. যদি নতুন মাস হয়, তবে মান্থ হেডার এবং কলাম হেডার ইনসার্ট করা
    if (isNewMonth) {
      // আগের ডেটা থাকলে ১টি খালি রো ফাঁকা রাখা যাতে দেখতে পরিষ্কার লাগে
      if (lastRow > 0) {
        sheet.appendRow([""]);
      }

      // ক) মাসের নাম হেডার (যেমন: "📅 September 2026")
      const monthHeaderRowIndex = sheet.getLastRow() + 1;
      const monthHeaderTitle = "📅 " + currentEntryMonth + " (ওয়ার্কফ্লো রেকর্ড - " + targetSheetName + ")";
      sheet.appendRow([monthHeaderTitle]);

      // মান্থ হেডার স্টাইলিং (গাঢ় নীল ব্যাকগ্রাউন্ড, সাদা বোল্ড টেক্সট)
      const monthRange = sheet.getRange(monthHeaderRowIndex, 1, 1, 9);
      monthRange.merge();
      monthRange.setBackground("#1E3A8A"); // Indigo / Navy
      monthRange.setFontColor("#FFFFFF");
      monthRange.setFontWeight("bold");
      monthRange.setFontSize(13);
      monthRange.setHorizontalAlignment("left");

      // খ) কলাম নাম হেডার বসানো
      const columnHeaders = [
        "Date (তারিখ)",
        "Work Hours (কাজের সময়)",
        "Work 1 (ম্যান্ডেটরি)",
        "Work 2",
        "Work 3",
        "Work 4",
        "Work Due Hours (বাকি ঘণ্টা)",
        "Signature (স্বাক্ষর স্ট্যাটাস)",
        "Submitted At (টাইমস্ট্যাম্প)"
      ];
      sheet.appendRow(columnHeaders);
      
      const colHeaderRowIndex = sheet.getLastRow();
      const colHeaderRange = sheet.getRange(colHeaderRowIndex, 1, 1, columnHeaders.length);
      colHeaderRange.setBackground("#E0E7FF"); // হালকা ইন্ডিগো
      colHeaderRange.setFontColor("#1E1B4B");
      colHeaderRange.setFontWeight("bold");
      colHeaderRange.setFontSize(10);
      colHeaderRange.setHorizontalAlignment("center");

      // স্ক্রিপ্ট প্রপার্টিজে বর্তমান মাস সেভ করে রাখা
      PropertiesService.getScriptProperties().setProperty(lastMonthPropKey, currentMonthKey);
    }

    // ৬. ইউজারের মূল ডেটা রো ইনসার্ট করা
    const hasSignature = signature && signature.length > 50;
    const signatureCellVal = hasSignature ? "✔️ Signed (সংরক্ষিত)" : "❌ No Signature";

    const dataRow = [
      dateStr,
      workHours ? workHours + " hrs" : "0 hrs",
      work1,
      work2,
      work3,
      work4,
      workDueHours || "0",
      signatureCellVal,
      new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" })
    ];

    sheet.appendRow(dataRow);
    const newEntryRowIndex = sheet.getLastRow();
    
    // রো স্টাইলিং ও বর্ডার
    const newRowRange = sheet.getRange(newEntryRowIndex, 1, 1, dataRow.length);
    newRowRange.setFontSize(10);
    newRowRange.setVerticalAlignment("middle");
    if (newEntryRowIndex % 2 === 0) {
      newRowRange.setBackground("#F8FAFC");
    }

    // অটো-ফিট কলাম উইডথ
    for (let col = 1; col <= dataRow.length; col++) {
      sheet.autoResizeColumn(col);
    }

    return createJsonResponse({
      status: "success",
      message: "ডেটা সফলভাবে গুগল শিটে যুক্ত হয়েছে।",
      monthInserted: isNewMonth ? currentEntryMonth : null,
      rowIndex: newEntryRowIndex
    }, 200);

  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: "ত্রুটি ঘটেছে: " + err.toString()
    }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * doGet(e): ব্রাউজারে API টেস্ট করার জন্য
 */
function doGet(e) {
  return createJsonResponse({
    status: "ok",
    message: "ডায়নামিক ওয়ার্কফ্লো Google Apps Script API সচল আছে। POST রিকোয়েস্ট পাঠান।"
  }, 200);
}

/**
 * CORS ও JSON রেসপন্স তৈরির হেল্পার
 */
function createJsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
`;

export const SETUP_STEPS = [
  {
    step: 1,
    title: "একটি নতুন Google Sheet তৈরি করুন",
    titleEn: "Create a Google Sheet",
    description: "আপনার Google Drive এ গিয়ে একটি নতুন Google Sheet খুলুন এবং নাম দিন যেমন 'Workflow Database'।",
  },
  {
    step: 2,
    title: "Apps Script এডিটর খুলুন",
    titleEn: "Open Apps Script Editor",
    description: "Google Sheet-এর উপরের মেনু থেকে Extensions > Apps Script ক্লিক করুন।",
  },
  {
    step: 3,
    title: "কোড পেস্ট করুন",
    titleEn: "Paste the Code",
    description: "Apps Script এডিটরে থাকা আগের কোড মুছে দিয়ে উপরের 'Code.gs' সম্পূর্ণ কোডটি পেস্ট করুন এবং Save আইকনে ক্লিক করুন।",
  },
  {
    step: 4,
    title: "Web App হিসেবে Deploy করুন",
    titleEn: "Deploy as Web App",
    description: "ডান পাশের 'Deploy' বাটনে ক্লিক করে 'New deployment' সিলেক্ট করুন। গিয়ার আইকনে ক্লিক করে 'Web app' বেছে নিন।",
  },
  {
    step: 5,
    title: "অ্যাক্সেস পারমিশন সেট করুন (গুরুত্বপূর্ণ)",
    titleEn: "Set Who has access to Anyone",
    description: "Execute as: 'Me' রাখুন এবং 'Who has access' ফিল্ডে অবশ্যই 'Anyone' (যে কেউ) সিলেক্ট করুন। এরপর Deploy বাটনে ক্লিক করুন।",
  },
  {
    step: 6,
    title: "Web App URL কপি করে অ্যাপে বসান",
    titleEn: "Copy Web App URL into this React App",
    description: "ডিপ্লয় সফল হলে একটি 'Web App URL' দেখতে পাবেন (যা script.google.com/... দিয়ে শুরু)। সেটি কপি করে এই অ্যাপের 'Google Apps Script Settings'-এ সেভ করুন।",
  },
];
