/**
 * cURL Command Examples
 *
 * Test API bằng cURL
 */

// ===================================================================
// 1. GET Schedule Stats
// ===================================================================

curl -X GET http://localhost:3000/api/schedule/stats

# Response:
# {
#   "total_schedules": 150,
#   "total_buildings": 3,
#   "total_rooms": 25
# }


// ===================================================================
// 2. Find Available Rooms - Thứ 3, tiết 4-6, tòa A1
// ===================================================================

curl -X GET "http://localhost:3000/api/rooms/available?thu=3&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=2"

# Response:
# {
#   "thu": 3,
#   "tiet": "4-6",
#   "building": "A1",
#   "rooms": [
#     {
#       "room": "301",
#       "continuous_slots": [4, 5]
#     },
#     {
#       "room": "302",
#       "continuous_slots": [4, 5, 6]
#     }
#   ]
# }


// ===================================================================
// 3. Find Available Rooms - Thứ 2, tiết 1-10, tòa B1, 3 tiết liên tục
// ===================================================================

curl -X GET "http://localhost:3000/api/rooms/available?thu=2&tiet_bd=1&tiet_kt=10&building=B1&min_continuous=3"


// ===================================================================
// 4. Upload Excel File
// ===================================================================

curl -X POST \
  http://localhost:3000/api/schedule/upload \
  -F "file=@/path/to/schedule.xlsx"

# Response:
# {
#   "success": true,
#   "message": "Schedule imported successfully",
#   "rows_imported": 150
# }


// ===================================================================
// 5. PowerShell Example - Upload Excel
// ===================================================================

$filePath = "C:\path\to\schedule.xlsx"
$fileContent = [System.IO.File]::ReadAllBytes($filePath)
$fileBytes = [System.IO.File]::ReadAllBytes($filePath)

$form = @{
  file = @{
    value = $fileBytes
    filename = "schedule.xlsx"
  }
}

Invoke-WebRequest -Uri "http://localhost:3000/api/schedule/upload" `
  -Method Post `
  -Form $form


// ===================================================================
// 6. JavaScript/Fetch Example
// ===================================================================

// Find available rooms
fetch('http://localhost:3000/api/rooms/available?thu=3&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=2')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// Upload Excel file
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

const formData = new FormData();
formData.append('file', file);

fetch('http://localhost:3000/api/schedule/upload', {
  method: 'POST',
  body: formData
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));


// ===================================================================
// 7. Python Example
// ===================================================================

import requests

# Find available rooms
url = 'http://localhost:3000/api/rooms/available'
params = {
    'thu': 3,
    'tiet_bd': 4,
    'tiet_kt': 6,
    'building': 'A1',
    'min_continuous': 2
}

response = requests.get(url, params=params)
print(response.json())

# Upload Excel file
with open('schedule.xlsx', 'rb') as f:
    files = {'file': f}
    response = requests.post('http://localhost:3000/api/schedule/upload', files=files)
    print(response.json())


// ===================================================================
// 8. Error Handling Examples
// ===================================================================

// Invalid query parameters
curl -X GET "http://localhost:3000/api/rooms/available?thu=10&tiet_bd=4&tiet_kt=6&building=A1&min_continuous=2"
# Response 400:
# {
#   "statusCode": 400,
#   "message": "thu must be between 2 and 7",
#   "error": "Bad Request"
# }

// Missing parameters
curl -X GET "http://localhost:3000/api/rooms/available?thu=3&tiet_bd=4"
# Response 400:
# {
#   "statusCode": 400,
#   "message": "Missing or invalid query parameters: thu, tiet_bd, tiet_kt, building, min_continuous",
#   "error": "Bad Request"
# }

// Invalid file format
curl -X POST \
  http://localhost:3000/api/schedule/upload \
  -F "file=@document.pdf"
# Response 400:
# {
#   "statusCode": 400,
#   "message": "Only Excel files are supported (.xlsx, .xls)",
#   "error": "Bad Request"
# }
