<div align="center">
  <img src="https://img.icons8.com/color/128/000000/combo-chart.png" alt="Logo" width="100"/>
  <h1>🎓 College Result Analyzer</h1>
  <p><i>An intelligent, real-time platform to analyze, visualize, and generate executive dossier reports (Excel, PDF & PowerPoint) for college academic results.</i></p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
  </p>
</div>

<br />

## 🌟 Overview

The **College Result Analyzer** is a full-stack web application designed to simplify the complex task of processing student academic results. It accepts raw result documents in **PDF (.pdf)**, **Excel (.xlsx, .xls)**, or **CSV (.csv)** formats, parses them securely in the backend using an intelligent pattern-recognition engine, and provides an interactive real-time dashboard filled with subject-wise analytics, academic toppers, and executive downloadable reports across **Excel**, **PDF**, and **PowerPoint (.pptx)** formats.

---

## 🚀 Key Features & Capabilities

- 📑 **Universal Multi-Format Support:** Seamlessly process PDF (.pdf), Excel (.xlsx, .xls), and CSV (.csv) result files.
- 🧠 **Smart Matrix Parsing Engine:** Automatically skips college title banners, detects USNs (`2KD23CS018`), extracts student names, and parses single-column or 4-column (`IN`, `EX`, `T`, `R`) mark layouts.
- 🎯 **Advanced Status Intelligence (Withheld & Absent):**
  - **Withheld (`WH` / `#7CBCE8`):** Accurately detects university withheld results (`W`, `WH`, `WITH HELD`), displays dedicated Sky Blue badge styling, preserves internal marks while keeping total/external cells blank, and excludes pure withheld students from backlog fail tallies (`-`).
  - **Absent (`AB` / `#C58CB5`):** Recognizes absent candidates across internal/external blocks with dedicated Muted Mauve styling and exclusion from pass-rate appeared denominator.
- 📡 **Real-Time Socket Synchronization:** Built with `Socket.IO` to broadcast upload and deletion events live. Results list and Admin Portal update instantly without needing a manual page refresh.
- 📊 **Interactive Subject Analytics Modal:** Click any subject card to inspect pass rate, fail rate, highest mark, average mean, full rankings, isolated failed candidates list, and a dedicated **Withheld Candidates** tab.
- 🏆 **Academic Toppers (Hall of Fame):** Identifies top batch performers and highlights `FCD`, `FC`, `SC`, and `Pass` classifications.
- 📄 **Executive Excel Dossier Export:** Download clean single-sheet Excel reports featuring stacked bar graphs under dedicated text headings, bold metric headers, Sky Blue `#7CBCE8` for Withheld cells, Muted Mauve `#C58CB5` for Absent blocks, non-bold numbers, and full candidate directories.
- 📄 **Executive PDF Dossier Export:** Programmatically generated multi-page vector PDF reports with accurate fail evaluation, subject statistics matrices, dark goldenrod (`#B8860B`) fail series, and signature endorsement blocks.
- 📽️ **Executive PowerPoint (.pptx) Export:** Generates standardized 5-slide departmental review presentations with dynamic title slides, clustered bar charts with exact decimal labels, class toppers, and subject breakdown tables with blank staff fields for manual faculty signature.
- 🛡️ **Secure Admin Portal:** Dedicated administrator management portal with persistent token storage and seamless SPA route refresh handling (`/admin`).

---

## 🛠️ Technology Stack & Role Overview

| Layer / Component | Technology | Role & Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React 19 & TypeScript | Component-based UI rendering, state management, and type safety. |
| **Build & Routing** | Vite 8 | Ultra-fast development server, SPA route rewriting, and bundling. |
| **Real-Time Sync** | Socket.IO Client / Server | Live event broadcasting for instant updates without page refreshes. |
| **Backend API** | Node.js & Express 5 | REST API endpoints, parsing execution, and export streaming. |
| **Database** | MongoDB & Mongoose 9 | Flexible NoSQL data storage for variable subject structures and student records. |
| **Excel Generator** | ExcelJS 4 | Programmatic Excel workbook creation, cell formatting, and image embedding. |
| **PDF Generator** | PDFKit 0.18 | Programmatic vector PDF creation, custom page breaks, and layout control. |
| **PowerPoint Generator** | PptxGenJS 3.12 | Programmatic presentation generation, clustered bar charts with decimal formatting, and table layout styling. |
| **Charts Engine** | Chart.js 4 & Lucide React | Visual charts, progress bars, and iconography across UI and export dossiers. |

---

## 📐 Evaluation & Score Classification Rules

The platform enforces standardized academic evaluation criteria:

### 1. Subject-Wise Passing Criteria & Absent Handling
- **Pass Threshold:** Minimum Total Marks $\ge 35$ (for 100-mark subjects) or $\ge 70$ (for 200-mark subjects / Internship).
- **Absent Candidates ($\text{AB}$ / $\text{A}$):** Absent candidates are considered **failed** and are included in both subject fail rate and overall fail percentage.
- **Withheld Candidates ($\text{W}$ / $\text{WH}$):** Withheld candidates are excluded from both Pass and Fail counts and excluded from the percentage denominator:
  $$\text{Evaluated Subject Candidates} = \text{Total Registered} - \text{Withheld Count}$$
  $$\text{Subject Fail Count} = \text{Exam Fail Count} + \text{Absent (AB) Count}$$
  $$\text{Subject Fail Percentage / Rate (\%)} = \frac{\text{Subject Fail Count (incl. AB)}}{\text{Evaluated Subject Candidates}} \times 100$$
  $$\text{Subject Passing Percentage (\%)} = \frac{\text{Subject Pass Count}}{\text{Evaluated Subject Candidates}} \times 100$$

### 2. Subject Score Classifications
| Category | 100-Mark Subject | 200-Mark Subject |
| :--- | :--- | :--- |
| **Distinction (FCD)** | $\text{Total} \ge 70$ | $\text{Total} \ge 140$ |
| **First Class (FC)** | $60 \le \text{Total} < 70$ | $120 \le \text{Total} < 140$ |
| **Second Class (SC)** | $50 \le \text{Total} < 60$ | $100 \le \text{Total} < 120$ |
| **Pass Class** | $35 \le \text{Total} < 50$ | $70 \le \text{Total} < 100$ |
| **Fail** | $\text{Total} < 35$ (or Absent $\text{AB}$) | $\text{Total} < 70$ (or Absent $\text{AB}$) |
| **Withheld** | University Withheld ($\text{WH}$) | University Withheld ($\text{WH}$) |

### 3. Overall Batch Classifications (Total Percentage)
- **First Class with Distinction (FCD):** $\ge 70.0\%$ and $\le 100.0\%$ (all subjects passed)
- **First Class (FC):** $60.0\% \le \text{Percentage} < 70.0\%$ (all subjects passed)
- **Second Class (SC):** $50.0\% \le \text{Percentage} < 60.0\%$ (all subjects passed)
- **Pass Class:** $35.0\% \le \text{Percentage} < 50.0\%$ (all subjects passed)
- **Fail:** Failed in $\ge 1$ subject or overall percentage $< 35.0\%$
- **Withheld:** Candidates with any withheld subject result are classified as `WITHHELD` (not counted in pass or fail counts).
- **Overall Passing Percentage:**
  $$\text{Overall Passing Percentage (\%)} = \frac{\text{Overall Pass Count}}{\text{Total Students} - \text{Withheld Students}} \times 100$$
  $$\text{Overall Fail Percentage (\%)} = \frac{\text{Overall Fail Count}}{\text{Total Students} - \text{Withheld Students}} \times 100$$

---

## ⚙️ Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/BasavarajKagale/CollegeResultAnalyzer.git
cd CollegeResultAnalyzer
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string_here
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
In a new terminal window:
```bash
cd ../frontend
npm install
npm run dev
```
Access the application at `http://localhost:5173`.

---

## ☁️ Deployment Guide (Render)

This project includes a root `render.yaml` Blueprint file for seamless automated deployment on [Render](https://render.com/).

### Deployment Steps:
1. Push your repository to GitHub.
2. Go to the [Render Dashboard](https://dashboard.render.com/) and select **New +** $\rightarrow$ **Blueprint**.
3. Connect your GitHub repository (`CollegeResultAnalyzer`).
4. Enter the `MONGODB_URI` environment variable when prompted.
5. Click **Apply**. Render will automatically build the static frontend and Node backend!

---

<div align="center">
  <i>Live Demo: <a href="https://collegeresultanalyzer-1.onrender.com/" target="_blank">https://collegeresultanalyzer-1.onrender.com/</a></i>
</div>
