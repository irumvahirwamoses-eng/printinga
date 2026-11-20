import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { parseImportFile } from '../src/services/teacherService';

describe('parseImportFile', () => {
  it('parses CSV files with a header row', async () => {
    const csv = 'Full Name,National ID,Department\nJane Doe,1234567890123456,Mathematics\n';
    const rows = await parseImportFile(Buffer.from(csv), 'teachers.csv');
    expect(rows).toHaveLength(1);
    expect(rows[0]['Full Name']).toBe('Jane Doe');
    expect(rows[0]['National ID']).toBe('1234567890123456');
  });

  it('parses XLSX workbooks using the first sheet header row', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Teachers');
    sheet.columns = [
      { header: 'Full Name', key: 'name', width: 24 },
      { header: 'National ID', key: 'nationalId', width: 24 },
    ];
    sheet.addRow({ name: 'John Smith', nationalId: '6543210987654321' });
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const rows = await parseImportFile(buffer, 'teachers.xlsx');
    expect(rows).toHaveLength(1);
    expect(rows[0]['Full Name']).toBe('John Smith');
    expect(rows[0]['National ID']).toBe('6543210987654321');
  });
});
