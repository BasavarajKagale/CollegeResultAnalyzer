const xlsx = require('xlsx');

const subjects = ['BCS401', 'BCS402', 'BCS403', 'BCSL404', 'BBOC407', 'BUHK408', 'BNSK459', 'BCS405A', 'BCS456C'];

const collegeHeaders = [
    ['KLE Society\'s'],
    ['KLE College of Engineering and Technology,Chikodi-591201'],
    ['Department of Computer Science and Engineering'],
    ['4th Sem Result sheet 2025-2026 [Before Revaluation.]'],
    ['Results Annouced Date : 24-07-2026'],
    []
];

const sampleStudents = [
    { name: 'Kumar Mallesh Shrikhande', usn: '2KD23CS037' },
    { name: 'Abhishek Kumar Jha', usn: '2KD24CS001' },
    { name: 'Abhishek B Dille', usn: '2KD24CS002' },
    { name: 'Aman Mudhol', usn: '2KD24CS003' },
    { name: 'Aishwarya R Pujari', usn: '2KD24CS004' },
    { name: 'Akash L Badiger', usn: '2KD24CS005' },
    { name: 'Akash Badradhar', usn: '2KD24CS006' },
    { name: 'Akash Ramesh Kar', usn: '2KD24CS007' },
    { name: 'Aliya M Mulla', usn: '2KD24CS008' },
    { name: 'Ama A Halappanavar', usn: '2KD24CS009' },
    { name: 'Balaji P Khot', usn: '2KD24CS020' },
    { name: 'Basavaraj Kagale', usn: '2KD24CS021' }
];

// Row 1: Headers
const row1 = ['Sl. No', 'Std. Name', 'USN'];
subjects.forEach(sub => {
    row1.push(sub, '', '', '');
});

// Row 2: Subheaders
const row2 = ['', '', ''];
subjects.forEach(() => {
    row2.push('IN', 'EX', 'T', 'R');
});

const matrix = [...collegeHeaders, row1, row2];

sampleStudents.forEach((st, idx) => {
    const row = [idx + 1, st.name, st.usn];
    subjects.forEach((sub, subIdx) => {
        let internal = 35 + (idx % 12);
        let external = (idx === 9 && sub === 'BCS404') || (idx === 10 && sub === 'BCS401') ? 12 : 25 + ((idx * 3 + subIdx * 5) % 25);
        let total = internal + external;
        let res = total >= 35 ? 'P' : 'F';
        if (idx === 10 && sub === 'BCS405A') res = 'A';
        row.push(internal, external, total, res);
    });
    matrix.push(row);
});

const ws = xlsx.utils.aoa_to_sheet(matrix);

// Apply column widths
ws['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 15 }];
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Result_Sheet');

xlsx.writeFile(wb, 'sample_results.xlsx');
console.log('Pic 5 Sample Excel file created successfully as sample_results.xlsx.');
