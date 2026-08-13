<div align="center">
  <img src="https://img.icons8.com/color/128/000000/combo-chart.png" alt="Logo" width="100"/>
  <h1>🎓 College Result Analyzer</h1>
  <p><i>An intelligent, real-time platform to analyze, visualize, and generate executive dossier reports for college academic results.</i></p>

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

The **College Result Analyzer** is a full-stack web application designed to simplify the complex task of processing student academic results. It accepts raw result documents in **PDF (.pdf)**, **Excel (.xlsx, .xls)**, or **CSV (.csv)** formats, parses them securely in the backend using an intelligent pattern-recognition engine, and provides an interactive real-time dashboard filled with subject-wise analytics, academic toppers, and executive downloadable reports.

---

## 🚀 Key Features & Capabilities

- 📑 **Universal Multi-Format Support:** Seamlessly process PDF (.pdf), Excel (.xlsx, .xls), and CSV (.csv) result files.
- 🧠 **Smart Matrix Parsing Engine:** Automatically skips college title banners, detects USNs (`2KD23CS018`), extracts student names, and parses single-column or 4-column (`IN`, `EX`, `T`, `R`) mark layouts.
- 📡 **Real-Time Socket Synchronization:** Built with `Socket.IO` to broadcast upload and deletion events live. Results list and Admin Portal update instantly without needing a manual page refresh.
- 📊 **Interactive Subject Analytics Modal:** Click any subject card to inspect pass rate, fail rate, highest mark, average mean, full rankings, and isolated failed candidates list.
- 🏆 **Academic Toppers (Hall of Fame):** Identifies top batch performers and highlights `FCD`, `FC`, `SC`, and `Pass` classifications.
- 📄 **Executive Excel Dossier Export:** Download clean single-sheet Excel reports featuring stacked bar graphs under dedicated text headings, bold metric headers, non-bold numbers, and candidate directories (`TOTAL` $\rightarrow$ `PERCENTAGE` $\rightarrow$ `NO OF SUBJECTS FAILED` $\rightarrow$ `REMARK`).
- 📄 **Executive PDF Dossier Export:** Programmatically generated multi-page vector PDF reports with accurate fail evaluation and signature endorsement blocks.
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
| **Charts Engine** | QuickChart.io & Chart.js | Renders Chart.js configurations into PNG buffers with data labels. |

---

## 📐 Evaluation & Pass / Fail Rules

The platform strictly enforces standard university evaluation criteria:
- **Subject Passing Criteria:** Minimum Total $\ge 35$, External ($\text{EX}$) $\ge 18$ (when external exams are conducted), Internal ($\text{IN}$) $\ge 18$.
- **Absence ($\text{AB}$):** Any candidate marked $\text{AB}$ or $\text{ABSENT}$ is classified as **FAIL**.
- **Overall Batch Classification:**
  - $\ge 70\%$ $\rightarrow$ **FCD** (First Class with Distinction)
  - $\ge 60\%$ $\rightarrow$ **FC** (First Class)
  - $\ge 50\%$ $\rightarrow$ **SC** (Second Class)
  - $< 50\%$ $\rightarrow$ **Pass**

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
  <i>https://collegeresultanalyzer-1.onrender.com/</i>
</div>
