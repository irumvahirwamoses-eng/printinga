import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { generateTempPassword } from '../utils/generateTempPassword';
import { maskNationalId } from '../utils/maskNationalId';
import ExcelJS from 'exceljs';
import { parse as csvParse } from 'csv-parse/sync';

export interface TeacherInput {
  fullName: string;
  nationalId: string;
  email?: string;
  phone?: string;
  department?: string;
}

export async function createTeacher(input: TeacherInput) {
  const existing = await User.findOne({ nationalId: input.nationalId });
  if (existing) throw new AppError('National ID already registered', 409);
  const tempPassword = generateTempPassword();
  const teacher = await User.create({
    ...input,
    role: 'TEACHER',
    password: tempPassword,
    isFirstLogin: true,
    isActive: true,
  });
  return { teacher, tempPassword };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listTeachers(query: { search?: string; department?: string; isActive?: string; page?: number; limit?: number }) {
  const filter: any = { role: 'TEACHER' };
  if (query.search) {
    const safe = escapeRegex(String(query.search).slice(0, 100));
    filter.$or = [
      { fullName: { $regex: safe, $options: 'i' } },
      { nationalId: { $regex: safe, $options: 'i' } },
      { department: { $regex: safe, $options: 'i' } },
    ];
  }
  if (query.department) filter.department = query.department;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  return {
    items: items.map((u) => ({
      id: u._id.toString(),
      nationalIdMasked: maskNationalId(u.nationalId),
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      department: u.department,
      isActive: u.isActive,
      isFirstLogin: u.isFirstLogin,
      createdAt: u.createdAt,
    })),
    total,
    page,
    limit,
  };
}

export async function getTeacher(id: string) {
  const user = await User.findOne({ _id: id, role: 'TEACHER' });
  if (!user) throw new AppError('Teacher not found', 404);
  return {
    id: user._id.toString(),
    nationalIdMasked: maskNationalId(user.nationalId),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    department: user.department,
    isActive: user.isActive,
    isFirstLogin: user.isFirstLogin,
    createdAt: user.createdAt,
  };
}

export async function updateTeacher(id: string, data: Partial<TeacherInput>) {
  const user = await User.findOne({ _id: id, role: 'TEACHER' });
  if (!user) throw new AppError('Teacher not found', 404);
  // Whitelist editable fields. Never allow role, nationalId, password, etc.
  const editable: (keyof TeacherInput)[] = ['fullName', 'email', 'phone', 'department'];
  for (const key of editable) {
    if (data[key] !== undefined) (user as any)[key] = data[key];
  }
  // save() runs schema validators and the bcrypt pre-save hook.
  await user.save();
  return user;
}

export async function setTeacherStatus(id: string, isActive: boolean) {
  if (typeof isActive !== 'boolean') throw new AppError('isActive must be a boolean', 400);
  const user = await User.findOne({ _id: id, role: 'TEACHER' });
  if (!user) throw new AppError('Teacher not found', 404);
  user.isActive = isActive;
  await user.save();
  return user;
}

export async function resetTeacherPassword(id: string) {
  const user = await User.findOne({ _id: id, role: 'TEACHER' }).select('+password +refreshTokens');
  if (!user) throw new AppError('Teacher not found', 404);
  const tempPassword = generateTempPassword();
  user.password = tempPassword;
  user.isFirstLogin = true;
  user.refreshTokens = [];
  await user.save();
  return { tempPassword };
}

function normalizeRow(row: Record<string, any>): TeacherInput & { _row: number } {
  const pick = (keys: string[]) => {
    for (const k of keys) {
      const found = Object.keys(row).find((rk) => rk.toLowerCase().replace(/[\s_]/g, '') === k.toLowerCase().replace(/[\s_]/g, ''));
      if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') return String(row[found]).trim();
    }
    return '';
  };
  return {
    fullName: pick(['Full Name', 'FullName', 'Name']),
    nationalId: pick(['National ID', 'NationalID', 'NationalId', 'ID']),
    email: pick(['Email', 'Email Address']) || undefined,
    phone: pick(['Phone', 'Phone Number', 'PhoneNumber']) || undefined,
    department: pick(['Department']) || undefined,
    _row: 0,
  };
}

function cellValue(value: unknown): unknown {
  if (value == null) return '';
  if (typeof value !== 'object') return value;
  // ExcelJS represents formulas/hyperlinks/rich text as cell objects.
  const cell = value as { result?: unknown; text?: string; richText?: { text: string }[] };
  if (cell.result !== undefined && cell.result !== null) return cell.result;
  if (cell.text !== undefined) return cell.text;
  if (Array.isArray(cell.richText)) return cell.richText.map((t) => t.text).join('');
  return '';
}

async function readXlsx(buffer: Buffer): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs' bundled types use the pre-generic @types/node Buffer signature.
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const headers: string[] = [];
  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, rowNumber) => {
    const values = row.values as unknown[];
    if (rowNumber === 1) {
      for (let i = 1; i < values.length; i++) headers.push(String(cellValue(values[i]) ?? '').trim());
      return;
    }
    const record: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      if (header) record[header] = cellValue(values[i + 1]);
    });
    rows.push(record);
  });
  return rows;
}

export async function parseImportFile(buffer: Buffer, filename: string): Promise<any[]> {
  if (filename.toLowerCase().endsWith('.csv')) {
    return csvParse(buffer, { columns: true, skip_empty_lines: true, trim: true });
  }
  return readXlsx(buffer);
}

export async function previewBulkImport(buffer: Buffer, filename: string) {
  const rows = await parseImportFile(buffer, filename);
  const normalized = rows.map((r, i) => ({ ...normalizeRow(r as any), _row: i + 2 }));
  const seen = new Set<string>();
  const existingIds = new Set((await User.find({ nationalId: { $in: normalized.map((r) => r.nationalId).filter(Boolean) } }).select('nationalId')).map((u) => u.nationalId));
  const preview = normalized.map((r) => {
    const errors: string[] = [];
    if (!r.fullName) errors.push('Missing full name');
    if (!r.nationalId) errors.push('Missing national ID');
    else if (!/^\d{16}$/.test(r.nationalId)) errors.push('National ID must be 16 digits');
    if (r.nationalId && seen.has(r.nationalId)) errors.push('Duplicate in file');
    if (r.nationalId && existingIds.has(r.nationalId)) errors.push('Already exists');
    if (r.nationalId) seen.add(r.nationalId);
    return { ...r, valid: errors.length === 0, errors };
  });
  return {
    total: preview.length,
    validCount: preview.filter((p) => p.valid).length,
    invalidCount: preview.filter((p) => !p.valid).length,
    rows: preview,
  };
}

export async function confirmBulkImport(buffer: Buffer, filename: string) {
  const preview = await previewBulkImport(buffer, filename);
  const valid = preview.rows.filter((r) => r.valid);
  const results: { nationalIdMasked: string; fullName: string; tempPassword: string }[] = [];
  for (const row of valid) {
    try {
      const tempPassword = generateTempPassword();
      await User.create({
        fullName: row.fullName,
        nationalId: row.nationalId,
        email: row.email,
        phone: row.phone,
        department: row.department,
        role: 'TEACHER',
        password: tempPassword,
        isFirstLogin: true,
      });
      results.push({ nationalIdMasked: maskNationalId(row.nationalId), fullName: row.fullName, tempPassword });
    } catch {
      // skip duplicates from race
    }
  }
  return {
    imported: results.length,
    failed: preview.invalidCount + (valid.length - results.length),
    total: preview.total,
    credentials: results,
    invalidRows: preview.rows.filter((r) => !r.valid).map((r) => ({ row: r._row, nationalId: r.nationalId ? maskNationalId(r.nationalId) : '', fullName: r.fullName, errors: r.errors })),
  };
}
