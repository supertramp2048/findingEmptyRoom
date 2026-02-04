/**
 * Sample Excel Data Structure
 *
 * Để test với file Excel mẫu, tạo file Excel với cấu trúc như sau:
 *
 * | Mã HP    | Lớp      | Phòng | Thứ | Tiết  | Môn Học         | Giảng Viên      |
 * |----------|----------|-------|-----|-------|-----------------|-----------------|
 * | CS101    | CQ17-01  | A1-301| 2   | 4->6  | Lập Trình Cơ Bản| TS. Nguyễn A    |
 * | CS101    | CQ17-01  | A1-302| 3   | 7->9  | Lập Trình Cơ Bản| TS. Nguyễn A    |
 * | MATH202  | DQ18-02  | A2-201| 2   | 1->3  | Toán Cao Cấp II | PGS. Trần B     |
 * | ENG301   | AQ19-03  | B1-101| 4   | 4->6  | Tiếng Anh 3     | Ths. Lê C       |
 * | PHYS101  | CQ17-02  | A1-303| 5   | 7->8  | Vật Lý Đại Cương| PGS. Phạm D     |
 *
 *
 * Hoặc format khác (cũng được support):
 *
 * | Mã Học Phần | Lớp học Phần | Room Name | Day of Week | Lesson | Subject       |
 * |-------------|--------------|-----------|-------------|--------|---------------|
 * | CS101       | CQ17-01      | 301       | 2           | 4-6    | Programming   |
 * | CS102       | CQ17-02      | 302A      | 3           | 7-9    | Web Dev       |
 *
 * Hoặc:
 *
 * | Ma HP | Lop | Phong | T2 | T3 | T4 | T5 | T6 | T7 |
 * |-------|-----|-------|----|----|----|----|----|-----|
 * |CS101  |CQ17 | 301   |4->6|    |7->9|    |    |     |
 * |CS102  |CQ17 | 302   |    |    |1->3|    |4->6|     |
 *
 * ===================================================================
 *
 * Key Points:
 * 1. Header row phải chứa từ khóa: "mã", "lớp", "phòng", "thứ", "tiết"
 * 2. Tiết có thể ở format: "4->6", "4-6", "4:6", hoặc chỉ "4"
 * 3. Thứ có thể ở format: 2, 3, 4, 5, 6, 7 hoặc "Thứ 2", "Monday", "Mon"
 * 4. Phòng có thể ở format: "301", "301A", "A1-301"
 * 5. Parser sẽ tự động detect tòa nhà từ phòng (nếu có)
 */

// ===================================================================
// Sample Data sau khi parse (được lưu vào database)
// ===================================================================

[
  {
    thu: 2,
    tiet_bat_dau: 4,
    tiet_ket_thuc: 6,
    room: "301",
    ma_hp: "CS101",
    lop: "CQ17-01",
    mon_hoc: "Lập Trình Cơ Bản",
    giang_vien: "TS. Nguyễn A",
    building: "A1"
  },
  {
    thu: 3,
    tiet_bat_dau: 7,
    tiet_ket_thuc: 9,
    room: "302",
    ma_hp: "CS101",
    lop: "CQ17-01",
    mon_hoc: "Lập Trình Cơ Bản",
    giang_vien: "TS. Nguyễn A",
    building: "A1"
  },
  {
    thu: 2,
    tiet_bat_dau: 1,
    tiet_ket_thuc: 3,
    room: "201",
    ma_hp: "MATH202",
    lop: "DQ18-02",
    mon_hoc: "Toán Cao Cấp II",
    giang_vien: "PGS. Trần B",
    building: "A2"
  },
  {
    thu: 4,
    tiet_bat_dau: 4,
    tiet_ket_thuc: 6,
    room: "101",
    ma_hp: "ENG301",
    lop: "AQ19-03",
    mon_hoc: "Tiếng Anh 3",
    giang_vien: "Ths. Lê C",
    building: "B1"
  },
  {
    thu: 5,
    tiet_bat_dau: 7,
    tiet_ket_thuc: 8,
    room: "303",
    ma_hp: "PHYS101",
    lop: "CQ17-02",
    mon_hoc: "Vật Lý Đại Cương",
    giang_vien: "PGS. Phạm D",
    building: "A1"
  }
]

// ===================================================================
// Query Example & Expected Result
// ===================================================================

// Query: Thứ 3 (Tuesday), tiết 1-10, tòa A1, 2 tiết trống liên tục
GET /api/rooms/available?thu=3&tiet_bd=1&tiet_kt=10&building=A1&min_continuous=2

// Response:
{
  "thu": 3,
  "tiet": "1-10",
  "building": "A1",
  "rooms": [
    {
      "room": "301",
      "continuous_slots": [1, 2, 3, 4, 5, 6, 8, 9, 10] // Tiết 7 bận (CS101 7->9)
    },
    {
      "room": "302",
      "continuous_slots": [1, 2, 3, 4, 5, 6, 8, 9, 10]
    },
    {
      "room": "303",
      "continuous_slots": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] // Toàn bộ trống
    }
  ]
}

// Giải thích:
// - Room 301 & 302: Tiết 7-9 bận (CS101 cQ17-01)
// - Room 303: Toàn bộ trống (không có schedule thứ 3)
// - continuous_slots: Danh sách tiết bắt đầu của chuỗi N tiết trống liên tục
//   (N = min_continuous = 2)
