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
  const tableColumns = ['Item', 'Brand/Model', 'Serial Number'];
  
  if (includeQuantities) {
    tableColumns.push('Qty Needed', 'Qty Allocated');
  }
  
  if (includeStatus) {
    tableColumns.push('Status');
  }
  
  if (includeNotes) {
    tableColumns.push('Notes');
  }

  const tableData = equipmentList.map((item, index) => {
    const row = [
      `${index + 1}. ${item.equipment_type || item.type || 'Unknown'}`,
      `${item.equipment_brand || item.brand || ''} ${item.equipment_model || item.model || ''}`.trim(),
      item.equipment_serial_number || item.serial_number || 'N/A'
    ];
    
    if (includeQuantities) {
      row.push(
        (item.quantity_needed || 0).toString(),
        (item.quantity_allocated || 0).toString()
      );
    }
    
    if (includeStatus) {
      row.push((item.status || 'Unknown').charAt(0).toUpperCase() + (item.status || 'unknown').slice(1));
    }
    
    if (includeNotes) {
      row.push(item.notes || '');
    }
    
    return row;
  });

  // Generate table
  doc.autoTable({
    head: [tableColumns],
    body: tableData,
    startY: yPosition,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9,
      textColor: textColor
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Light gray
    },
    columnStyles: {
      0: { cellWidth: orientation === 'landscape' ? 50 : 35 }, // Item
      1: { cellWidth: orientation === 'landscape' ? 60 : 45 }, // Brand/Model
      2: { cellWidth: orientation === 'landscape' ? 40 : 30 }, // Serial
    },
    margin: { left: 15, right: 15 },
    didDrawPage: (data) => {
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
      
      doc.setFontSize(8);
      doc.setTextColor(...secondaryColor);
      doc.text(
        `Page ${pageNumber} of ${pageCount}`,
        A4_WIDTH - 30,
        A4_HEIGHT - 10
      );
      
      // Company/Organization name (if provided)
      doc.text(
        'Theater Equipment Catalog',
        15,
        A4_HEIGHT - 10
      );
    }
  });

  // Add summary section if there's space
  const finalY = doc.lastAutoTable.finalY;
  if (finalY < A4_HEIGHT - 50) {
    yPosition = finalY + 15;
    
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
    
    const totalNeeded = equipmentList.reduce((sum, item) => sum + (parseInt(item.quantity_needed) || 0), 0);
    const totalAllocated = equipmentList.reduce((sum, item) => sum + (parseInt(item.quantity_allocated) || 0), 0);
    const missingItems = equipmentList.filter(item => 
      (parseInt(item.quantity_needed) || 0) > (parseInt(item.quantity_allocated) || 0)
    ).length;
    
    doc.text(`Total Equipment Types: ${equipmentList.length}`, 20, yPosition + 16);
    doc.text(`Total Quantity Needed: ${totalNeeded}`, 20, yPosition + 22);
    doc.text(`Total Quantity Allocated: ${totalAllocated}`, 110, yPosition + 16);
    doc.text(`Items Missing Allocation: ${missingItems}`, 110, yPosition + 22);
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
  
  // Show Information Sheet
  const showInfoData = [
    ['SHOW INFORMATION', ''],
    ['Show Name', show.name || 'Untitled Show'],
    ['Date', show.date ? new Date(show.date).toLocaleDateString() : 'Not specified'],
    ['Venue', show.venue || 'Not specified'],
    ['Status', show.status ? show.status.charAt(0).toUpperCase() + show.status.slice(1) : 'Unknown'],
    ['Generated', new Date().toLocaleString()],
    ['Total Items', equipmentList.length],
    [''],
    ['EQUIPMENT LIST', '']
  ];

  // Equipment data headers
  const headers = ['#', 'Type', 'Brand', 'Model', 'Serial Number'];
  
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

  showInfoData.push(headers);

  // Equipment data rows
  equipmentList.forEach((item, index) => {
    const row = [
      index + 1,
      item.equipment_type || item.type || 'Unknown',
      item.equipment_brand || item.brand || '',
      item.equipment_model || item.model || '',
      item.equipment_serial_number || item.serial_number || 'N/A'
    ];
    
    if (includeQuantities) {
      const needed = parseInt(item.quantity_needed) || 0;
      const allocated = parseInt(item.quantity_allocated) || 0;
      const missing = Math.max(0, needed - allocated);
      
      row.push(needed, allocated, missing);
    }
    
    if (includeStatus) {
      row.push((item.status || 'Unknown').charAt(0).toUpperCase() + (item.status || 'unknown').slice(1));
    }
    
    if (includeDetails) {
      row.push(
        item.equipment_location || 'Not specified',
        item.equipment_category || 'Not specified'
      );
    }
    
    if (includeNotes) {
      row.push(item.notes || '');
    }
    
    showInfoData.push(row);
  });

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(showInfoData);
  
  // Set column widths
  const columnWidths = [
    { wch: 5 },  // #
    { wch: 20 }, // Type
    { wch: 15 }, // Brand
    { wch: 15 }, // Model
    { wch: 20 }, // Serial
  ];
  
  if (includeQuantities) {
    columnWidths.push({ wch: 12 }, { wch: 12 }, { wch: 10 }); // Quantities
  }
  
  if (includeStatus) {
    columnWidths.push({ wch: 12 }); // Status
  }
  
  if (includeDetails) {
    columnWidths.push({ wch: 15 }, { wch: 15 }); // Location, Category
  }
  
  if (includeNotes) {
    columnWidths.push({ wch: 30 }); // Notes
  }
  
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
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
 * Download Excel file
 */
export const downloadExcel = (workbook, filename) => {
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, filename);
};

/**
 * Generate filename for exports
 */
export const generateFilename = (show, format) => {
  const showName = (show.name || 'Show').replace(/[^a-zA-Z0-9]/g, '_');
  const date = show.date ? new Date(show.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  
  return `${showName}_Equipment_List_${date}_${timestamp}.${format}`;
};
