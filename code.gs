// ==========================================
// BENGAL DATA DEN - COMPLETE BACKEND (FIXED)
// Version 2.1 - Complete with ALL functions
// ==========================================

// Serve HTML via a TEMPLATE so <?!= include('...') ?> works
function doGet(e) {
  // Check if test page is requested
  if (e && e.parameter && e.parameter.page === 'test') {
    return HtmlService.createHtmlOutputFromFile('test')
      .setTitle('System Test')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  // Check if debug page is requested  
  if (e && e.parameter && e.parameter.page === 'debug') {
    return HtmlService.createHtmlOutputFromFile('debug')
      .setTitle('Debug Console')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  // Otherwise show normal index page
  const t = HtmlService.createTemplateFromFile('index');
  return t.evaluate()
    .setTitle('Bengal Data Den')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Allow HTML files to include other project files
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Initialize all sheets with optimization
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Main data sheet
  if (!ss.getSheetByName('CFAData')) {
    const sheet = ss.insertSheet('CFAData');
    sheet.getRange(1, 1, 1, 8).setValues([['Teacher', 'Grade', 'CFA', 'Student Name', 'Score', 'Performance Band', 'Date', 'Points Possible']]);
    sheet.setFrozenRows(1);
  }
  
  // Roster sheet
  if (!ss.getSheetByName('Rosters')) {
    const sheet = ss.insertSheet('Rosters');
    sheet.getRange(1, 1, 1, 5).setValues([['Student ID', 'Student Name', 'Grade', 'Teacher', 'EL Status']]);
    sheet.setFrozenRows(1);
  }
  
  // CFA list
  if (!ss.getSheetByName('CFAList')) {
    const sheet = ss.insertSheet('CFAList');
    sheet.getRange(1, 1, 1, 3).setValues([['CFA Name', 'Grade', 'Subject']]);
    sheet.setFrozenRows(1);
  }
  
  // Item Analysis for question-level detail
  if (!ss.getSheetByName('ItemAnalysis')) {
    const sheet = ss.insertSheet('ItemAnalysis');
    sheet.getRange(1, 1, 1, 11).setValues([[
      'Teacher', 'Grade', 'CFA', 'Student Name', 'Date', 
      'Question', 'Student Answer', 'Correct Answer', 
      'Is Correct', 'Standard', 'Points'
    ]]);
    sheet.setFrozenRows(1);
  }
  
  // Question Bank
  if (!ss.getSheetByName('QuestionBank')) {
    const sheet = ss.insertSheet('QuestionBank');
    sheet.getRange(1, 1, 1, 6).setValues([[
      'CFA', 'Question Number', 'Correct Answer', 
      'Standard', 'Difficulty', 'Points Possible'
    ]]);
    sheet.setFrozenRows(1);
  }
  
  // Usage log for monitoring
  if (!ss.getSheetByName('UsageLog')) {
    const sheet = ss.insertSheet('UsageLog');
    sheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'User', 'Action', 'Details']]);
    sheet.setFrozenRows(1);
  }
  
  return true;
}

// Get all grades
function getGrades() {
  return ['TK', 'K', '1', '2', '3', '4', '5', '6', '7', '8'];
}

// Get all teachers with caching
function getAllTeachers() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('allTeachers');
  if (cached) return JSON.parse(cached);
  
  const allTeachers = [
    'Mrs. DeMoss', 'Mrs. Olvera', 'Ms. Peña', 'Mrs. Javaux',
    'Mrs. Hunter', 'Mrs. Lancaster', 'Mrs. Norvell', 'Mrs. Remick',
    'Mrs. Friedenberg', 'Mrs. Renteria', 'Mrs. Ebiner', 'Mrs. Flores',
    'Ms. Carranza', 'Mrs. Kopper', 'Ms. Young', 'Mrs. Apparito',
    'Mrs. Friesen', 'Mrs. Frias', 'Ms. Gomez', 'Mrs. Ruth',
    'Mr. Mendoza', 'Mrs. Spencer', 'Mrs. Sanchez',
    'Ms. Jimenez', 'Mrs. Alvarez', 'Mr. Ramirez',
    'Mrs. Reagan', 'Mrs. Pena'
  ].sort();
  
  cache.put('allTeachers', JSON.stringify(allTeachers), 3600);
  return allTeachers;
}

// Get teachers by grade
function getTeachersByGrade(grade) {
  const map = {
    'TK': ['Mrs. DeMoss', 'Mrs. Olvera'],
    'K': ['Mrs. DeMoss', 'Mrs. Olvera', 'Ms. Peña', 'Mrs. Javaux', 'Mrs. Hunter', 'Mrs. Lancaster', 'Mrs. Norvell', 'Mrs. Remick'],
    '1': ['Mrs. Friedenberg', 'Mrs. Renteria', 'Mrs. Hunter', 'Mrs. Lancaster', 'Mrs. Norvell', 'Mrs. Remick'],
    '2': ['Mrs. Ebiner', 'Mrs. Flores', 'Mrs. Hunter', 'Mrs. Lancaster', 'Mrs. Norvell', 'Mrs. Remick'],
    '3': ['Ms. Carranza', 'Mrs. Kopper', 'Ms. Young', 'Mrs. Hunter', 'Mrs. Lancaster', 'Mrs. Norvell', 'Mrs. Remick'],
    '4': ['Mrs. Apparito', 'Mrs. Friesen', 'Mrs. Hunter', 'Mrs. Lancaster', 'Mrs. Norvell', 'Mrs. Remick'],
    '5': ['Mrs. Frias', 'Ms. Gomez', 'Mrs. Ruth', 'Mrs. Hunter', 'Mrs. Lancaster', 'Mrs. Norvell', 'Mrs. Remick'],
    '6': ['Mr. Mendoza', 'Mrs. Spencer', 'Mrs. Sanchez', 'Mrs. Lancaster', 'Mrs. Norvell', 'Mrs. Remick'],
    '7': ['Ms. Jimenez', 'Mrs. Alvarez', 'Mr. Ramirez'],
    '8': ['Mrs. Reagan', 'Mrs. Pena']
  };
  return map[grade] || [];
}

// Get CFAs with caching
function getCFAs(grade) {
  initializeSheets();
  
  const cache = CacheService.getScriptCache();
  const cacheKey = 'cfas_' + (grade || 'all');
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAList');
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const data = sheet.getDataRange().getValues();
  const cfas = [];
  
  for (let i = 1; i < data.length; i++) {
    if (!grade || String(data[i][1]) === String(grade)) {
      cfas.push({
        name: data[i][0],
        grade: data[i][1],
        subject: data[i][2]
      });
    }
  }
  
  cache.put(cacheKey, JSON.stringify(cfas), 300);
  return cfas;
}

// Create CFA
function createCFA(cfaName, grade, subject) {
  initializeSheets();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAList');
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 3).setValues([[cfaName, grade, subject]]);
  
  const cache = CacheService.getScriptCache();
  cache.remove('cfas_' + grade);
  cache.remove('cfas_all');
  
  logUsage('Create CFA', Session.getActiveUser().getEmail(), cfaName);
  return { success: true };
}

// Get students from roster with optimization
function getStudentsFromRoster(grade, teacher) {
  initializeSheets();
  
  const cache = CacheService.getScriptCache();
  const cacheKey = `roster_${grade}_${teacher}`;
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rosters');
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const data = sheet.getDataRange().getValues();
  const students = [];
  
  for (let i = 1; i < data.length; i++) {
    if ((!grade || String(data[i][2]) === String(grade)) && 
        (!teacher || data[i][3] === teacher)) {
      students.push({
        id: data[i][0],
        name: data[i][1],
        grade: data[i][2],
        teacher: data[i][3],
        elStatus: data[i][4],
        el: data[i][4] === 'Yes'
      });
    }
  }
  
  cache.put(cacheKey, JSON.stringify(students), 600);
  return students;
}

// Upload roster (CSV) with batch processing
function uploadRoster(csvContent, grade, teacher) {
  initializeSheets();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rosters');
  
  const rows = csvContent.split('\n');
  const dataRows = [];
  const batchSize = 50;
  
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length >= 2 && values[1]) {
      dataRows.push([
        values[0] || '',  // ID
        values[1],        // Name
        grade,
        teacher,
        'No'              // Default EL status
      ]);
    }
    
    if (dataRows.length >= batchSize) {
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, dataRows.length, 5).setValues(dataRows);
      dataRows.length = 0;
      Utilities.sleep(100);
    }
  }
  
  if (dataRows.length > 0) {
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, dataRows.length, 5).setValues(dataRows);
  }
  
  CacheService.getScriptCache().remove(`roster_${grade}_${teacher}`);
  
  logUsage('Upload Roster', Session.getActiveUser().getEmail(), `${grade} - ${teacher}`);
  return { success: true, message: `Added ${rows.length - 1} students` };
}

// Upload roster (Excel) with optimization
function uploadRosterExcel(base64Data, grade, teacher) {
  initializeSheets();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rosters');
  
  const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const tempFile = DriveApp.createFile(blob);
  tempFile.setName('temp_roster');
  
  const tempSS = SpreadsheetApp.openById(tempFile.getId());
  const tempSheet = tempSS.getSheets()[0];
  const data = tempSheet.getDataRange().getValues();
  
  const dataRows = [];
  const batchSize = 50;
  let startRow = 0;
  
  // Find header row
  for (let i = 0; i < Math.min(5, data.length); i++) {
    if (data[i][0] && String(data[i][0]).toLowerCase().includes('name')) {
      startRow = i + 1;
      break;
    }
  }
  
  for (let i = startRow; i < data.length; i++) {
    if (data[i][0] && String(data[i][0]).trim() !== '') {
      dataRows.push([
        String(data[i][1] || '').trim(),  // ID
        String(data[i][0]).trim(),        // Name
        grade,
        teacher,
        'No'
      ]);
      
      if (dataRows.length >= batchSize) {
        const lastRow = sheet.getLastRow();
        sheet.getRange(lastRow + 1, 1, dataRows.length, 5).setValues(dataRows);
        dataRows.length = 0;
        Utilities.sleep(100);
      }
    }
  }
  
  if (dataRows.length > 0) {
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, dataRows.length, 5).setValues(dataRows);
  }
  
  DriveApp.getFileById(tempFile.getId()).setTrashed(true);
  
  CacheService.getScriptCache().remove(`roster_${grade}_${teacher}`);
  
  logUsage('Upload Excel Roster', Session.getActiveUser().getEmail(), `${grade} - ${teacher}`);
  return { success: true, message: `Added ${dataRows.length} students` };
}

// Add single student
function addStudentToRoster(studentData) {
  initializeSheets();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rosters');
  const lastRow = sheet.getLastRow();
  
  sheet.getRange(lastRow + 1, 1, 1, 5).setValues([[
    studentData.id,
    studentData.name,
    studentData.grade,
    studentData.teacher,
    studentData.el ? 'Yes' : 'No'
  ]]);
  
  CacheService.getScriptCache().remove(`roster_${studentData.grade}_${studentData.teacher}`);
  
  return { success: true };
}

// Update EL status
function updateStudentEL(studentId, isEL) {
  initializeSheets();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rosters');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(studentId)) {
      // Capture grade/teacher to invalidate the exact cache key
      const grade = data[i][2];
      const teacher = data[i][3];
      
      sheet.getRange(i + 1, 5).setValue(isEL ? 'Yes' : 'No');
      
      // Invalidate exact roster cache key for this class
      CacheService.getScriptCache().remove(`roster_${grade}_${teacher}`);
      
      return { success: true };
    }
  }
  
  return { success: false, message: 'Student not found' };
}

// Get existing CFA scores with caching
function getCFAScores(grade, teacher, cfaName) {
  initializeSheets();
  
  const cache = CacheService.getScriptCache();
  const cacheKey = `scores_${grade}_${teacher}_${cfaName}`;
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAData');
  if (!sheet || sheet.getLastRow() <= 1) return {};
  
  const data = sheet.getDataRange().getValues();
  const scores = {};
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(grade) && 
        data[i][0] === teacher && 
        data[i][2] === cfaName) {
      scores[data[i][3]] = {
        score: data[i][4],
        rowNumber: i + 1
      };
    }
  }
  
  cache.put(cacheKey, JSON.stringify(scores), 300);
  return scores;
}

// Save batch scores with optimization and locking - IMPROVED VERSION
function saveBatchScores(scoresData) {
  initializeSheets();
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAData');
    const rosterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rosters');
    const date = new Date().toLocaleDateString();
    
    // Create ID to Name lookup
    const rosterData = rosterSheet.getDataRange().getValues();
    const idToName = {};
    for (let i = 1; i < rosterData.length; i++) {
      const id = String(rosterData[i][0]).trim();
      const name = String(rosterData[i][1]).trim();
      if (id && name) {
        idToName[id] = name;
      }
    }
    
    // Get existing scores
    const existing = getCFAScores(scoresData.grade, scoresData.teacher, scoresData.cfa);
    
    const newRows = [];
    const updates = [];
    
    scoresData.scores.forEach(score => {
      // CRITICAL FIX: Check if studentName is actually an ID
      let studentName = score.studentName;
      
      // If it's a number or looks like an ID, convert it to name
      if (/^\d+$/.test(String(studentName).trim())) {
        const nameFromId = idToName[String(studentName).trim()];
        if (nameFromId) {
          studentName = nameFromId;
          console.log(`Converting ID ${score.studentName} to name ${studentName}`);
        } else {
          console.log(`Warning: No name found for ID ${score.studentName}`);
        }
      }
      
      const percentage = (score.score / scoresData.pointsPossible) * 100;
      const band = getPerformanceBand(percentage);
      
      if (existing[studentName]) {
        updates.push({
          row: existing[studentName].rowNumber,
          score: score.score,
          band: band,
          date: date,
          points: scoresData.pointsPossible
        });
      } else {
        newRows.push([
          scoresData.teacher,
          scoresData.grade,
          scoresData.cfa,
          studentName, // Now this will always be a name, not an ID
          score.score,
          band,
          date,
          scoresData.pointsPossible
        ]);
      }
    });
    
    // Apply updates
    updates.forEach(u => {
      sheet.getRange(u.row, 5, 1, 4).setValues([[u.score, u.band, u.date, u.points]]);
    });
    
    // Add new rows
    if (newRows.length > 0) {
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, newRows.length, 8).setValues(newRows);
    }
    
    // Clear cache
    CacheService.getScriptCache().remove(`scores_${scoresData.grade}_${scoresData.teacher}_${scoresData.cfa}`);
    
    logUsage('Save Scores', Session.getActiveUser().getEmail(), 
             `${scoresData.cfa}: ${newRows.length + updates.length} scores`);
    
    return { success: true, message: `Saved ${newRows.length} new, updated ${updates.length} existing` };
    
  } catch (e) {
    return { success: false, message: 'Error: ' + e.toString() };
  } finally {
    lock.releaseLock();
  }
}

// Get performance band
function getPerformanceBand(percentage) {
  if (percentage >= 82) return 'Standard Exceeded';
  if (percentage >= 64) return 'Standard Met';
  if (percentage >= 49) return 'Standard Nearly Met';
  return 'Standard Not Met';
}

// Original cached version (kept for backward compatibility)
function getStudentData(filters) {
  initializeSheets();
  
  const cache = CacheService.getScriptCache();
  const cacheKey = 'data_' + JSON.stringify(filters);
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAData');
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const data = sheet.getDataRange().getValues();
  let result = [];
  
  const batchSize = 100;
  for (let i = 1; i < data.length; i++) {
    let include = true;
    
    if (filters.teacher && data[i][0] !== filters.teacher) include = false;
    if (filters.grade && String(data[i][1]) !== String(filters.grade)) include = false;
    if (filters.cfa && data[i][2] !== filters.cfa) include = false;
    if (filters.performanceBand && data[i][5] !== filters.performanceBand) include = false;
    
    if (include) {
      result.push({
        teacher: data[i][0],
        grade: data[i][1],
        cfa: data[i][2],
        studentName: data[i][3],
        score: data[i][4],
        performanceBand: data[i][5],
        date: data[i][6],
        pointsPossible: data[i][7] || 100,
        percentage: (data[i][4] / (data[i][7] || 100)) * 100
      });
    }
    
    if (i % batchSize === 0) {
      Utilities.sleep(10);
    }
  }
  
  // EL filter if needed
  if (filters.elOnly === 'true') {
    const rosterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rosters');
    if (rosterSheet && rosterSheet.getLastRow() > 1) {
      const rosterData = rosterSheet.getDataRange().getValues();
      const elStudents = new Set();
      
      for (let i = 1; i < rosterData.length; i++) {
        if (rosterData[i][4] === 'Yes') {
          elStudents.add(rosterData[i][1]);
        }
      }
      
      result = result.filter(r => elStudents.has(r.studentName));
    }
  }
  
  cache.put(cacheKey, JSON.stringify(result), 120);
  return result;
}

// Get student data fresh (no cache) - debug capable
function getStudentDataFresh(filters) {
  // Check if debug mode is enabled
  if (isDebugMode()) {
    return getStudentDataFreshDebug(filters);
  }
  
  try {
    initializeSheets();
    
    // Force flush any pending writes
    SpreadsheetApp.flush();
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAData');
    if (!sheet || sheet.getLastRow() <= 1) {
      console.log('No data in CFAData sheet');
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    console.log('CFAData has ' + data.length + ' rows');
    
    let result = [];
    
    const batchSize = 100;
    for (let i = 1; i < data.length; i++) {
      // Skip rows without teacher or student name
      if (!data[i][0] || !data[i][3]) continue;
      
      let include = true;
      
      // Only apply filters if they have actual values (not empty strings)
      if (filters.teacher && filters.teacher !== '' && data[i][0] !== filters.teacher) {
        include = false;
      }
      if (filters.grade && filters.grade !== '' && String(data[i][1]) !== String(filters.grade)) {
        include = false;
      }
      if (filters.cfa && filters.cfa !== '' && data[i][2] !== filters.cfa) {
        include = false;
      }
      if (filters.performanceBand && filters.performanceBand !== '' && data[i][5] !== filters.performanceBand) {
        include = false;
      }
      
      if (include) {
        const pointsPossible = parseFloat(data[i][7]) || 10;
        const score = parseFloat(data[i][4]) || 0;
        const percentage = (score / pointsPossible) * 100;
        
        result.push({
          teacher: data[i][0],
          grade: String(data[i][1]),
          cfa: data[i][2],
          studentName: data[i][3],
          score: score,
          performanceBand: data[i][5] || getPerformanceBand(percentage),
          date: data[i][6],
          pointsPossible: pointsPossible,
          percentage: percentage
        });
      }
      
      // Prevent timeout on large datasets
      if (i % batchSize === 0) {
        Utilities.sleep(10);
      }
    }
    
    // EL filter if needed
    if (filters.elOnly === 'true' || filters.elOnly === true) {
      const rosterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rosters');
      if (rosterSheet && rosterSheet.getLastRow() > 1) {
        const rosterData = rosterSheet.getDataRange().getValues();
        const elStudents = new Set();
        
        for (let i = 1; i < rosterData.length; i++) {
          if (rosterData[i][4] === 'Yes') {
            elStudents.add(rosterData[i][1]);
          }
        }
        
        result = result.filter(r => elStudents.has(r.studentName));
      }
    }
    
    console.log('Fresh data retrieved: ' + result.length + ' records');
    return result;
    
  } catch (error) {
    console.error('Error in getStudentDataFresh:', error);
    throw error;
  }
}

// ==========================================
// CRITICAL FIX: SIMPLIFIED VISUALIZATION FUNCTION
// This is the main function for the Analytics Center
// ==========================================
function getStudentDataForVisualization(filters) {
  // FIX: Safety check - if no filters passed, use empty object
  if (!filters) filters = {};
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAData');
    if (!sheet || sheet.getLastRow() <= 1) {
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    let result = [];
    
    // Process each row (skip header)
    for (let i = 1; i < data.length; i++) {
      // Skip if no teacher or student name
      if (!data[i][0] || !data[i][3]) continue;
      
      // Check filters
      let includeThis = true;
      
      // Only apply filter if it has a real value
      if (filters.teacher && filters.teacher !== '' && filters.teacher !== 'All Teachers') {
        if (data[i][0] !== filters.teacher) includeThis = false;
      }
      
      if (filters.grade && filters.grade !== '' && filters.grade !== 'All Grades') {
        if (String(data[i][1]) !== String(filters.grade)) includeThis = false;
      }
      
      if (filters.cfa && filters.cfa !== '' && filters.cfa !== 'All CFAs' && filters.cfa !== 'All Assessments') {
        if (data[i][2] !== filters.cfa) includeThis = false;
      }
      
      if (filters.performanceBand && filters.performanceBand !== '' && filters.performanceBand !== 'All Bands') {
        if (data[i][5] !== filters.performanceBand) includeThis = false;
      }
      
      // If it passes all filters, add it
      if (includeThis) {
        const points = parseFloat(data[i][7]) || 10;
        const score = parseFloat(data[i][4]) || 0;
        const percent = (score / points) * 100;
        
        result.push({
          teacher: data[i][0],
          grade: String(data[i][1]),
          cfa: data[i][2],
          studentName: data[i][3],
          score: score,
          performanceBand: data[i][5] || getPerformanceBand(percent),
          date: data[i][6],
          pointsPossible: points,
          percentage: percent
        });
      }
    }
    
    console.log('Returning ' + result.length + ' records');
    return result;
    
  } catch (error) {
    console.error('Error in getStudentDataForVisualization:', error);
    return [];
  }
}

// DEBUG VERSION with extensive logging
function getStudentDataFreshDebug(filters) {
  const debugLog = [];
  const startTime = new Date().getTime();
  
  try {
    debugLog.push('=== START DEBUG getStudentDataFresh ===');
    debugLog.push('Timestamp: ' + new Date().toISOString());
    debugLog.push('Filters received: ' + JSON.stringify(filters));
    
    // Validate filters
    if (!filters) {
      debugLog.push('WARNING: No filters object provided, using empty object');
      filters = {};
    }
    
    // Log individual filter values
    debugLog.push('Filter breakdown:');
    debugLog.push('  - teacher: ' + (filters.teacher || 'NONE') + ' (type: ' + typeof filters.teacher + ')');
    debugLog.push('  - grade: ' + (filters.grade || 'NONE') + ' (type: ' + typeof filters.grade + ')');
    debugLog.push('  - cfa: ' + (filters.cfa || 'NONE') + ' (type: ' + typeof filters.cfa + ')');
    debugLog.push('  - performanceBand: ' + (filters.performanceBand || 'NONE'));
    debugLog.push('  - elOnly: ' + (filters.elOnly || 'false') + ' (type: ' + typeof filters.elOnly + ')');
    
    initializeSheets();
    debugLog.push('Sheets initialized');
    
    // Force flush any pending writes
    SpreadsheetApp.flush();
    debugLog.push('Spreadsheet flushed');
    
    // Get the CFAData sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('CFAData');
    
    if (!sheet) {
      debugLog.push('ERROR: CFAData sheet not found!');
      console.error('Debug Log:', debugLog.join('\n'));
      return [];
    }
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    debugLog.push('CFAData sheet found - Rows: ' + lastRow + ', Columns: ' + lastCol);
    
    if (lastRow <= 1) {
      debugLog.push('WARNING: CFAData sheet has no data rows (only header or empty)');
      console.log('Debug Log:', debugLog.join('\n'));
      return [];
    }
    
    // Get data with error handling
    let data;
    try {
      data = sheet.getDataRange().getValues();
      debugLog.push('Data retrieved: ' + data.length + ' total rows (including header)');
    } catch (dataError) {
      debugLog.push('ERROR reading data: ' + dataError.toString());
      console.error('Debug Log:', debugLog.join('\n'));
      throw dataError;
    }
    
    // Log first few data rows for inspection
    debugLog.push('Sample data rows (first 3 after header):');
    for (let i = 1; i <= Math.min(3, data.length - 1); i++) {
      debugLog.push('  Row ' + i + ': [' + 
        'Teacher: "' + data[i][0] + '", ' +
        'Grade: "' + data[i][1] + '", ' +
        'CFA: "' + data[i][2] + '", ' +
        'Student: "' + data[i][3] + '", ' +
        'Score: ' + data[i][4] + ', ' +
        'Band: "' + data[i][5] + '", ' +
        'Date: ' + data[i][6] + ', ' +
        'Points: ' + data[i][7] + ']'
      );
    }
    
    let result = [];
    let skippedRows = 0;
    let includedRows = 0;
    let filterReasons = {
      teacher: 0,
      grade: 0,
      cfa: 0,
      performanceBand: 0,
      emptyData: 0
    };
    
    // Process each row with detailed logging
    const batchSize = 100;
    for (let i = 1; i < data.length; i++) {
      // Check for empty essential fields
      if (!data[i][0] || !data[i][3]) {
        skippedRows++;
        filterReasons.emptyData++;
        if (i <= 5) { // Log first few skips
          debugLog.push('  Skipped row ' + i + ': Missing teacher or student name');
        }
        continue;
      }
      
      let include = true;
      let excludeReason = '';
      
      // Apply filters with detailed tracking
      if (filters.teacher && filters.teacher !== '' && filters.teacher !== 'all') {
        if (data[i][0] !== filters.teacher) {
          include = false;
          excludeReason = 'teacher mismatch (' + data[i][0] + ' != ' + filters.teacher + ')';
          filterReasons.teacher++;
        }
      }
      
      if (include && filters.grade && filters.grade !== '' && filters.grade !== 'all') {
        const rowGrade = String(data[i][1]).trim();
        const filterGrade = String(filters.grade).trim();
        if (rowGrade !== filterGrade) {
          include = false;
          excludeReason = 'grade mismatch (' + rowGrade + ' != ' + filterGrade + ')';
          filterReasons.grade++;
        }
      }
      
      if (include && filters.cfa && filters.cfa !== '' && filters.cfa !== 'all') {
        if (data[i][2] !== filters.cfa) {
          include = false;
          excludeReason = 'CFA mismatch (' + data[i][2] + ' != ' + filters.cfa + ')';
          filterReasons.cfa++;
        }
      }
      
      if (include && filters.performanceBand && filters.performanceBand !== '' && filters.performanceBand !== 'all') {
        if (data[i][5] !== filters.performanceBand) {
          include = false;
          excludeReason = 'band mismatch (' + data[i][5] + ' != ' + filters.performanceBand + ')';
          filterReasons.performanceBand++;
        }
      }
      
      // Log first few exclusions for debugging
      if (!include && skippedRows < 5) {
        debugLog.push('  Excluded row ' + i + ': ' + excludeReason);
      }
      
      if (include) {
        try {
          // Parse numeric values with fallbacks
          const pointsPossible = parseFloat(data[i][7]) || 10;
          const score = parseFloat(data[i][4]) || 0;
          const percentage = pointsPossible > 0 ? (score / pointsPossible) * 100 : 0;
          
          const recordData = {
            teacher: data[i][0],
            grade: String(data[i][1]).trim(),
            cfa: data[i][2],
            studentName: data[i][3],
            score: score,
            performanceBand: data[i][5] || getPerformanceBand(percentage),
            date: data[i][6],
            pointsPossible: pointsPossible,
            percentage: percentage
          };
          
          result.push(recordData);
          includedRows++;
          
          // Log first few included records
          if (includedRows <= 3) {
            debugLog.push('  Included record ' + includedRows + ': ' + JSON.stringify(recordData));
          }
          
        } catch (parseError) {
          debugLog.push('  ERROR parsing row ' + i + ': ' + parseError.toString());
          skippedRows++;
        }
      } else {
        skippedRows++;
      }
      
      // Prevent timeout on large datasets
      if (i % batchSize === 0) {
        Utilities.sleep(10);
        debugLog.push('  Processed ' + i + ' rows...');
      }
    }
    
    debugLog.push('Filter summary:');
    debugLog.push('  - Excluded by teacher filter: ' + filterReasons.teacher);
    debugLog.push('  - Excluded by grade filter: ' + filterReasons.grade);
    debugLog.push('  - Excluded by CFA filter: ' + filterReasons.cfa);
    debugLog.push('  - Excluded by band filter: ' + filterReasons.performanceBand);
    debugLog.push('  - Excluded by empty data: ' + filterReasons.emptyData);
    debugLog.push('  - Total included: ' + includedRows);
    debugLog.push('  - Total skipped: ' + skippedRows);
    
    // EL filter processing with debug
    if (filters.elOnly === 'true' || filters.elOnly === true) {
      debugLog.push('Applying EL filter...');
      const beforeELCount = result.length;
      
      const rosterSheet = ss.getSheetByName('Rosters');
      if (!rosterSheet) {
        debugLog.push('WARNING: Rosters sheet not found, cannot apply EL filter');
      } else if (rosterSheet.getLastRow() <= 1) {
        debugLog.push('WARNING: Rosters sheet is empty, cannot apply EL filter');
      } else {
        try {
          const rosterData = rosterSheet.getDataRange().getValues();
          debugLog.push('Roster data loaded: ' + (rosterData.length - 1) + ' students');
          
          const elStudents = new Set();
          let elCount = 0;
          
          for (let i = 1; i < rosterData.length; i++) {
            if (rosterData[i][4] === 'Yes') {
              elStudents.add(rosterData[i][1]);
              elCount++;
            }
          }
          
          debugLog.push('Found ' + elCount + ' EL students in roster');
          
          result = result.filter(r => {
            const isEL = elStudents.has(r.studentName);
            if (!isEL && result.length <= 10) { // Log first few non-EL exclusions
              debugLog.push('  Non-EL student filtered: ' + r.studentName);
            }
            return isEL;
          });
          
          debugLog.push('After EL filter: ' + result.length + ' records (removed ' + (beforeELCount - result.length) + ')');
          
        } catch (elError) {
          debugLog.push('ERROR applying EL filter: ' + elError.toString());
        }
      }
    }
    
    // Data validation
    debugLog.push('Final data validation:');
    let invalidRecords = 0;
    result.forEach((record, index) => {
      if (!record.teacher || !record.studentName) {
        invalidRecords++;
        if (invalidRecords <= 3) {
          debugLog.push('  Invalid record at index ' + index + ': ' + JSON.stringify(record));
        }
      }
    });
    
    if (invalidRecords > 0) {
      debugLog.push('WARNING: Found ' + invalidRecords + ' invalid records in final result');
    }
    
    const endTime = new Date().getTime();
    const executionTime = endTime - startTime;
    
    debugLog.push('=== END DEBUG ===');
    debugLog.push('Execution time: ' + executionTime + 'ms');
    debugLog.push('Final record count: ' + result.length);
    
    // Output debug log to console
    console.log(debugLog.join('\n'));
    
    // Also save to a debug sheet for persistent logging
    saveDebugLog(debugLog, filters);
    
    return result;
    
  } catch (error) {
    debugLog.push('FATAL ERROR: ' + error.toString());
    debugLog.push('Stack trace: ' + error.stack);
    console.error('Debug Log:', debugLog.join('\n'));
    
    // Save error log
    saveDebugLog(debugLog, filters);
    
    throw error;
  }
}

// Get comparison data
function getComparisonData(filters) {
  const allData = getStudentDataForVisualization(filters);
  const byTeacher = {};
  
  allData.forEach(record => {
    if (!byTeacher[record.teacher]) {
      byTeacher[record.teacher] = [];
    }
    byTeacher[record.teacher].push(record);
  });
  
  const result = {};
  
  filters.teachers.forEach(teacher => {
    const records = byTeacher[teacher] || [];
    
    if (records.length > 0) {
      const scores = records.map(r => r.percentage);
      
      result[teacher] = {
        studentCount: records.length,
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        minScore: Math.min(...scores),
        maxScore: Math.max(...scores),
        performanceBands: {
          'Standard Exceeded': records.filter(r => r.performanceBand === 'Standard Exceeded').length,
          'Standard Met': records.filter(r => r.performanceBand === 'Standard Met').length,
          'Standard Nearly Met': records.filter(r => r.performanceBand === 'Standard Nearly Met').length,
          'Standard Not Met': records.filter(r => r.performanceBand === 'Standard Not Met').length
        }
      };
    } else {
      result[teacher] = {
        studentCount: 0,
        averageScore: 0,
        minScore: 0,
        maxScore: 0,
        performanceBands: {
          'Standard Exceeded': 0,
          'Standard Met': 0,
          'Standard Nearly Met': 0,
          'Standard Not Met': 0
        }
      };
    }
  });
  
  return result;
}

// Export to CSV
function exportToCSV(filters) {
  const data = getStudentDataForVisualization(filters);
  if (data.length === 0) {
    return { success: false, message: 'No data to export' };
  }
  
  const csv = 'Teacher,Grade,CFA,Student,Score,Band,Date,Points,Percentage\n' +
    data.map(r => 
      `${r.teacher},${r.grade},${r.cfa},"${r.studentName}",${r.score},${r.performanceBand},${r.date},${r.pointsPossible},${r.percentage.toFixed(1)}`
    ).join('\n');
  
  return { success: true, data: csv };
}

// Upload assessment matrix (enhanced for Illuminate)
function uploadAssessmentMatrix(base64Data, grade, teacher, cfaName, subject) {
  return uploadIlluminateMatrixDetailed(base64Data, grade, teacher, cfaName, subject);
}

// Process Illuminate matrix with item-level detail
function uploadIlluminateMatrixDetailed(base64Data, grade, teacher, cfaName, subject) {
  try {
    initializeSheets();
    
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const tempFile = DriveApp.createFile(blob);
    tempFile.setName('temp_matrix_' + new Date().getTime());
    
    const tempSS = SpreadsheetApp.openById(tempFile.getId());
    const tempSheet = tempSS.getSheets()[0];
    const data = tempSheet.getDataRange().getValues();
    
    // Find question columns
    let questionRow = -1;
    let firstQuestionCol = 7;
    let questions = [];
    
    for (let i = 0; i < Math.min(10, data.length); i++) {
      for (let j = 5; j < data[i].length; j++) {
        if (data[i][j] === 1 && data[i][j+1] === 2) {
          questionRow = i;
          firstQuestionCol = j;
          
          for (let col = j; col < data[i].length; col++) {
            if (data[i][col] && !isNaN(data[i][col])) {
              questions.push(data[i][col]);
            }
          }
          break;
        }
      }
      if (questionRow !== -1) break;
    }
    
    const cfaSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAData');
    const itemSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ItemAnalysis');
    const date = new Date().toLocaleDateString();
    const pointsPossible = questions.length || 10;
    
    const dataRows = [];
    const itemRows = [];
    const batchSize = 50;
    
    const startRow = questionRow + 4;
    
    for (let i = startRow; i < data.length; i++) {
      const studentName = data[i][1];
      if (!studentName || String(studentName).trim() === '') continue;
      
      let correct = 0;
      let total = 0;
      
      for (let j = 0; j < questions.length; j++) {
        const answer = data[i][firstQuestionCol + j];
        if (answer === 1 || answer === 0) {
          if (answer === 1) correct++;
          total++;
          
          itemRows.push([
            teacher,
            grade,
            cfaName,
            String(studentName).trim(),
            date,
            questions[j],
            answer,
            1,
            answer,
            '',
            1
          ]);
        }
      }
      
      if (total > 0) {
        const score = (correct / total) * pointsPossible;
        const percentage = (score / pointsPossible) * 100;
        
        dataRows.push([
          teacher,
          grade,
          cfaName,
          String(studentName).trim(),
          score,
          getPerformanceBand(percentage),
          date,
          pointsPossible
        ]);
      }
      
      if (dataRows.length >= batchSize) {
        const lastRow = cfaSheet.getLastRow();
        cfaSheet.getRange(lastRow + 1, 1, dataRows.length, 8).setValues(dataRows);
        dataRows.length = 0;
        Utilities.sleep(100);
      }
    }
    
    if (dataRows.length > 0) {
      const lastRow = cfaSheet.getLastRow();
      cfaSheet.getRange(lastRow + 1, 1, dataRows.length, 8).setValues(dataRows);
    }
    
    if (itemRows.length > 0) {
      const lastRow = itemSheet.getLastRow();
      for (let i = 0; i < itemRows.length; i += batchSize) {
        const batch = itemRows.slice(i, Math.min(i + batchSize, itemRows.length));
        itemSheet.getRange(lastRow + i + 1, 1, batch.length, 11).setValues(batch);
        Utilities.sleep(100);
      }
    }
    
    createCFA(cfaName, grade, subject);
    
    DriveApp.getFileById(tempFile.getId()).setTrashed(true);
    
    CacheService.getScriptCache().removeAll(['data_', 'scores_']);
    
    logUsage('Upload Matrix', Session.getActiveUser().getEmail(), 
             `${cfaName}: ${dataRows.length} students`);
    
    return { success: true, message: `Uploaded scores for ${dataRows.length} students with item analysis` };
    
  } catch (error) {
    console.error('Error processing matrix:', error);
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

// Get question analysis
function getQuestionAnalysis(cfa, grade, teacher) {
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = `qa_${cfa}_${grade}_${teacher}`;
    const cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ItemAnalysis');
    if (!sheet || sheet.getLastRow() <= 1) return null;
    
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).getValues();
    const questions = {};
    
    data.forEach(row => {
      if ((!cfa || row[2] === cfa) &&
          (!grade || String(row[1]) === String(grade)) &&
          (!teacher || row[0] === teacher)) {
        
        const qNum = row[5];
        if (!questions[qNum]) {
          questions[qNum] = {
            number: qNum,
            correctAnswer: row[7],
            standard: row[9],
            totalAttempts: 0,
            correctCount: 0
          };
        }
        
        questions[qNum].totalAttempts++;
        if (row[8] === 1) questions[qNum].correctCount++;
      }
    });
    
    const result = {
      cfa: cfa,
      questions: Object.keys(questions).map(qNum => {
        const q = questions[qNum];
        return {
          number: q.number,
          correctAnswer: q.correctAnswer,
          standard: q.standard,
          percentCorrect: (q.correctCount / q.totalAttempts) * 100,
          totalStudents: q.totalAttempts,
          correctCount: q.correctCount
        };
      }).sort((a, b) => a.number - b.number)
    };
    
    cache.put(cacheKey, JSON.stringify(result), 300);
    return result;
    
  } catch (error) {
    console.error('Error getting question analysis:', error);
    return null;
  }
}

// Get student item details
function getStudentItemDetails(studentName, cfa) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ItemAnalysis');
    if (!sheet || sheet.getLastRow() <= 1) return null;
    
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).getValues();
    const itemDetails = [];
    
    data.forEach(row => {
      if (row[3] === studentName && row[2] === cfa) {
        itemDetails.push({
          question: row[5],
          studentAnswer: row[6],
          correctAnswer: row[7],
          score: row[8],
          standard: row[9]
        });
      }
    });
    
    return {
      studentName: studentName,
      cfa: cfa,
      itemDetails: itemDetails.sort((a, b) => a.question - b.question)
    };
    
  } catch (error) {
    console.error('Error getting student item details:', error);
    return null;
  }
}

// Log usage for monitoring
function logUsage(action, user, details) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('UsageLog');
    if (sheet) {
      sheet.appendRow([new Date(), user || 'Unknown', action, details]);
      
      if (sheet.getLastRow() > 1000) {
        sheet.deleteRows(2, 100);
      }
    }
  } catch (e) {
    console.log('Logging error:', e);
  }
}

// Daily backup function
function createDailyBackup() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const backupName = 'Bengal_Backup_' + new Date().toISOString().split('T')[0];
    
    const backup = ss.copy(backupName);
    
    logUsage('Backup Created', 'System', backupName);
    
    return { success: true, message: 'Backup created: ' + backupName };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// Clear all caches
function clearAllCaches() {
  CacheService.getScriptCache().removeAll(['data_', 'scores_', 'roster_', 'cfas_']);
  return { success: true, message: 'All caches cleared' };
}

// Get system statistics
function getSystemStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stats = {};
  
  ['CFAData', 'Rosters', 'ItemAnalysis'].forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      stats[sheetName] = sheet.getLastRow() - 1;
    }
  });
  
  return stats;
}

// ==========================================
// DEBUG HELPER FUNCTIONS
// ==========================================

// Save debug log to a sheet for analysis
function saveDebugLog(debugLog, filters) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let debugSheet = ss.getSheetByName('DebugLog');
    
    if (!debugSheet) {
      debugSheet = ss.insertSheet('DebugLog');
      debugSheet.getRange(1, 1, 1, 3).setValues([['Timestamp', 'Filters', 'Log']]);
      debugSheet.setFrozenRows(1);
    }
    
    const timestamp = new Date().toISOString();
    const filtersStr = JSON.stringify(filters);
    const logStr = debugLog.join('\n');
    
    // Add to sheet
    debugSheet.appendRow([timestamp, filtersStr, logStr]);
    
    // Keep only last 100 entries
    if (debugSheet.getLastRow() > 101) {
      debugSheet.deleteRows(2, 10);
    }
    
  } catch (e) {
    console.error('Could not save debug log:', e);
  }
}

// Enable/disable debug mode
function setDebugMode(enabled) {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('debugMode', enabled ? 'true' : 'false');
  return { success: true, debugMode: enabled };
}

// Check if debug mode is enabled
function isDebugMode() {
  const scriptProperties = PropertiesService.getScriptProperties();
  return scriptProperties.getProperty('debugMode') === 'true';
}

// Test data retrieval functions
function testDataRetrieval() {
  console.log('=== TESTING DATA RETRIEVAL ===');
  
  // Test 1: No filters
  console.log('\nTest 1: No filters');
  const result1 = getStudentDataFreshDebug({});
  console.log('Result count:', result1.length);
  
  // Test 2: Grade filter only
  console.log('\nTest 2: Grade filter (grade 3)');
  const result2 = getStudentDataFreshDebug({ grade: '3' });
  console.log('Result count:', result2.length);
  
  // Test 3: Teacher filter
  console.log('\nTest 3: Teacher filter');
  const teachers = getAllTeachers();
  let result3 = [];
  if (teachers.length > 0) {
    result3 = getStudentDataFreshDebug({ teacher: teachers[0] });
    console.log('Result count for', teachers[0] + ':', result3.length);
  } else {
    console.log('No teachers found in system');
  }
  
  // Test 4: Combined filters
  console.log('\nTest 4: Combined filters');
  const result4 = getStudentDataFreshDebug({
    grade: '3',
    performanceBand: 'Standard Met'
  });
  console.log('Result count:', result4.length);
  
  // Test 5: EL filter
  console.log('\nTest 5: EL students only');
  const result5 = getStudentDataFreshDebug({ elOnly: 'true' });
  console.log('Result count:', result5.length);
  
  return {
    noFilters: result1.length,
    gradeFilter: result2.length,
    teacherFilter: result3.length,
    combinedFilters: result4.length,
    elOnly: result5.length
  };
}

// Verify data integrity
function verifyDataIntegrity() {
  const issues = [];
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const cfaSheet = ss.getSheetByName('CFAData');
    
    if (!cfaSheet) {
      issues.push('CFAData sheet not found');
      return { success: false, issues: issues };
    }
    
    const data = cfaSheet.getDataRange().getValues();
    
    // Check header row
    const expectedHeaders = ['Teacher', 'Grade', 'CFA', 'Student Name', 'Score', 'Performance Band', 'Date', 'Points Possible'];
    const actualHeaders = data[0];
    
    for (let i = 0; i < expectedHeaders.length; i++) {
      if (actualHeaders[i] !== expectedHeaders[i]) {
        issues.push('Header mismatch at column ' + (i + 1) + ': expected "' + expectedHeaders[i] + '", got "' + actualHeaders[i] + '"');
      }
    }
    
    // Check data rows
    let emptyTeacher = 0;
    let emptyStudent = 0;
    let invalidScore = 0;
    let invalidPoints = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0]) emptyTeacher++;
      if (!data[i][3]) emptyStudent++;
      if (isNaN(parseFloat(data[i][4]))) invalidScore++;
      if (isNaN(parseFloat(data[i][7]))) invalidPoints++;
    }
    
    if (emptyTeacher > 0) issues.push(emptyTeacher + ' rows with empty teacher');
    if (emptyStudent > 0) issues.push(emptyStudent + ' rows with empty student name');
    if (invalidScore > 0) issues.push(invalidScore + ' rows with invalid score');
    if (invalidPoints > 0) issues.push(invalidPoints + ' rows with invalid points possible');
    
    // Check roster sheet
    const rosterSheet = ss.getSheetByName('Rosters');
    if (!rosterSheet) {
      issues.push('Rosters sheet not found');
    } else {
      const rosterData = rosterSheet.getDataRange().getValues();
      let elStudents = 0;
      for (let i = 1; i < rosterData.length; i++) {
        if (rosterData[i][4] === 'Yes') elStudents++;
      }
      console.log('Roster has ' + (rosterData.length - 1) + ' students, ' + elStudents + ' marked as EL');
    }
    
    return {
      success: issues.length === 0,
      issues: issues,
      stats: {
        totalRows: data.length - 1,
        emptyTeacher: emptyTeacher,
        emptyStudent: emptyStudent,
        invalidScore: invalidScore,
        invalidPoints: invalidPoints
      }
    };
    
  } catch (error) {
    return {
      success: false,
      issues: ['Error: ' + error.toString()]
    };
  }
}

// Test visualization directly
function testDirectVisualization() {
  try {
    console.log("=== TESTING DIRECT VISUALIZATION ===");
    console.log("Test started at:", new Date().toISOString());
    
    // Test 1: No filters at all
    console.log("\n--- Test 1: No filters ---");
    let test1;
    try {
      test1 = getStudentDataFresh({});
      console.log("Result 1:", test1 ? test1.length + " records found" : "NULL RETURNED");
      if (test1 && test1.length > 0) {
        console.log("Sample record:", JSON.stringify(test1[0]));
      }
    } catch (e1) {
      console.error("Test 1 ERROR:", e1.toString());
    }
    
    // Test 2: Empty string filters (what HTML sends)
    console.log("\n--- Test 2: Empty string filters ---");
    let test2;
    try {
      test2 = getStudentDataFresh({
        grade: "",
        teacher: "",
        cfa: "",
        performanceBand: ""
      });
      console.log("Result 2:", test2 ? test2.length + " records found" : "NULL RETURNED");
    } catch (e2) {
      console.error("Test 2 ERROR:", e2.toString());
    }
    
    // Test 3: Your specific data
    console.log("\n--- Test 3: Specific filters for your data ---");
    let test3;
    try {
      test3 = getStudentDataFresh({
        grade: "6",
        teacher: "Mr. Mendoza",
        cfa: "6.RP.A.3",
        performanceBand: ""
      });
      console.log("Result 3:", test3 ? test3.length + " records found" : "NULL RETURNED");
      if (test3 && test3.length > 0) {
        console.log("First student:", test3[0].studentName);
        console.log("Score:", test3[0].score);
        console.log("Percentage:", test3[0].percentage);
      }
    } catch (e3) {
      console.error("Test 3 ERROR:", e3.toString());
    }
    
    // Test 4: Check if sheets exist
    console.log("\n--- Test 4: Sheet verification ---");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const cfaSheet = ss.getSheetByName('CFAData');
    const rosterSheet = ss.getSheetByName('Rosters');
    
    console.log("CFAData sheet exists:", cfaSheet ? "YES" : "NO");
    if (cfaSheet) {
      console.log("CFAData rows:", cfaSheet.getLastRow());
      console.log("CFAData columns:", cfaSheet.getLastColumn());
    }
    
    console.log("Rosters sheet exists:", rosterSheet ? "YES" : "NO");
    if (rosterSheet) {
      console.log("Roster rows:", rosterSheet.getLastRow());
    }
    
    console.log("\n=== TEST COMPLETE ===");
    
    return {
      test1: test1 ? test1.length : "NULL",
      test2: test2 ? test2.length : "NULL",
      test3: test3 ? test3.length : "NULL",
      sheetsOK: cfaSheet && rosterSheet
    };
    
  } catch (error) {
    console.error("FATAL TEST ERROR:", error.toString());
    console.error("Stack trace:", error.stack);
    return { error: error.toString() };
  }
}

// ==========================================
// SAMPLE DATA GENERATOR
// Run this once to add test data for all grades
// ==========================================
function addSampleDataSimple() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfaSheet = ss.getSheetByName('CFAData');
  const rosterSheet = ss.getSheetByName('Rosters');
  const cfaListSheet = ss.getSheetByName('CFAList');
  
  // Sample test data for all grades
  const testData = [
    // Kindergarten
    ['Mrs. DeMoss', 'K', 'Math Unit 1', 'Garcia, Emma', 8.5, 'Standard Exceeded', '11/15/2024', 10],
    ['Mrs. DeMoss', 'K', 'Math Unit 1', 'Johnson, Liam', 7.2, 'Standard Met', '11/15/2024', 10],
    ['Mrs. DeMoss', 'K', 'Math Unit 1', 'Williams, Olivia', 4.5, 'Standard Not Met', '11/15/2024', 10],
    ['Mrs. Olvera', 'K', 'Math Unit 1', 'Brown, Noah', 9.1, 'Standard Exceeded', '11/15/2024', 10],
    ['Mrs. Olvera', 'K', 'Math Unit 1', 'Jones, Ava', 6.8, 'Standard Met', '11/15/2024', 10],
    ['Ms. Peña', 'K', 'Math Unit 1', 'Smith, Lucas', 5.2, 'Standard Nearly Met', '11/15/2024', 10],
    
    // Grade 1
    ['Mrs. Friedenberg', '1', 'Math Unit 2', 'Miller, Ethan', 8.8, 'Standard Exceeded', '11/15/2024', 10],
    ['Mrs. Friedenberg', '1', 'Math Unit 2', 'Davis, Sophia', 5.2, 'Standard Nearly Met', '11/15/2024', 10],
    ['Mrs. Friedenberg', '1', 'Math Unit 2', 'Wilson, Jackson', 7.5, 'Standard Met', '11/15/2024', 10],
    ['Mrs. Renteria', '1', 'Math Unit 2', 'Martinez, Mason', 7.5, 'Standard Met', '11/15/2024', 10],
    ['Mrs. Renteria', '1', 'Math Unit 2', 'Rodriguez, Isabella', 3.8, 'Standard Not Met', '11/15/2024', 10],
    
    // Grade 2
    ['Mrs. Ebiner', '2', 'Math Unit 3', 'Lopez, William', 9.2, 'Standard Exceeded', '11/15/2024', 10],
    ['Mrs. Ebiner', '2', 'Math Unit 3', 'Gonzalez, Mia', 6.5, 'Standard Met', '11/15/2024', 10],
    ['Mrs. Flores', '2', 'Math Unit 3', 'Wilson, James', 5.5, 'Standard Nearly Met', '11/15/2024', 10],
    ['Mrs. Flores', '2', 'Math Unit 3', 'Anderson, Charlotte', 8.0, 'Standard Met', '11/15/2024', 10],
    ['Mrs. Flores', '2', 'Math Unit 3', 'Thomas, Oliver', 4.2, 'Standard Not Met', '11/15/2024', 10],
    
    // Grade 3
    ['Ms. Carranza', '3', 'Math Fractions', 'Thomas, Benjamin', 8.6, 'Standard Exceeded', '11/15/2024', 10],
    ['Ms. Carranza', '3', 'Math Fractions', 'Taylor, Amelia', 4.2, 'Standard Not Met', '11/15/2024', 10],
    ['Ms. Carranza', '3', 'Math Fractions', 'White, Madison', 7.1, 'Standard Met', '11/15/2024', 10],
    ['Mrs. Kopper', '3', 'Math Fractions', 'Moore, Lucas', 7.8, 'Standard Met', '11/15/2024', 10],
    ['Mrs. Kopper', '3', 'Math Fractions', 'Clark, Emma', 9.3, 'Standard Exceeded', '11/15/2024', 10],
    ['Ms. Young', '3', 'Math Fractions', 'Jackson, Harper', 9.0, 'Standard Exceeded', '11/15/2024', 10],
    ['Ms. Young', '3', 'Math Fractions', 'Lee, Michael', 5.8, 'Standard Nearly Met', '11/15/2024', 10],
    
    // Grade 4
    ['Mrs. Apparito', '4', 'Math Division', 'Martin, Henry', 6.8, 'Standard Met', '11/15/2024', 10],
    ['Mrs. Apparito', '4', 'Math Division', 'Lee, Evelyn', 5.0, 'Standard Nearly Met', '11/15/2024', 10],
    ['Mrs. Apparito', '4', 'Math Division', 'Hall, Logan', 8.2, 'Standard Exceeded', '11/15/2024', 10],
    ['Mrs. Friesen', '4', 'Math Division', 'Perez, Alexander', 8.9, 'Standard Exceeded', '11/15/2024', 10],
    ['Mrs. Friesen', '4', 'Math Division', 'Thompson, Sofia', 7.2, 'Standard Met', '11/15/2024', 10],
    
    // Grade 5
    ['Mrs. Frias', '5', 'Math Decimals', 'White, Michael', 9.1, 'Standard Exceeded', '11/15/2024', 10],
    ['Mrs. Frias', '5', 'Math Decimals', 'Brown, Ashley', 6.3, 'Standard Met', '11/15/2024', 10],
    ['Ms. Gomez', '5', 'Math Decimals', 'Harris, Emily', 5.8, 'Standard Nearly Met', '11/15/2024', 10],
    ['Ms. Gomez', '5', 'Math Decimals', 'Nelson, James', 7.7, 'Standard Met', '11/15/2024', 10],
    ['Mrs. Ruth', '5', 'Math Decimals', 'Clark, Daniel', 6.5, 'Standard Met', '11/15/2024', 10],
    ['Mrs. Ruth', '5', 'Math Decimals', 'Lewis, Sarah', 8.8, 'Standard Exceeded', '11/15/2024', 10],
    
    // Grade 6
    ['Mr. Mendoza', '6', '6.RP.A.3', 'Adams, Sarah', 8.2, 'Standard Exceeded', '11/15/2024', 10],
    ['Mr. Mendoza', '6', '6.RP.A.3', 'Baker, John', 7.0, 'Standard Met', '11/15/2024', 10],
    ['Mr. Mendoza', '6', '6.RP.A.3', 'Campbell, Maria', 4.8, 'Standard Not Met', '11/15/2024', 10],
    ['Mr. Mendoza', '6', '6.RP.A.3', 'Davis, Robert', 6.5, 'Standard Met', '11/15/2024', 10],
    ['Mrs. Spencer', '6', '6.RP.A.3', 'Evans, David', 9.3, 'Standard Exceeded', '11/15/2024', 10],
    ['Mrs. Spencer', '6', '6.RP.A.3', 'Foster, Jessica', 5.5, 'Standard Nearly Met', '11/15/2024', 10],
    ['Mrs. Sanchez', '6', '6.RP.A.3', 'Green, William', 7.8, 'Standard Met', '11/15/2024', 10],
    
    // Grade 7
    ['Ms. Jimenez', '7', 'Algebra Basics', 'Gray, Robert', 7.8, 'Standard Met', '11/15/2024', 10],
    ['Ms. Jimenez', '7', 'Algebra Basics', 'Hill, Jennifer', 8.9, 'Standard Exceeded', '11/15/2024', 10],
    ['Mrs. Alvarez', '7', 'Algebra Basics', 'Hall, Linda', 8.5, 'Standard Exceeded', '11/15/2024', 10],
    ['Mrs. Alvarez', '7', 'Algebra Basics', 'King, Michael', 6.2, 'Standard Met', '11/15/2024', 10],
    ['Mr. Ramirez', '7', 'Algebra Basics', 'King, Steven', 4.0, 'Standard Not Met', '11/15/2024', 10],
    ['Mr. Ramirez', '7', 'Algebra Basics', 'Wright, Emily', 7.5, 'Standard Met', '11/15/2024', 10],
    
    // Grade 8
    ['Mrs. Reagan', '8', 'Geometry Intro', 'Nelson, Karen', 9.0, 'Standard Exceeded', '11/15/2024', 10],
    ['Mrs. Reagan', '8', 'Geometry Intro', 'Lopez, David', 6.8, 'Standard Met', '11/15/2024', 10],
    ['Mrs. Pena', '8', 'Geometry Intro', 'Parker, Brian', 6.2, 'Standard Met', '11/15/2024', 10],
    ['Mrs. Pena', '8', 'Geometry Intro', 'Scott, Ashley', 8.5, 'Standard Exceeded', '11/15/2024', 10]
  ];
  
  // Add test data to CFAData sheet
  const lastRow = cfaSheet.getLastRow();
  cfaSheet.getRange(lastRow + 1, 1, testData.length, 8).setValues(testData);
  
  // Add corresponding students to roster
  const rosterData = testData.map((row, index) => [
    1000 + index, // Sequential ID
    row[3], // Student name
    row[1], // Grade
    row[0], // Teacher
    Math.random() < 0.2 ? 'Yes' : 'No' // 20% EL students
  ]);
  
  const rosterLastRow = rosterSheet.getLastRow();
  rosterSheet.getRange(rosterLastRow + 1, 1, rosterData.length, 5).setValues(rosterData);
  
  // Add CFAs to CFA list
  const cfaListData = [
    ['Math Unit 1', 'K', 'Math'],
    ['Math Unit 2', '1', 'Math'],
    ['Math Unit 3', '2', 'Math'],
    ['Math Fractions', '3', 'Math'],
    ['Math Division', '4', 'Math'],
    ['Math Decimals', '5', 'Math'],
    ['6.RP.A.3', '6', 'Math'],
    ['Algebra Basics', '7', 'Math'],
    ['Geometry Intro', '8', 'Math']
  ];
  
  const cfaListLastRow = cfaListSheet.getLastRow();
  cfaListSheet.getRange(cfaListLastRow + 1, 1, cfaListData.length, 3).setValues(cfaListData);
  
  // Clear cache so new data shows up
  CacheService.getScriptCache().removeAll(['data_', 'scores_', 'roster_', 'cfas_']);
  
  console.log('Added ' + testData.length + ' sample scores!');
  return 'Added ' + testData.length + ' sample scores across all grades!';
}

function quickDataCheck() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAData');
  const data = sheet.getDataRange().getValues();
  console.log('Total rows in CFAData: ' + data.length);
  console.log('First data row: ' + JSON.stringify(data[1]));
  
  // Test the visualization function directly
  const testResult = getStudentDataForVisualization({});
  console.log('Visualization function returned: ' + testResult.length + ' records');
  
  return {
    totalRows: data.length,
    visualizationRecords: testResult.length
  };
}

// ========================================
// FIX FUNCTIONS FOR STUDENT IDs
// ========================================

// 1. First, run this ONE TIME to fix existing IDs in CFAData
function fixExistingStudentNames() {
  const cfaSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAData');
  const rosterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rosters');
  
  // Get roster data for lookup
  const rosterData = rosterSheet.getDataRange().getValues();
  const idToName = {};
  
  // Build lookup table (skip header row)
  for (let i = 1; i < rosterData.length; i++) {
    const id = String(rosterData[i][0]).trim(); // Student ID in column A
    const name = String(rosterData[i][1]).trim(); // Student Name in column B
    if (id && name) {
      idToName[id] = name;
    }
  }
  
  // Get CFA data
  const cfaData = cfaSheet.getDataRange().getValues();
  let fixedCount = 0;
  
  // Update names where they are IDs (skip header)
  for (let i = 1; i < cfaData.length; i++) {
    const studentField = String(cfaData[i][3]).trim(); // Column D (Student Name)
    
    // Check if this looks like an ID (all numbers)
    if (/^\d+$/.test(studentField)) {
      if (idToName[studentField]) {
        cfaSheet.getRange(i + 1, 4).setValue(idToName[studentField]);
        fixedCount++;
        console.log(`Fixed row ${i+1}: ${studentField} → ${idToName[studentField]}`);
      } else {
        console.log(`Warning: No name found for ID ${studentField} in row ${i+1}`);
      }
    }
  }
  
  // Clear cache after fixing
  CacheService.getScriptCache().removeAll(['data_', 'scores_']);
  
  return `Fixed ${fixedCount} student IDs to names`;
}

// 3. Helper function to verify roster data
function checkRosterIntegrity() {
  const rosterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rosters');
  const data = rosterSheet.getDataRange().getValues();
  
  const issues = [];
  const stats = {
    totalStudents: data.length - 1,
    hasId: 0,
    hasName: 0,
    hasBoth: 0,
    duplicateIds: [],
    missingIds: [],
    missingNames: []
  };
  
  const seenIds = {};
  
  for (let i = 1; i < data.length; i++) {
    const id = String(data[i][0]).trim();
    const name = String(data[i][1]).trim();
    
    if (id) stats.hasId++;
    if (name) stats.hasName++;
    if (id && name) stats.hasBoth++;
    
    if (!id) {
      stats.missingIds.push(`Row ${i+1}: ${name || 'NO NAME'}`);
    }
    if (!name) {
      stats.missingNames.push(`Row ${i+1}: ID ${id || 'NO ID'}`);
    }
    
    if (id && seenIds[id]) {
      stats.duplicateIds.push(`ID ${id} appears in rows ${seenIds[id]} and ${i+1}`);
    }
    seenIds[id] = i + 1;
  }
  
  console.log('Roster Integrity Check:');
  console.log(`Total Students: ${stats.totalStudents}`);
  console.log(`Have Both ID and Name: ${stats.hasBoth}`);
  console.log(`Missing IDs: ${stats.missingIds.length}`);
  console.log(`Missing Names: ${stats.missingNames.length}`);
  console.log(`Duplicate IDs: ${stats.duplicateIds.length}`);
  
  if (stats.missingIds.length > 0) {
    console.log('Students missing IDs:', stats.missingIds.slice(0, 5));
  }
  if (stats.missingNames.length > 0) {
    console.log('Students missing names:', stats.missingNames.slice(0, 5));
  }
  if (stats.duplicateIds.length > 0) {
    console.log('Duplicate IDs found:', stats.duplicateIds.slice(0, 5));
  }
  
  return stats;
}

// 4. Test function to verify the fix worked
function testDataAfterFix() {
  const cfaSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAData');
  const data = cfaSheet.getDataRange().getValues();
  
  let idCount = 0;
  let nameCount = 0;
  const sampleData = [];
  
  for (let i = 1; i < Math.min(data.length, 11); i++) {
    const studentField = String(data[i][3]);
    
    if (/^\d+$/.test(studentField)) {
      idCount++;
    } else {
      nameCount++;
    }
    
    if (i <= 5) {
      sampleData.push({
        row: i + 1,
        teacher: data[i][0],
        student: data[i][3],
        score: data[i][4]
      });
    }
  }
  
  console.log(`\nData Check Results:`);
  console.log(`Total records: ${data.length - 1}`);
  console.log(`Records with IDs: ${idCount}`);
  console.log(`Records with Names: ${nameCount}`);
  console.log(`\nFirst 5 records:`);
  sampleData.forEach(r => {
    console.log(`  Row ${r.row}: ${r.teacher} - ${r.student} - Score: ${r.score}`);
  });
  
  if (idCount > 0) {
    console.log(`\n⚠️ Still have ${idCount} records with IDs instead of names`);
    console.log('Run fixExistingStudentNames() to fix these');
  } else {
    console.log('\n✅ All records have proper student names!');
  }
  
  return {
    totalRecords: data.length - 1,
    withIds: idCount,
    withNames: nameCount,
    fixed: idCount === 0
  };
}

// Run this function to fix all IDs to Names
function fixAllIDsToNames() {
  const cfaSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAData');
  const rosterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rosters');
  
  console.log('Starting to fix IDs to Names...');
  
  // Get all roster data
  const rosterData = rosterSheet.getDataRange().getValues();
  
  // Build lookup: ID (column A) -> Name (column B)
  const idToName = {};
  let rosterCount = 0;
  
  for (let i = 1; i < rosterData.length; i++) {
    const id = String(rosterData[i][0]).trim();     // Column A - Student ID
    const name = String(rosterData[i][1]).trim();   // Column B - Student Name
    
    if (id && name) {
      idToName[id] = name;
      rosterCount++;
    }
  }
  
  console.log(`Loaded ${rosterCount} students from Rosters sheet`);
  console.log(`Sample IDs from roster: ${Object.keys(idToName).slice(0, 5).join(', ')}`);
  
  // Get all CFA data
  const cfaData = cfaSheet.getDataRange().getValues();
  let fixedCount = 0;
  let notFoundCount = 0;
  const notFoundIDs = [];
  
  // Fix each row (skip header)
  for (let i = 1; i < cfaData.length; i++) {
    const currentValue = String(cfaData[i][3]).trim(); // Column D
    
    // Check if it's an ID (all numbers)
    if (/^\d+$/.test(currentValue)) {
      if (idToName[currentValue]) {
        // Found the name for this ID
        cfaSheet.getRange(i + 1, 4).setValue(idToName[currentValue]);
        fixedCount++;
        
        if (fixedCount <= 5) {
          console.log(`Fixed row ${i+1}: ${currentValue} → ${idToName[currentValue]}`);
        }
      } else {
        // ID not found in roster
        notFoundCount++;
        if (notFoundIDs.length < 10) {
          notFoundIDs.push(currentValue);
        }
      }
    }
  }
  
  // Clear cache so changes show up
  CacheService.getScriptCache().removeAll(['data_', 'scores_']);
  
  // Report results
  console.log('\n=== RESULTS ===');
  console.log(`✅ Successfully fixed ${fixedCount} IDs to names`);
  
  if (notFoundCount > 0) {
    console.log(`⚠️ Could not find ${notFoundCount} IDs in the roster`);
    console.log(`Missing IDs (first 10): ${notFoundIDs.join(', ')}`);
    console.log('\nPossible reasons:');
    console.log('1. These students might not be in your Rosters sheet');
    console.log('2. The IDs might be formatted differently');
    console.log('3. Check if these students need to be added to Rosters');
  }
  
  return {
    fixed: fixedCount,
    notFound: notFoundCount,
    message: `Fixed ${fixedCount} records, ${notFoundCount} IDs not found in roster`
  };
}

// CHECK WHAT IDS ARE MISSING
function checkMissingIDs() {
  const cfaSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAData');
  const rosterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rosters');
  
  // Get roster IDs
  const rosterData = rosterSheet.getDataRange().getValues();
  const rosterIDs = new Set();
  
  for (let i = 1; i < rosterData.length; i++) {
    const id = String(rosterData[i][0]).trim();
    if (id) rosterIDs.add(id);
  }
  
  // Get CFA IDs
  const cfaData = cfaSheet.getDataRange().getValues();
  const missingIDs = [];
  
  for (let i = 1; i < cfaData.length; i++) {
    const id = String(cfaData[i][3]).trim();
    if (/^\d+$/.test(id) && !rosterIDs.has(id)) {
      missingIDs.push({
        row: i + 1,
        id: id,
        teacher: cfaData[i][0],
        grade: cfaData[i][1]
      });
    }
  }
  
  console.log(`Found ${missingIDs.length} IDs in CFAData that are not in Rosters:`);
  missingIDs.forEach(item => {
    console.log(`  Row ${item.row}: ID ${item.id} (${item.teacher}, Grade ${item.grade})`);
  });
  
  return missingIDs;
}

function forceClearCache() {
  CacheService.getScriptCache().removeAll();
  return "Cache cleared!";
}

function fixGetStudentData() {
  // Clear ALL cache entries completely
  const cache = CacheService.getScriptCache();
  cache.removeAll();
  console.log('Cache cleared');
  
  // Test the function directly with empty filters
  const result = getStudentData({});
  console.log('Direct test result:', result ? result.length + ' records' : 'NULL');
  
  // If null, try without cache
  if (!result) {
    console.log('Testing without cache...');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAData');
    const data = sheet.getDataRange().getValues();
    console.log('Sheet has', data.length - 1, 'data rows');
    
    // Check first student name
    if (data.length > 1) {
      console.log('First student name (D2):', data[1][3]);
      console.log('Is it empty?', data[1][3] === '');
      console.log('Type:', typeof data[1][3]);
    }
  }
  
  return result ? 'Working!' : 'Still broken';
}

// ==========================================
// getDataDirect - PATCHED VERSION (Line 2305)
// ==========================================
function getDataDirect(filters) {
  if (!filters) filters = {};
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAData');
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const data = sheet.getDataRange().getValues();
  const result = [];
  
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0] || !data[i][3]) continue;
    
    let include = true;
    
    // Fix: Convert both grade values to strings for comparison
    if (filters.grade && filters.grade !== '') {
      if (String(data[i][1]) !== String(filters.grade)) {
        include = false;
      }
    }
    
    if (filters.teacher && filters.teacher !== '') {
      if (data[i][0] !== filters.teacher) {
        include = false;
      }
    }
    
    if (filters.cfa && filters.cfa !== '') {
      if (data[i][2] !== filters.cfa) {
        include = false;
      }
    }
    
    if (filters.performanceBand && filters.performanceBand !== '') {
      if (data[i][5] !== filters.performanceBand) {
        include = false;
      }
    }
    
    if (include) {
      const pointsPossible = parseFloat(data[i][7]) || 10;
      const score = parseFloat(data[i][4]) || 0;
      
      result.push({
        teacher: data[i][0],
        grade: String(data[i][1]),
        cfa: data[i][2],
        studentName: data[i][3],
        score: score,
        performanceBand: data[i][5],
        date: data[i][6],
        pointsPossible: pointsPossible,
        percentage: (score / pointsPossible) * 100
      });
    }
  }
  
  return result;
}

// ========================================
// TEST FUNCTIONS FOR DIAGNOSIS
// ========================================

// Test 1: Simple returns
function testSimpleReturn() {
  return "Hello from backend!";
}

function testArrayReturn() {
  return [1, 2, 3, 4, 5];
}

function testObjectReturn() {
  return { message: "Object works", value: 42, timestamp: new Date().toString() };
}

// Test 2: Sheet access
function testSheetAccess() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const cfaSheet = ss.getSheetByName('CFAData');
    const rosterSheet = ss.getSheetByName('Rosters');
    
    let result = {
      success: true,
      cfaRows: 0,
      rosterRows: 0,
      firstStudent: 'None'
    };
    
    if (cfaSheet) {
      result.cfaRows = cfaSheet.getLastRow() - 1; // Minus header
      if (cfaSheet.getLastRow() > 1) {
        result.firstStudent = cfaSheet.getRange('D2').getValue();
      }
    } else {
      result.success = false;
      result.error = 'CFAData sheet not found';
    }
    
    if (rosterSheet) {
      result.rosterRows = rosterSheet.getLastRow() - 1;
    }
    
    return result;
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

function diagnoseSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('CFAData');
    
    const result = {
      sheetExists: sheet !== null,
      sheetName: sheet ? sheet.getName() : 'NOT FOUND',
      lastRow: sheet ? sheet.getLastRow() : 0,
      lastColumn: sheet ? sheet.getLastColumn() : 0
    };
    
    if (sheet && sheet.getLastRow() > 1) {
      // Get first data row
      const firstRow = sheet.getRange(2, 1, 1, 8).getValues()[0];
      result.firstRowData = firstRow;
      result.studentNameColumn = firstRow[3]; // Column D
      
      // Check if it's empty
      result.hasData = firstRow.some(cell => cell !== '');
    }
    
    return result;
    
  } catch(e) {
    return { error: e.toString() };
  }
}

function diagnoseDataProblem() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAData');
  const data = sheet.getRange(2, 1, Math.min(5, sheet.getLastRow()-1), 8).getValues();
  
  console.log("First 5 rows of actual data:");
  data.forEach((row, i) => {
    console.log(`Row ${i+2}:`);
    console.log(`  Teacher: "${row[0]}" (type: ${typeof row[0]})`);
    console.log(`  Grade: "${row[1]}" (type: ${typeof row[1]})`);
    console.log(`  Student: "${row[3]}"`);
  });
  
  // Test exact match
  const mendozaRows = data.filter(row => row[0] === "Mr. Mendoza");
  console.log(`\nRows where teacher exactly equals "Mr. Mendoza": ${mendozaRows.length}`);
  
  // Test grade match
  const grade6Rows = data.filter(row => String(row[1]) === "6");
  console.log(`Rows where grade equals "6": ${grade6Rows.length}`);
  
  return "Check logs";
}

// Add this function to your Code.gs file
function getDataForAnalytics(filters) {
  // This makes Analytics use the same data retrieval as Compare Classes
  return getStudentDataForVisualization(filters);
}

function quickTest() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAData');
  const data = sheet.getDataRange().getValues();
  return "You have " + (data.length - 1) + " rows of student data";
}

function testWhatDataExists() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CFAData');
  const data = sheet.getDataRange().getValues();
  
  // Count non-empty rows
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][3]) { // Has teacher and student
      count++;
    }
  }
  
  console.log('Total data rows:', count);
  console.log('First student:', data[1][3]);
  console.log('First teacher:', data[1][0]);
  console.log('First grade:', data[1][1]);
  
  return {
    totalRows: count,
    firstStudent: data[1][3],
    firstTeacher: data[1][0],
    firstGrade: data[1][1]
  };
}

function debugAnalyticsCall(filters) {
  console.log('Analytics called with:', JSON.stringify(filters));
  
  // Try different functions to see which works
  const result1 = getDataDirect(filters);
  const result2 = getStudentDataForVisualization(filters);
  
  console.log('getDataDirect returned:', result1.length, 'records');
  console.log('getStudentDataForVisualization returned:', result2.length, 'records');
  
  // Return whichever has data
  if (result2.length > 0) {
    console.log('Using visualization function data');
    return result2;
  }
  
  console.log('Using direct function data');
  return result1;
}
