<div align="center">
  <img src="https://img.icons8.com/color/128/000000/combo-chart.png" alt="Logo" width="100"/>
  <h1>🎓 College Result Analyzer</h1>
  <p><i>An intelligent platform to analyze, visualize, and generate comprehensive reports for college academic results.</i></p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  </p>
</div>

<br />

## 🌟 Overview

The **College Result Analyzer** is a full-stack web application designed to simplify the complex task of processing student results. It accepts raw result documents in **PDF (.pdf)**, **Excel (.xlsx, .xls)**, or **CSV (.csv)** formats, parses them securely in the backend using an intelligent pattern-recognition engine, and provides an interactive dashboard filled with insightful metrics, subject-wise performance analytics, and academic toppers.

## 🚀 Features

- 📑 **Universal Multi-Format Support:** Seamlessly process PDF (.pdf), Excel (.xlsx, .xls), and CSV (.csv) result files.
- 🧠 **Smart Header & USN Detection:** Automatically skips top title banners/subheaders, merges multiline subheaders, and extracts USNs (e.g. `2KD23CS018`) and student names using intelligent regex pattern recognition.
- 📊 **Interactive Dashboards:** Visualize pass/fail percentages, batch summaries, and overall academic health using interactive charts.
- 🏆 **Toppers List:** Automatically identifies and ranks top-performing students in the batch.
- 📄 **Export Reports:** Generate and download comprehensive reports in both **Excel (.xlsx)** and **PDF** formats with a single click.
- 📈 **Detailed Candidate Records:** View subject-wise marks and status for every individual candidate in an easy-to-read tabular format.
- 🎨 **Modern UI:** Built with Vite and React for a lightning-fast, premium user experience.

## 🛠️ Technology Stack

| Frontend                | Backend                           | Database      |
|-------------------------|-----------------------------------|---------------|
| React 19                | Node.js                           | MongoDB       |
| Vite                    | Express.js                        | Mongoose      |
| Chart.js & React-Chartjs| Universal Parsing (XLSX, pdf-parse)|              |
| Lucide React (Icons)    | PDFKit (PDF Generation)           |               |
| Typescript              | Multer (File Uploads)             |               |

## ⚙️ Getting Started (Local Development)

### Prerequisites
- Node.js (v16 or higher)
- MongoDB URI (Local or Atlas)

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
- Create a `.env` file in the `backend` directory and add your MongoDB connection string:
  ```env
  PORT=5000
  MONGODB_URI=your_mongodb_connection_string_here
  ```
- Start the backend server:
  ```bash
  npm run dev
  ```

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

The application will now be running at `http://localhost:5173`.

## ☁️ Deployment (Render)

This project is fully configured for automated deployment on [Render](https://render.com/). A `render.yaml` Blueprint file is included at the root of the project to deploy both the frontend (Static Site) and backend (Web Service) simultaneously.

### Steps to Deploy on Render:
1. Push your code to your GitHub repository.
2. Log in to [Render dashboard](https://dashboard.render.com/).
3. Click on **New +** and select **Blueprint**.
4. Connect this GitHub repository.
5. Render will automatically detect the `render.yaml` file.
6. Provide the `MONGODB_URI` environment variable when prompted in the Render dashboard.
7. Click **Apply**! Your app will build and go live.

---
<div align="center">
  <i>Developed with ❤️ for educators and academic institutions.</i>
</div>

<div align="center">
  <b>https://collegeresultanalyzer-1.onrender.com</b>
</div>

