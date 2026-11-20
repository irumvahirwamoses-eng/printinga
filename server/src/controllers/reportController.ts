import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { AuthRequest } from '../types';
import { PrintRequest } from '../models/PrintRequest';
import { PrintJob } from '../models/PrintJob';
import { User } from '../models/User';
import ExcelJS from 'exceljs';

// Prevent spreadsheet formula injection from user-controlled fields.
function csvSafe(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

const REPORT_HEADERS = ['RequestNumber', 'Title', 'Teacher', 'Department', 'Status', 'Priority', 'Pages', 'Copies', 'Type', 'CreatedAt'];

function headersFor(rows: Record<string, unknown>[]): string[] {
  const keys = Object.keys(rows[0] || {});
  return keys.length ? keys : REPORT_HEADERS;
}

function toCsv(rows: Record<string, unknown>[]): string {
  const headers = headersFor(rows);
  const escape = (value: unknown) => {
    if (value == null) return '';
    const str = value instanceof Date ? value.toISOString() : String(value);
    return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))].join('\r\n');
}

function dateFilter(query: any) {
  const filter: any = {};
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }
  return filter;
}

export const overview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const filter = dateFilter(req.query);
  const [totalTeachers, totalRequests, byStatus, totals, failedJobs] = await Promise.all([
    User.countDocuments({ role: 'TEACHER' }),
    PrintRequest.countDocuments(filter),
    PrintRequest.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    PrintRequest.aggregate([{ $match: { ...filter, status: { $in: ['PRINTED', 'READY_FOR_COLLECTION', 'COLLECTED'] } } }, { $group: { _id: null, pages: { $sum: '$numberOfPages' }, copies: { $sum: '$numberOfCopies' } } }]),
    PrintJob.countDocuments({ outcome: 'FAILED', ...dateFilter(req.query) }),
  ]);
  const statusMap: Record<string, number> = {};
  byStatus.forEach((s: any) => { statusMap[s._id] = s.count; });
  res.json(ok({
    totalTeachers,
    totalRequests,
    statusBreakdown: statusMap,
    totalPagesPrinted: totals[0]?.pages || 0,
    totalCopiesPrinted: totals[0]?.copies || 0,
    failedPrintingOperations: failedJobs,
  }));
});

export const printing = asyncHandler(async (req: AuthRequest, res: Response) => {
  const filter = dateFilter(req.query);
  const [daily, monthly, completion] = await Promise.all([
    PrintRequest.aggregate([
      { $match: filter },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    PrintRequest.aggregate([
      { $match: filter },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    PrintRequest.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $in: ['$status', ['PRINTED', 'READY_FOR_COLLECTION', 'COLLECTED']] }, 1, 0] } } } },
    ]),
  ]);
  const collectedVsUncollected = await PrintRequest.aggregate([
    { $match: { ...filter, status: { $in: ['READY_FOR_COLLECTION', 'COLLECTED'] } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  res.json(ok({
    dailyActivity: daily.map((d: any) => ({ date: d._id, count: d.count })),
    monthlyActivity: monthly.map((m: any) => ({ month: m._id, count: m.count })),
    completionRate: completion[0] ? (completion[0].total ? (completion[0].completed / completion[0].total) * 100 : 0) : 0,
    collectedVsUncollected,
  }));
});

export const teachers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const filter = dateFilter(req.query);
  const mostActive = await PrintRequest.aggregate([
    { $match: filter },
    { $group: { _id: '$teacherId', count: { $sum: 1 }, pages: { $sum: '$numberOfPages' }, copies: { $sum: '$numberOfCopies' } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'teacher' } },
    { $unwind: '$teacher' },
    { $project: { count: 1, pages: 1, copies: 1, 'teacher.fullName': 1, 'teacher.department': 1 } },
  ]);
  res.json(ok({ mostActiveTeachers: mostActive }));
});

export const exportReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const filter = dateFilter(req.query);
  const requests = await PrintRequest.find(filter).populate('teacherId', 'fullName department').lean();
  const rows = requests.map((r: any) => ({
    RequestNumber: csvSafe(r.requestNumber),
    Title: csvSafe(r.title),
    Teacher: csvSafe(r.teacherId?.fullName || ''),
    Department: csvSafe(r.teacherId?.department || ''),
    Status: csvSafe(r.status),
    Priority: csvSafe(r.priority),
    Pages: r.numberOfPages,
    Copies: r.numberOfCopies,
    Type: csvSafe(r.printingType),
    CreatedAt: r.createdAt,
  }));
  const format = (req.query.format as string) || 'csv';
  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Report');
    sheet.columns = headersFor(rows as Record<string, unknown>[]).map((header) => ({ header, key: header, width: 22 }));
    rows.forEach((row) => sheet.addRow(row as Record<string, unknown>));
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
    return;
  }
  res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
  res.setHeader('Content-Type', 'text/csv');
  res.send(toCsv(rows as Record<string, unknown>[]));
});
