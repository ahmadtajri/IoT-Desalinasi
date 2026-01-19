# IoT Desalinasi Monitoring System

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![Node](https://img.shields.io/badge/node-v14+-green.svg)
![React](https://img.shields.io/badge/react-v18+-blue.svg)
![ESP32](https://img.shields.io/badge/hardware-ESP32-orange.svg)

Web-based monitoring system for desalination process, featuring real-time data visualization, background data logging, and comprehensive reporting. Visualize data from ESP32 sensors (DHT22 & DS18B20) across 6 compartments.

---

## 🚀 Key Features

*   **Real-time Monitoring**: Live updates of Air Temperature, Humidity, and Water Temperature.
*   **Background Logging**: Server-side data logging that continues even when the browser is closed.
*   **Multi-Compartment Support**: Simultaneous monitoring of up to 6 distinct compartments.
*   **Historical Reports**: View, filter, and export sensor data to CSV.
*   **Hardware Integration**: Direct integration with ESP32 microcontrollers via REST API.
*   **Dual Mode**:
    *   **Production**: Persist data to MySQL database.
    *   **Development**: Auto-fallback to Mock Data when database is unavailable.

---

## 📁 Project Structure

```bash
iot-desalinasi/
├── backend/            # Node.js Express API & Logic
├── frontend/           # React + Vite Dashboard UI
├── docs/               # Documentation & Guides
│   ├── backend/        # API Documentation
│   ├── esp32/          # Wiring & Arduino Code
│   └── postman/        # API Testing Collection
└── esp32/              # Arduino .ino Source Code
```

---

## 🛠️ Tech Stack

*   **Frontend**: React, Vite, Tailwind CSS, Recharts (for graphs)
*   **Backend**: Node.js, Express.js, Sequelize ORM
*   **Database**: MySQL (Production) / In-Memory (Dev/Mock)
*   **Hardware**: ESP32 Dev Board, DHT22, DS18B20

---

## ⚡ Quick Start

### 1. Prerequisites
*   Node.js & npm
*   MySQL Server (e.g., XAMPP)
*   Arduino IDE (for hardware setup)

### 2. Setup Backend

```bash
cd backend
npm install
npm run dev
```
*Server will start at `http://localhost:3000`*

**Note:** If MySQL is not running, the server will automatically start in **Mock Data Mode**.

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```
*App will open at `http://localhost:5173`*

### 4. Setup Database (Optional for Mock Mode)
1.  Open MySQL/phpMyAdmin.
2.  Create database: `iot_desalinasi`.
3.  Import schema from `backend/database/database_setup.sql`.

---

## 📡 Hardware Setup (ESP32)

1.  Connect **DHT22** (Pin 4) and **DS18B20** (Pin 5) to **ESP32**.
2.  Open `esp32/ESP32_Combined_Sensors.ino`.
3.  Update WiFi & Server IP configuration.
4.  Upload to ESP32.

*Full guide available in [docs/esp32/ESP32_DOCUMENTATION.md](docs/esp32/ESP32_DOCUMENTATION.md)*

---

## 📚 Documentation

Detailed documentation is available in the `docs/` folder:

*   📖 **[Project Overview](docs/PROJECT_DOCUMENTATION.md)** - Complete system architecture.
*   🚀 **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Step-by-step to Railway & Vercel.
*   🗄️ **[Railway Database](docs/RAILWAY_DATABASE_STRUCTURE.md)** - Database setup for production.
*   ⚙️ **[ESP32 Production](docs/ESP32_PRODUCTION_CONFIG.md)** - Config ESP32 for HTTPS/Production.
*   🔌 **[Backend & API](docs/backend/BACKEND_DOCUMENTATION.md)** - API endpoints and logic.
*   📡 **[ESP32 Hardware Guide](docs/esp32/ESP32_DOCUMENTATION.md)** - Wiring and code setup.
*   🧪 **[Postman Guide](docs/postman/POSTMAN_GUIDE.md)** - API testing guide.

---

## 🐜 License

This project is open source.
