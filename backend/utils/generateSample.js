const xlsx = require('xlsx');
const fs = require('fs');

const data = [
    { Name: 'John Doe', USN: '1MS20IS001', Mathematics: 85, Physics: 78, Chemistry: 92 },
    { Name: 'Jane Smith', USN: '1MS20IS002', Mathematics: 95, Physics: 88, Chemistry: 96 },
    { Name: 'Bob Johnson', USN: '1MS20IS003', Mathematics: 35, Physics: 45, Chemistry: 50 },
    { Name: 'Alice Williams', USN: '1MS20IS004', Mathematics: 70, Physics: 65, Chemistry: 80 },
    { Name: 'Charlie Brown', USN: '1MS20IS005', Mathematics: 92, Physics: 94, Chemistry: 89 }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Results');

xlsx.writeFile(wb, 'sample_results.xlsx');
console.log('Sample file created.');
