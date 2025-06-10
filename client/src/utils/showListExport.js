import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// A4 page dimensions in mm
const A4_WIDTH = 210;
const A4_HEIGHT = 297;

/**
 * Generate PDF export for Show List
 * @param {Object} show - Show data
 * @param {Array} equipmentList - List of equipment items
 * @param {Object} options - Export options
 */
export const exportShowListToPDF = (show, equipmentList, options = {}) => {
  const {
    includeImages = false,
    includeNotes = true,
    includeQuantities = true,
    includeStatus = true,
    orientation = 'portrait' // 'portrait' or 'landscape'
  } = options;

  // Create new PDF document
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4'
  });

  // Set up fonts and colors
  const primaryColor = [59, 130, 246]; // Blue
  const secondaryColor = [71, 85, 105]; // Slate
  const textColor = [15, 23, 42]; // Dark slate

  // Header Section
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, A4_WIDTH, 25, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('EQUIPMENT LIST', 15, 16);

  // Show Information
  doc.setTextColor(...textColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  let yPosition = 35;
  
  // Show details in two columns
  const leftColumn = 15;
  const rightColumn = 110;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Show:', leftColumn, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(show.name || 'Untitled Show', leftColumn + 20, yPosition);
  
  if (show.date) {
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', rightColumn, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(show.date).toLocaleDateString(), rightColumn + 20, yPosition);
  }
  
  yPosition += 8;
  
  if (show.venue) {
    doc.setFont('helvetica', 'bold');
    doc.text('Venue:', leftColumn, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(show.venue, leftColumn + 20, yPosition);
  }
  
  if (show.status) {
    doc.setFont('helvetica', 'bold');
    doc.text('Status:', rightColumn, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(show.status.charAt(0).toUpperCase() + show.status.slice(1), rightColumn + 20, yPosition);
  }
  
  yPosition += 8;
  
  // Export timestamp
  doc.setFont('helvetica', 'bold');
  doc.text('Generated:', leftColumn, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleString(), leftColumn + 25, yPosition);
  
  // Total items
  doc.setFont('helvetica', 'bold');
  doc.text('Total Items:', rightColumn, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(equipmentList.length.toString(), rightColumn + 25, yPosition);
  
  yPosition += 15;

  // Prepare table data
  const tableColumns = ['Item', 'Brand + Model', 'Serial Number'];
  
  if (includeQuantities) {
    tableColumns.push('Qty');
  }
  
  if (includeStatus) {
    tableColumns.push('Status');
  }
  
  if (includeNotes) {
    tableColumns.push('Notes');
  }

  const tableData = equipmentList.map((item, index) => {
    // Extract equipment details from nested structure
    const equipment = item.equipment || item;
    const equipmentType = equipment.type || equipment.name || item.equipment_type || 'Unknown';
    const equipmentBrand = equipment.brand || item.equipment_brand || '';
    const equipmentModel = equipment.model || item.equipment_model || '';
    const equipmentSerial = equipment.serial_number || item.equipment_serial_number || 'N/A';

    // Format Brand + Model with proper spacing and fallbacks
    let brandModel = '';
    if (equipmentBrand && equipmentModel) {
      brandModel = `${equipmentBrand} ${equipmentModel}`;
    } else if (equipmentBrand) {
      brandModel = equipmentBrand;
    } else if (equipmentModel) {
      brandModel = equipmentModel;
    } else {
      brandModel = 'Not specified';
    }

    const row = [
      `${index + 1}. ${equipmentType}`,
      brandModel,
      equipmentSerial
    ];

    if (includeQuantities) {
      row.push((item.quantity_allocated || 0).toString());
    }

    if (includeStatus) {
      row.push((item.status || 'Unknown').charAt(0).toUpperCase() + (item.status || 'unknown').slice(1));
    }

    if (includeNotes) {
      row.push(item.notes || '');
    }

    return row;
  });

  // Generate simple table without autoTable for now
  // Table header
  doc.setFillColor(...primaryColor);
  doc.rect(15, yPosition, A4_WIDTH - 30, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  let xPos = 20;
  tableColumns.forEach((column, index) => {
    doc.text(column, xPos, yPosition + 6);
    xPos += orientation === 'landscape' ? 50 : 35;
  });

  // Table body
  yPosition += 10;
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  tableData.forEach((row, rowIndex) => {
    if (yPosition > A4_HEIGHT - 30) {
      doc.addPage();
      yPosition = 20;

      // Re-draw header on new page
      doc.setFillColor(...primaryColor);
      doc.rect(15, yPosition, A4_WIDTH - 30, 8, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');

      let headerXPos = 20;
      tableColumns.forEach((column, index) => {
        doc.text(column, headerXPos, yPosition + 6);
        headerXPos += orientation === 'landscape' ? 50 : 35;
      });

      yPosition += 10;
      doc.setTextColor(...textColor);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
    }

    // Alternate row colors
    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, yPosition - 2, A4_WIDTH - 30, 8, 'F');
    }

    xPos = 20;
    row.forEach((cell, cellIndex) => {
      const cellText = String(cell || '').substring(0, 30); // Limit text length
      doc.text(cellText, xPos, yPosition + 4);
      xPos += orientation === 'landscape' ? 50 : 35;
    });

    yPosition += 8;
  });

  // Footer on each page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...secondaryColor);
    doc.text(
      `Page ${i} of ${pageCount}`,
      A4_WIDTH - 30,
      A4_HEIGHT - 10
    );
    doc.text(
      'Theater Equipment Catalog',
      15,
      A4_HEIGHT - 10
    );
  }

  // Add summary section if there's space
  if (yPosition < A4_HEIGHT - 50) {
    yPosition += 15;
    
    // Summary box
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.rect(15, yPosition, A4_WIDTH - 30, 25);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('SUMMARY', 20, yPosition + 8);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    
    const totalAllocated = equipmentList.reduce((sum, item) => sum + (parseInt(item.quantity_allocated) || 0), 0);
    const allocatedItems = equipmentList.filter(item => (parseInt(item.quantity_allocated) || 0) > 0).length;
    const missingItems = equipmentList.filter(item =>
      (parseInt(item.quantity_needed) || 0) > (parseInt(item.quantity_allocated) || 0)
    ).length;

    doc.text(`Total Equipment Types: ${equipmentList.length}`, 20, yPosition + 16);
    doc.text(`Items Allocated: ${allocatedItems}`, 20, yPosition + 22);
    doc.text(`Total Quantity Allocated: ${totalAllocated}`, 110, yPosition + 16);
    doc.text(`Missing Items: ${missingItems}`, 110, yPosition + 22);
  }

  return doc;
};

/**
 * Generate Excel export for Show List
 * @param {Object} show - Show data
 * @param {Array} equipmentList - List of equipment items
 * @param {Object} options - Export options
 */
export const exportShowListToExcel = (show, equipmentList, options = {}) => {
  const {
    includeNotes = true,
    includeQuantities = true,
    includeStatus = true,
    includeDetails = true
  } = options;

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Create structured data with headers in row 1
  const worksheetData = [];

  // Equipment List Headers (row 1) - Type in column D (D1)
  const headers = ['', '', '#', 'Type', 'Brand + Model', 'Serial Number'];

  if (includeQuantities) {
    headers.push('Qty Needed', 'Qty Allocated', 'Missing');
  }

  if (includeStatus) {
    headers.push('Status');
  }

  if (includeDetails) {
    headers.push('Location', 'Category');
  }

  if (includeNotes) {
    headers.push('Notes');
  }

  worksheetData.push(headers);

  // Show Information Section (rows 2-8)
  worksheetData.push(['SHOW INFORMATION']);
  worksheetData.push(['Show Name:', show.name || 'Untitled Show']);
  worksheetData.push(['Date:', show.date ? new Date(show.date).toLocaleDateString() : 'Not specified']);
  worksheetData.push(['Venue:', show.venue || 'Not specified']);
  worksheetData.push(['Status:', show.status ? show.status.charAt(0).toUpperCase() + show.status.slice(1) : 'Unknown']);
  worksheetData.push(['Generated:', new Date().toLocaleString()]);
  worksheetData.push(['Total Items:', equipmentList.length]);
  worksheetData.push([]); // Empty row

  // Equipment data rows (starting from row 9)
  equipmentList.forEach((item, index) => {
    // Extract equipment details from nested structure
    const equipment = item.equipment || item;
    const equipmentType = equipment.type || equipment.name || item.equipment_type || 'Unknown';
    const equipmentBrand = equipment.brand || item.equipment_brand || '';
    const equipmentModel = equipment.model || item.equipment_model || '';
    const equipmentSerial = equipment.serial_number || item.equipment_serial_number || 'N/A';
    const equipmentLocation = equipment.location || item.equipment_location || 'Not specified';
    const equipmentCategory = equipment.category || item.equipment_category || 'Not specified';

    // Format Brand + Model with proper spacing and fallbacks
    let brandModel = '';
    if (equipmentBrand && equipmentModel) {
      brandModel = `${equipmentBrand} ${equipmentModel}`;
    } else if (equipmentBrand) {
      brandModel = equipmentBrand;
    } else if (equipmentModel) {
      brandModel = equipmentModel;
    } else {
      brandModel = 'Not specified';
    }

    const row = [
      '',                  // Column A: Empty
      '',                  // Column B: Empty
      index + 1,           // Column C: #
      equipmentType,       // Column D: Type (as requested)
      brandModel,          // Column E: Brand + Model
      equipmentSerial      // Column F: Serial Number
    ];

    if (includeQuantities) {
      const needed = parseInt(item.quantity_needed) || 0;
      const allocated = parseInt(item.quantity_allocated) || 0;
      const missing = Math.max(0, needed - allocated);

      row.push(needed, allocated, missing); // Columns E, F, G
    }

    if (includeStatus) {
      row.push((item.status || 'Unknown').charAt(0).toUpperCase() + (item.status || 'unknown').slice(1));
    }

    if (includeDetails) {
      row.push(equipmentLocation, equipmentCategory);
    }

    if (includeNotes) {
      row.push(item.notes || '');
    }

    worksheetData.push(row);
  });

  // Create worksheet from structured data
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths for optimal Microsoft Excel display
  const columnWidths = [
    { wch: 5 },  // Column A: Empty
    { wch: 5 },  // Column B: Empty
    { wch: 5 },  // Column C: #
    { wch: 25 }, // Column D: Type
    { wch: 25 }, // Column E: Brand + Model
    { wch: 20 }, // Column F: Serial Number
  ];

  if (includeQuantities) {
    columnWidths.push(
      { wch: 12 }, // Column G: Qty Needed
      { wch: 12 }, // Column H: Qty Allocated
      { wch: 10 }  // Column I: Missing
    );
  }

  if (includeStatus) {
    columnWidths.push({ wch: 12 }); // Status column
  }

  if (includeDetails) {
    columnWidths.push(
      { wch: 15 }, // Location column
      { wch: 15 }  // Category column
    );
  }

  if (includeNotes) {
    columnWidths.push({ wch: 30 }); // Notes column
  }

  worksheet['!cols'] = columnWidths;

  // Keep formatting simple to avoid Excel corruption
  // Only set basic properties that are well-supported

  // Add worksheet to workbook with Excel-compatible name
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipment List');
  
  return workbook;
};

/**
 * Download PDF file
 */
export const downloadPDF = (doc, filename) => {
  doc.save(filename);
};

/**
 * Download Excel file in Microsoft Excel format
 */
export const downloadExcel = (workbook, filename) => {
  // Write workbook in Microsoft Excel format (.xlsx) with minimal options to avoid corruption
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array'
  });

  // Create blob with proper Microsoft Excel MIME type
  const data = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  saveAs(data, filename);
};

/**
 * Generate filename for exports
 */
export const generateFilename = (show, format) => {
  const showName = (show.name || 'Show').replace(/[^a-zA-Z0-9]/g, '_');
  const showDate = show.date ? new Date(show.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const currentDate = new Date().toISOString().split('T')[0];

  // Ensure proper file extensions
  const extension = format === 'excel' ? 'xlsx' : format;

  return `${showName}_Equipment_List_${showDate}_${currentDate}.${extension}`;
};
