import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'bn';

export interface Translations {
  common: {
    appName: string;
    appSubtitle: string;
    sheetsDbBadge: string;
    save: string;
    cancel: string;
    close: string;
    edit: string;
    delete: string;
    actions: string;
    required: string;
    loading: string;
    success: string;
    error: string;
    today: string;
    hoursShort: string;
    tasksDoneShort: string;
    sheet: string;
    allSheets: string;
    activeSheet: string;
  };
  header: {
    activeSheetTitle: string;
    statsBtn: string;
    statsTitle: string;
    scriptConnected: string;
    previewMode: string;
    appsScriptBtn: string;
    settingsBtn: string;
    themeToggleLight: string;
    themeToggleDark: string;
    accentPalette: string;
    languageSelect: string;
  };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    statsBtn: string;
    scriptBtn: string;
  };
  form: {
    title: string;
    targetSheetLabel: string;
    addSheetPlaceholder: string;
    addSheetBtn: string;
    dateLabel: string;
    datePlaceholder: string;
    workHoursLabel: string;
    workHoursPlaceholder: string;
    workHoursHelper: string;
    dueHoursLabel: string;
    dueHoursPlaceholder: string;
    dueHoursHelper: string;
    work1Label: string;
    work1Placeholder: string;
    work2Label: string;
    work2Placeholder: string;
    work3Label: string;
    work3Placeholder: string;
    work4Label: string;
    work4Placeholder: string;
    voiceTooltip: string;
    voiceListening: string;
    signatureLabel: string;
    clearSignature: string;
    savedSignatureNotice: string;
    submitBtn: string;
    submittingBtn: string;
    submitSuccess: string;
    submitError: string;
    fillRequiredAlert: string;
    tipsTitle: string;
    tip1Title: string;
    tip1Desc: string;
    tip2Title: string;
    tip2Desc: string;
    tip3Title: string;
    tip3Desc: string;
  };
  preview: {
    title: string;
    subtitle: string;
    totalRecords: string;
    addSheetBtn: string;
    newSheetInputPlaceholder: string;
    deleteSheetBtn: string;
    deleteSheetConfirm: string;
    minSheetAlert: string;
    exportCsv: string;
    clearData: string;
    clearDataConfirm: string;
    thDate: string;
    thWork1: string;
    thWork2: string;
    thWork3: string;
    thWork4: string;
    thWorkHours: string;
    thDueHours: string;
    thSignature: string;
    thActions: string;
    emptySheet: string;
    emptySheetDesc: string;
    editEntryTooltip: string;
    deleteEntryTooltip: string;
    deleteEntryConfirm: string;
    monthHeaderFormat: string;
    infographicTitle: string;
    infographicStep1Title: string;
    infographicStep1Desc: string;
    infographicStep2Title: string;
    infographicStep2Desc: string;
    infographicStep3Title: string;
    infographicStep3Desc: string;
  };
  editModal: {
    title: string;
    subtitle: string;
    saveChanges: string;
    discardChanges: string;
    successNotice: string;
    changeSignaturePrompt: string;
  };
  statsModal: {
    title: string;
    subtitle: string;
    rangeToday: string;
    rangeWeek: string;
    rangeMonth: string;
    range6Months: string;
    range1Year: string;
    rangeCustom: string;
    filterSheetLabel: string;
    metricTotalHours: string;
    metricTotalHoursDesc: string;
    metricAvgHours: string;
    metricAvgHoursDesc: string;
    metricCompletedTasks: string;
    metricCompletedTasksDesc: string;
    metricDaysWorked: string;
    metricDaysWorkedDesc: string;
    recentTableTitle: string;
    noDataInRange: string;
  };
  settingsModal: {
    title: string;
    subtitle: string;
    webAppUrlLabel: string;
    webAppUrlPlaceholder: string;
    saveUrlBtn: string;
    urlSavedToast: string;
    instructionsTitle: string;
    instructionsDesc: string;
    dangerZoneTitle: string;
    resetDemoBtn: string;
    resetDemoConfirm: string;
  };
  appsScriptModal: {
    title: string;
    subtitle: string;
    copyCodeBtn: string;
    codeCopiedToast: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
  };
  footer: {
    appName: string;
    techStack: string;
  };
}

const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    common: {
      appName: 'Dynamic Workflow App',
      appSubtitle: 'Automated Month Header • Voice Input • Multiple Worksheets',
      sheetsDbBadge: 'Sheets DB',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      edit: 'Edit',
      delete: 'Delete',
      actions: 'Actions',
      required: 'Required',
      loading: 'Loading...',
      success: 'Success',
      error: 'Error',
      today: 'Today',
      hoursShort: 'h',
      tasksDoneShort: 'done',
      sheet: 'Sheet',
      allSheets: 'All Worksheets',
      activeSheet: 'Active Sheet',
    },
    header: {
      activeSheetTitle: 'Current active worksheet',
      statsBtn: 'Statistics',
      statsTitle: 'View all-time and range-based statistics',
      scriptConnected: 'Apps Script Connected',
      previewMode: 'Live Preview Mode',
      appsScriptBtn: 'Apps Script',
      settingsBtn: 'Settings & Web App URL',
      themeToggleLight: 'Switch to Light Mode',
      themeToggleDark: 'Switch to Dark Mode',
      accentPalette: 'Choose Accent Theme Color',
      languageSelect: 'Select Language',
    },
    hero: {
      badge: 'Multi-Sheet Google Sheets Database System',
      title: 'Dynamic Workflow & Multiple Worksheet Automation',
      subtitle:
        'Manage multiple sheets including default "Home Works" or custom tabs. Seamless automated monthly banners, column headers, and live database sync with Google Sheets.',
      statsBtn: 'Analytics Dashboard',
      scriptBtn: 'Apps Script Code',
    },
    form: {
      title: 'Daily Workflow Entry Form',
      targetSheetLabel: 'Target Worksheet',
      addSheetPlaceholder: 'New worksheet name (e.g. Office, Study)...',
      addSheetBtn: 'Add Sheet',
      dateLabel: 'Work Date',
      datePlaceholder: 'YYYY-MM-DD',
      workHoursLabel: 'Hours Worked',
      workHoursPlaceholder: 'e.g. 8',
      workHoursHelper: 'Standard workday logged hours',
      dueHoursLabel: 'Pending / Due Hours',
      dueHoursPlaceholder: 'e.g. 1.5',
      dueHoursHelper: 'Overtime or remaining hours needed',
      work1Label: 'Work 1 (Primary Task)',
      work1Placeholder: 'Enter main morning or primary task details...',
      work2Label: 'Work 2 (Secondary Task)',
      work2Placeholder: 'Enter second task details (optional)...',
      work3Label: 'Work 3 (Afternoon Task)',
      work3Placeholder: 'Enter third task details (optional)...',
      work4Label: 'Work 4 (Evening/Additional Task)',
      work4Placeholder: 'Enter fourth task details (optional)...',
      voiceTooltip: 'Click to speak and auto-type with voice',
      voiceListening: 'Listening... speak clearly into your mic',
      signatureLabel: 'Digital Signature',
      clearSignature: 'Clear Signature',
      savedSignatureNotice: 'Signature auto-saved for subsequent entries',
      submitBtn: 'Save to Google Sheet',
      submittingBtn: 'Submitting Entry...',
      submitSuccess: 'Entry successfully recorded and synced!',
      submitError: 'Failed to record entry. Please check connection.',
      fillRequiredAlert: 'Please fill in Work 1 before submitting.',
      tipsTitle: 'Workflow Tips & Features',
      tip1Title: 'Multiple Worksheets',
      tip1Desc: 'Switch between "Home Works" or custom sheets dynamically without manual setup.',
      tip2Title: 'Voice Dictation',
      tip2Desc: 'Click the microphone icon beside any work field to dictate directly in natural language.',
      tip3Title: 'Persistent Signature',
      tip3Desc: 'Sign once using touch or mouse; your signature is preserved for seamless submissions.',
    },
    preview: {
      title: 'Google Sheet Live Preview',
      subtitle: 'Real-time synchronization mirroring your Google Sheets layout',
      totalRecords: 'Total entries',
      addSheetBtn: 'Add Sheet',
      newSheetInputPlaceholder: 'Worksheet name...',
      deleteSheetBtn: 'Delete Sheet',
      deleteSheetConfirm: 'Are you sure you want to delete worksheet "{sheet}" and all its local entries?',
      minSheetAlert: 'At least one worksheet must remain.',
      exportCsv: 'Export CSV',
      clearData: 'Clear Sheet Data',
      clearDataConfirm: 'Are you sure you want to clear all entries in worksheet "{sheet}"?',
      thDate: 'Date',
      thWork1: 'Work 1',
      thWork2: 'Work 2',
      thWork3: 'Work 3',
      thWork4: 'Work 4',
      thWorkHours: 'Work Hours',
      thDueHours: 'Due Hours',
      thSignature: 'Signature',
      thActions: 'Actions',
      emptySheet: 'No entries in this worksheet yet',
      emptySheetDesc: 'Use the entry form on the left to add your first task for this worksheet.',
      editEntryTooltip: 'Edit this row entry',
      deleteEntryTooltip: 'Delete this row entry',
      deleteEntryConfirm: 'Are you sure you want to delete this workflow entry?',
      monthHeaderFormat: '{month}',
      infographicTitle: 'How Google Apps Script Handles Multiple Worksheets & Headers',
      infographicStep1Title: '1. Sheet Verification',
      infographicStep1Desc: 'Reads target sheet name. If the tab does not exist in Google Sheets, Apps Script automatically creates it.',
      infographicStep2Title: '2. Month Tracking',
      infographicStep2Desc: 'Checks the previous entry in this specific sheet to identify if a new calendar month has started.',
      infographicStep3Title: '3. Headers & Rows',
      infographicStep3Desc: 'Automatically inserts the distinctive blue month banner, followed by column headers and clean data rows.',
    },
    editModal: {
      title: 'Edit Workflow Entry',
      subtitle: 'Modify row details and save updates to your worksheet',
      saveChanges: 'Save Changes',
      discardChanges: 'Cancel',
      successNotice: 'Entry successfully updated!',
      changeSignaturePrompt: 'Click to draw a new signature, or leave existing',
    },
    statsModal: {
      title: 'Workflow Analytics & Hours Report',
      subtitle: 'Comprehensive performance breakdown across worksheets and time ranges',
      rangeToday: 'Today',
      rangeWeek: 'This Week',
      rangeMonth: 'This Month',
      range6Months: 'Past 6 Months',
      range1Year: 'Past 1 Year',
      rangeCustom: 'Custom Range',
      filterSheetLabel: 'Filter Worksheet:',
      metricTotalHours: 'Total Logged Hours',
      metricTotalHoursDesc: 'Work hours completed across filtered period',
      metricAvgHours: 'Average Hours / Day',
      metricAvgHoursDesc: 'Daily average output based on active work days',
      metricCompletedTasks: 'Total Entries Logged',
      metricCompletedTasksDesc: 'Total work log submissions in range',
      metricDaysWorked: 'Days Active',
      metricDaysWorkedDesc: 'Individual days with logged activity',
      recentTableTitle: 'Filtered Activity Breakdown',
      noDataInRange: 'No recorded entries found for the selected time range and worksheet filter.',
    },
    settingsModal: {
      title: 'System Settings & Integration',
      subtitle: 'Manage Google Apps Script Web App URL and local dataset',
      webAppUrlLabel: 'Google Apps Script Web App URL',
      webAppUrlPlaceholder: 'https://script.google.com/macros/s/.../exec',
      saveUrlBtn: 'Save Web App URL',
      urlSavedToast: 'Web App URL successfully saved!',
      instructionsTitle: 'Setup Instructions:',
      instructionsDesc: 'Deploy your Google Apps Script as a Web App (Execute as: Me, Who has access: Anyone), then paste the deployment URL above.',
      dangerZoneTitle: 'Demo Data Management',
      resetDemoBtn: 'Reset Demo Data to Initial Default',
      resetDemoConfirm: 'Reset all records and worksheets back to initial default demo data?',
    },
    appsScriptModal: {
      title: 'Google Apps Script Integration Code',
      subtitle: 'Paste this code into Extensions > Apps Script in your Google Spreadsheet',
      copyCodeBtn: 'Copy Apps Script Code',
      codeCopiedToast: 'Apps Script code copied to clipboard!',
      step1Title: 'Step 1: Open Apps Script',
      step1Desc: 'Open your Google Spreadsheet, click Extensions > Apps Script.',
      step2Title: 'Step 2: Paste & Save',
      step2Desc: 'Replace the default code with this snippet and click the disk icon to save.',
      step3Title: 'Step 3: Deploy as Web App',
      step3Desc: 'Click Deploy > New deployment. Select "Web app", execute as "Me", set access to "Anyone", and copy the Web App URL.',
    },
    footer: {
      appName: 'Dynamic Workflow Automation App',
      techStack: 'React 19 • Multiple Worksheets • Bilingual (English & বাংলা) • Dark/Light Mode • Google Sheets DB',
    },
  },
  bn: {
    common: {
      appName: 'ডায়নামিক ওয়ার্কফ্লো অ্যাপ',
      appSubtitle: 'অটোমেটেড মান্থ হেডার • ভয়েস ইনপুট • মাল্টিপল শিট',
      sheetsDbBadge: 'Sheets DB',
      save: 'সংরক্ষণ',
      cancel: 'বাতিল',
      close: 'বন্ধ করুন',
      edit: 'এডিট',
      delete: 'মুছুন',
      actions: 'অ্যাকশন',
      required: 'আবশ্যক',
      loading: 'লোড হচ্ছে...',
      success: 'সফল হয়েছে',
      error: 'ত্রুটি',
      today: 'আজ',
      hoursShort: 'ঘণ্টা',
      tasksDoneShort: 'সম্পন্ন',
      sheet: 'শিট',
      allSheets: 'সকল ওয়ার্কশিট',
      activeSheet: 'সক্রিয় শিট',
    },
    header: {
      activeSheetTitle: 'বর্তমান সক্রিয় ওয়ার্কশিট',
      statsBtn: 'স্ট্যাটিস্টিক্স',
      statsTitle: 'সকল স্ট্যাটিস্টিক্স এক নজরে দেখুন',
      scriptConnected: 'Apps Script সংযুক্ত',
      previewMode: 'লাইভ প্রিভিউ মোড',
      appsScriptBtn: 'Apps Script',
      settingsBtn: 'সেটিংস ও Web App URL',
      themeToggleLight: 'লাইট মোডে পরিবর্তন করুন',
      themeToggleDark: 'ডার্ক মোডে পরিবর্তন করুন',
      accentPalette: 'অ্যাকসেন্ট কালার থিম পরিবর্তন',
      languageSelect: 'ভাষা নির্বাচন করুন',
    },
    hero: {
      badge: 'মাল্টিপল গুগল শিট ডেটাবেস সিস্টেম',
      title: 'ডায়নামিক ওয়ার্কফ্লো ও মাল্টিপল ওয়ার্কশিট অটোমেশন',
      subtitle:
        'ডিফল্ট "Home Works" ছাড়াও যতখুশি নতুন ওয়ার্কশিট খুলুন। নতুন মাস এলে স্বয়ংক্রিয়ভাবে সংশ্লিষ্ট শিটে নীল হেডার ও কলাম তৈরি হয়ে ডেটা সংরক্ষিত হবে।',
      statsBtn: 'স্ট্যাটিস্টিক্স ড্যাশবোর্ড',
      scriptBtn: 'Apps Script কোড',
    },
    form: {
      title: 'প্রতিদিনের কাজের এন্ট্রি ফর্ম',
      targetSheetLabel: 'টার্গেট ওয়ার্কশিট',
      addSheetPlaceholder: 'নতুন শিটের নাম (যেমন: Office, Study)...',
      addSheetBtn: 'শিট যুক্ত করুন',
      dateLabel: 'কাজের তারিখ',
      datePlaceholder: 'YYYY-MM-DD',
      workHoursLabel: 'মোট কাজের সময় (ঘণ্টা)',
      workHoursPlaceholder: 'যেমন: ৮',
      workHoursHelper: 'সারাদিনে মোট কাজের সময়',
      dueHoursLabel: 'বাকি সময় (ঘণ্টা)',
      dueHoursPlaceholder: 'যেমন: ১.৫',
      dueHoursHelper: 'যদি কোনো কাজ অসমাপ্ত বা বাকি থাকে',
      work1Label: 'Work 1 (মূল কাজ)',
      work1Placeholder: 'সকালের বা প্রথম কাজের বিবরণ দিন...',
      work2Label: 'Work 2 (দ্বিতীয় কাজ)',
      work2Placeholder: 'দ্বিতীয় কাজের বিবরণ দিন (ঐচ্ছিক)...',
      work3Label: 'Work 3 (তৃতীয় কাজ)',
      work3Placeholder: 'তৃতীয় কাজের বিবরণ দিন (ঐচ্ছিক)...',
      work4Label: 'Work 4 (চতুর্থ কাজ)',
      work4Placeholder: 'চতুর্থ বা অতিরিক্ত কাজের বিবরণ দিন (ঐচ্ছিক)...',
      voiceTooltip: 'মাইকে ক্লিক করে বাংলায় মুখে বলুন',
      voiceListening: 'শুনছি... পরিষ্কারভাবে কথা বলুন',
      signatureLabel: 'ডিজিটাল স্বাক্ষর',
      clearSignature: 'স্বাক্ষর মুছুন',
      savedSignatureNotice: 'পরবর্তী এন্ট্রির জন্য স্বাক্ষর স্বয়ংক্রিয় সেভ থাকবে',
      submitBtn: 'গুগল শিটে সেভ করুন',
      submittingBtn: 'সংরক্ষণ করা হচ্ছে...',
      submitSuccess: 'এন্ট্রি সফলভাবে সম্পন্ন ও সংরক্ষিত হয়েছে!',
      submitError: 'সংরক্ষণ ব্যর্থ হয়েছে। ইন্টারনেট সংযোগ বা URL পরীক্ষা করুন।',
      fillRequiredAlert: 'দয়া করে Work 1 পূরণ করুন।',
      tipsTitle: 'ওয়ার্কফ্লো টিপস ও সুবিধাসমূহ',
      tip1Title: 'মাল্টিপল ওয়ার্কশিট',
      tip1Desc: '"Home Works" ছাড়াও অফিস বা অন্যান্য কাজের জন্য যতখুশি নতুন শিট ট্যাব খুলতে পারেন।',
      tip2Title: 'ভয়েস টাইপিং',
      tip2Desc: 'Work ফিল্ডের মাইক আইকনে ক্লিক করে সরাসরি বাংলায় কথা বলুন, তাৎক্ষণিক লেখা হয়ে যাবে।',
      tip3Title: 'স্বাক্ষর স্বয়ংক্রিয় সেভ',
      tip3Desc: 'একবার ডিজিটাল সাইন করলে তা পরবর্তীতে প্রতিটি সাবমিটে স্বয়ংক্রিয়ভাবে সংরক্ষিত থাকবে।',
    },
    preview: {
      title: 'গুগল শিট প্রিভিউ ও অটোমেশন',
      subtitle: 'আপনার গুগল স্প্রেডশিটের সাথে হুবহু সামঞ্জস্যপূর্ণ লাইভ ডেটা ভিউ',
      totalRecords: 'মোট এন্ট্রি',
      addSheetBtn: 'নতুন শিট',
      newSheetInputPlaceholder: 'শিটের নাম...',
      deleteSheetBtn: 'শিট মুছুন',
      deleteSheetConfirm: 'আপনি কি নিশ্চিত যে "{sheet}" শিট এবং এর সমস্ত এন্ট্রি মুছে ফেলতে চান?',
      minSheetAlert: 'কমপক্ষে একটি ওয়ার্কশিট থাকা আবশ্যক।',
      exportCsv: 'CSV ডাউনলোড',
      clearData: 'শিট খালি করুন',
      clearDataConfirm: 'আপনি কি "{sheet}" শিটের সব এন্ট্রি মুছে ফেলতে চান?',
      thDate: 'তারিখ',
      thWork1: 'Work 1',
      thWork2: 'Work 2',
      thWork3: 'Work 3',
      thWork4: 'Work 4',
      thWorkHours: 'কাজের ঘণ্টা',
      thDueHours: 'বাকি ঘণ্টা',
      thSignature: 'স্বাক্ষর',
      thActions: 'অ্যাকশন',
      emptySheet: 'এই ওয়ার্কশিটে এখনও কোনো এন্ট্রি নেই',
      emptySheetDesc: 'বাম পাশের ফর্ম ব্যবহার করে এই শিটের প্রথম কাজের এন্ট্রি যুক্ত করুন।',
      editEntryTooltip: 'এই এন্ট্রিটি এডিট করুন',
      deleteEntryTooltip: 'এই এন্ট্রিটি মুছে ফেলুন',
      deleteEntryConfirm: 'আপনি কি নিশ্চিত যে এই এন্ট্রিটি মুছে ফেলতে চান?',
      monthHeaderFormat: '{month}',
      infographicTitle: 'মাল্টিপল ওয়ার্কশিট ও মান্থ হেডার কীভাবে কাজ করে?',
      infographicStep1Title: '১. শিটের নাম যাচাই',
      infographicStep1Desc: 'রিকোয়েস্ট থেকে শিটের নাম নেয়। শিট না থাকলে Google Apps Script স্বয়ংক্রিয়ভাবে নতুন ট্যাব তৈরি করে।',
      infographicStep2Title: '২. মাস তুলনা করা',
      infographicStep2Desc: 'প্রতিটি শিটের জন্য পৃথকভাবে শেষ এন্ট্রির মাস পরীক্ষা করে নতুন মাস শনাক্ত করে।',
      infographicStep3Title: '৩. হেডার ও ডেটা যুক্ত',
      infographicStep3Desc: 'প্রথমে মাসের নীল হেডার, এরপর কলাম হেডার এবং শেষে সুবিন্যস্তভাবে কাজের ডেটা যুক্ত করে।',
    },
    editModal: {
      title: 'ওয়ার্কফ্লো এন্ট্রি এডিট',
      subtitle: 'প্রয়োজনীয় তথ্য সংশোধন করে ওয়ার্কশিটে সংরক্ষণ করুন',
      saveChanges: 'পরিবর্তন সংরক্ষণ করুন',
      discardChanges: 'বাতিল',
      successNotice: 'এন্ট্রি সফলভাবে আপডেট করা হয়েছে!',
      changeSignaturePrompt: 'নতুন স্বাক্ষর দিতে ক্লিক করুন, নতুবা বর্তমানটি থাকবে',
    },
    statsModal: {
      title: 'ওয়ার্কফ্লো অ্যানালিটিক্স ও সময় বিবরণী',
      subtitle: 'বিভিন্ন সময় ও ওয়ার্কশিট অনুযায়ী বিস্তারিত কাজের ঘণ্টার বিশ্লেষণ',
      rangeToday: 'আজকের দিন',
      rangeWeek: 'চলতি সপ্তাহ',
      rangeMonth: 'চলতি মাস',
      range6Months: 'বিগত ৬ মাস',
      range1Year: 'বিগত ১ বছর',
      rangeCustom: 'কাস্টম রেঞ্জ',
      filterSheetLabel: 'ওয়ার্কশিট ফিল্টার:',
      metricTotalHours: 'মোট কাজের সময়',
      metricTotalHoursDesc: 'নির্দিষ্ট সময়ে সম্পন্ন কাজের ঘণ্টা',
      metricAvgHours: 'দৈনিক গড় সময়',
      metricAvgHoursDesc: 'সক্রিয় দিনগুলোতে কাজের গড় সময়',
      metricCompletedTasks: 'মোট এন্ট্রি রেকর্ড',
      metricCompletedTasksDesc: 'নির্বাচিত সময়ে মোট লগকৃত এন্ট্রি',
      metricDaysWorked: 'মোট কাজের দিন',
      metricDaysWorkedDesc: 'যেই দিনগুলোতে কাজ লগ করা হয়েছে',
      recentTableTitle: 'ফিল্টারকৃত কার্যক্রমের বিস্তারিত তালিকা',
      noDataInRange: 'নির্বাচিত ফিল্টার ও সময়সীমার মধ্যে কোনো ডেটা পাওয়া যায়নি।',
    },
    settingsModal: {
      title: 'সিস্টেম সেটিংস ও ইন্টিগ্রেশন',
      subtitle: 'Google Apps Script Web App URL কনফিগারেশন ও ডেটাসেট পরিচালনা',
      webAppUrlLabel: 'Google Apps Script Web App URL',
      webAppUrlPlaceholder: 'https://script.google.com/macros/s/.../exec',
      saveUrlBtn: 'Web App URL সংরক্ষণ করুন',
      urlSavedToast: 'Web App URL সফলভাবে সংরক্ষণ করা হয়েছে!',
      instructionsTitle: 'সেটআপ নির্দেশিকা:',
      instructionsDesc: 'Google Spreadsheet-এ Apps Script ডিপ্লয় করে (Who has access: Anyone) প্রাপ্ত URL এখানে পেস্ট করুন।',
      dangerZoneTitle: 'ডেমো ডেটা পরিচালনা',
      resetDemoBtn: 'প্রাথমিক ডেমো ডেটায় রিসেট করুন',
      resetDemoConfirm: 'আপনি কি সমস্ত শিট ও ডেটা প্রাথমিক ডেমো অবস্থায় ফিরিয়ে নিতে চান?',
    },
    appsScriptModal: {
      title: 'Google Apps Script ইন্টিগ্রেশন কোড',
      subtitle: 'আপনার গুগল স্প্রেডশিটের Extensions > Apps Script-এ কোডটি পেস্ট করুন',
      copyCodeBtn: 'Apps Script কোড কপি করুন',
      codeCopiedToast: 'Apps Script কোড ক্লিপবোর্ডে কপি হয়েছে!',
      step1Title: 'ধাপ ১: Apps Script খুলুন',
      step1Desc: 'গুগল শিট ওপেন করে মেনু থেকে Extensions > Apps Script ক্লিক করুন।',
      step2Title: 'ধাপ ২: পেস্ট ও সেভ করুন',
      step2Desc: 'আগের কোড মুছে এই কোডটি পেস্ট করুন এবং সেভ বাটনে ক্লিক করুন।',
      step3Title: 'ধাপ ৩: ডিপ্লয় করুন',
      step3Desc: 'Deploy > New deployment থেকে Web app হিসেবে ডিপ্লয় করুন (Execute as: Me, Access: Anyone)।',
    },
    footer: {
      appName: 'ডায়নামিক ওয়ার্কফ্লো অটোমেশন অ্যাপ',
      techStack: 'React 19 • Multiple Worksheets • দ্বিভাষিক (English ও বাংলা) • Dark/Light Mode • Google Sheets DB',
    },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANG_STORAGE_KEY = 'workflow_app_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Explicitly default to 'en' as requested by user
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY) as Language | null;
      if (saved === 'en' || saved === 'bn') return saved;
    } catch {
      // ignore
    }
    return 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, language);
    } catch {
      // ignore
    }
  }, [language]);

  const t = TRANSLATIONS[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
