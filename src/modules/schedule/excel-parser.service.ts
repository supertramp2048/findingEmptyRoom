import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ParsedScheduleRow {
    thu: number;
    tietBatDau: number;
    tietKetThuc: number;
    room: string;
    building: string;
    maHp: string;
    lop: string;
    monHoc?: string;
    giangVien?: string;
    ngayBatDau?: Date;
    ngayKetThuc?: Date;
}

@Injectable()
export class ExcelParserService {

    private readonly logger = new Logger(ExcelParserService.name);

    // ================= PUBLIC =================

    parseExcelFile(buffer: Buffer): ParsedScheduleRow[] {

        try {

            const workbook = XLSX.read(buffer, { type: 'buffer' });

            const results: ParsedScheduleRow[] = [];

            for (const sheetName of workbook.SheetNames) {

                const sheet = workbook.Sheets[sheetName];

                const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
                    header: 1,
                    defval: null,
                });

                if (!rows.length) continue;

                this.logger.log(`Sheet ${sheetName}: ${rows.length} rows`);

                results.push(...this.parseRowsFromMatrix(rows));
            }

            return results;

        } catch (e) {

            this.logger.error(e);

            throw new BadRequestException('Failed to parse Excel file');
        }
    }

    // ================= CORE =================

    private parseRowsFromMatrix(rows: any[][]): ParsedScheduleRow[] {

        const results: ParsedScheduleRow[] = [];

        // ===== Header luôn ở dòng 3 (file TKB chuẩn) =====
        const headerIdx = 3;

        if (!rows[headerIdx]) {
            throw new Error('Invalid Excel format');
        }

        // ===== Map cứng theo format file =====
        const idxMaHp  = 1;
        const idxLop   = 4;
        const idxThu   = 8;
        const idxTiet  = 9;
        const idxPhong = 10;
        const idxBD    = 11;
        const idxKT    = 12;
        const idxGV    = 13;

        // ===== State cho merge cell =====
        let currentMaHp = '';
        let currentMonHoc = '';
        let currentGiangVien = '';
        let currentNgayBD: Date | undefined;
        let currentNgayKT: Date | undefined;

        let skipCount = 0;

        // ===== Parse từng dòng =====
        for (let i = headerIdx + 1; i < rows.length; i++) {

            try {

                const r = rows[i];

                if (this.isEmptyRow(r)) continue;

                const thuRaw   = r[idxThu];
                const tietRaw  = r[idxTiet];
                const phongRaw = r[idxPhong];
                const maHpRaw  = r[idxMaHp];
                const lopRaw   = r[idxLop];
                const gvRaw    = r[idxGV];
                const bdRaw    = r[idxBD];
                const ktRaw    = r[idxKT];

                // ===== Merge cell handling =====

                if (maHpRaw) {
                    currentMaHp = String(maHpRaw).trim();
                }

                // Fallback lấy mã từ tên môn
                if (!currentMaHp && lopRaw) {
                    const m = String(lopRaw).match(/\(([A-Z0-9]+)\)/i);
                    if (m) currentMaHp = m[1];
                }

                if (lopRaw) currentMonHoc = String(lopRaw).trim();
                if (gvRaw) currentGiangVien = String(gvRaw).trim();
                if (bdRaw) currentNgayBD = this.parseDate(bdRaw);
                if (ktRaw) currentNgayKT = this.parseDate(ktRaw);

                // ===== Parse =====

                const thu = this.parseThu(thuRaw);
                const { tietBatDau, tietKetThuc } = this.parseTiet(tietRaw);

                // Skip dòng layout
                if (!thuRaw && !tietRaw && !phongRaw) continue;

                // Validate
                if (
                    thu === -1 ||
                    tietBatDau === -1 ||
                    !phongRaw ||
                    !currentMaHp
                ) {
                    skipCount++;
                    continue;
                }

                const { building, room } =
                    this.parseRoom(String(phongRaw));

                results.push({
                    thu,
                    tietBatDau,
                    tietKetThuc,
                    building,
                    room,
                    maHp: currentMaHp,
                    lop: currentMaHp,
                    monHoc: currentMonHoc,
                    giangVien: currentGiangVien,
                    ngayBatDau: currentNgayBD,
                    ngayKetThuc: currentNgayKT,
                });

            } catch (err: any) {

                skipCount++;

                this.logger.warn(
                    `[EXCEL][SKIP ROW ${i}] ${err.message}`,
                );
            }
        }

        this.logger.log(
            `Parse done: OK=${results.length}, SKIP=${skipCount}`
        );

        return results;
    }


    // ================= HELPERS =================

    private parseThu(v: any): number {

        if (typeof v === 'number' && v >= 2 && v <= 7) return v;

        const s = String(v || '').trim();

        if (/^[2-7]$/.test(s)) return Number(s);

        const norm = s
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .toLowerCase();

        const m = norm.match(/thu\s*(\d)/);

        if (m && Number(m[1]) >= 2 && Number(m[1]) <= 7) {
            return Number(m[1]);
        }

        return -1;
    }

    private parseTiet(v: any) {

        if (!v) {
            return { tietBatDau: -1, tietKetThuc: -1 };
        }

        let s = String(v).trim();

        s = s
            .replace(/->/g, '-')
            .replace(/→/g, '-')
            .replace(/–/g, '-')
            .replace(/\s+/g, '');

        const [a, b] = s.split('-').map(Number);

        if (!a || isNaN(a)) {
            return { tietBatDau: -1, tietKetThuc: -1 };
        }

        return {
            tietBatDau: a,
            tietKetThuc: b && !isNaN(b) ? b : a,
        };
    }

    private parseRoom(raw: string): { room: string; building: string } {

        let value = String(raw ?? '').trim();

        if (!value) {
            throw new Error('Phòng trống');
        }

        value = value
            .replace(/_/g, '-')
            .replace(/[>→\s]+/g, '')
            .toUpperCase();

        if (value.startsWith('LMS')) {
            return { room: 'ONLINE', building: 'ONLINE' };
        }

        if (value.startsWith('SAN') || value.startsWith('SÂN')) {
            return { room: 'SAN', building: 'SPORT' };
        }

        if (/^[A-Z0-9]{2,10}$/.test(value)) {
            return { room: 'CHUA XAC DINH', building: value };
        }

        const parts = value.split('-');

        if (parts.length === 2) {
            return {
                room: parts[0],
                building: parts[1],
            };
        }

        throw new Error(`Sai format phòng: ${raw}`);
    }

    private isEmptyRow(row: any[]): boolean {

        return !row || row.every(
            c => c === null ||
                 c === undefined ||
                 String(c).trim() === ''
        );
    }

    private parseDate(v: any): Date | undefined {

        if (typeof v === 'number') {
            return new Date(
                Math.round((v - 25569) * 86400 * 1000)
            );
        }

        if (typeof v === 'string' && v.includes('/')) {

            const [d, m, y] = v.split('/');

            return new Date(`20${y}-${m}-${d}`);
        }

        return undefined;
    }
}
