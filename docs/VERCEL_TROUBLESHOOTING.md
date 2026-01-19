# 🔧 Troubleshooting Vercel Deployment - Error 404

Panduan mengatasi error **404: NOT_FOUND** saat deploy frontend React ke Vercel.

---

## 📋 Daftar Isi

1. [Penyebab Error 404](#-penyebab-error-404)
2. [Solusi 1: Konfigurasi Root Directory](#-solusi-1-konfigurasi-root-directory)
3. [Solusi 2: Vercel.json Configuration](#-solusi-2-verceljson-configuration)
4. [Solusi 3: Build Settings](#-solusi-3-build-settings)
5. [Solusi 4: Environment Variables](#-solusi-4-environment-variables)
6. [Cara Redeploy](#-cara-redeploy)
7. [Verifikasi Deployment](#-verifikasi-deployment)

---

## ❌ Penyebab Error 404

Error `404: NOT_FOUND` di Vercel biasanya disebabkan oleh:

| Penyebab | Deskripsi |
|----------|-----------|
| **Root Directory salah** | Vercel tidak bisa menemukan folder `frontend` |
| **Build output salah** | Output build tidak di folder `dist` |
| **vercel.json missing** | File routing config tidak ada |
| **Framework tidak terdeteksi** | Vercel tidak mengenali Vite |

---

## ✅ Solusi 1: Konfigurasi Root Directory

**Ini adalah penyebab paling umum!**

### Langkah-langkah:

1. Buka **Vercel Dashboard** → pilih project Anda
2. Klik tab **"Settings"**
3. Di sidebar, klik **"General"**
4. Scroll ke bagian **"Root Directory"**
5. **Ubah dari kosong menjadi**: `frontend`

```
Root Directory: frontend
```

6. Klik **"Save"**

![Root Directory Setting](https://vercel.com/docs/concepts/deployments/configure-a-build)

### Setelah mengubah Root Directory:

- Klik tab **"Deployments"**
- Klik **"..."** pada deployment terakhir
- Pilih **"Redeploy"**

---

## ✅ Solusi 2: Vercel.json Configuration

Pastikan file `vercel.json` ada di folder `frontend/`:

### Lokasi File:
```
frontend/
├── src/
├── index.html
├── package.json
├── vite.config.js
└── vercel.json     ← File ini WAJIB ada!
```

### Isi vercel.json:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Penjelasan:
- **rewrites**: Mengarahkan semua route ke `index.html`
- Ini WAJIB untuk React Router (Single Page Application)
- Tanpa ini, refresh halaman `/report` akan 404

---

## ✅ Solusi 3: Build Settings

Pastikan build settings di Vercel sudah benar:

### Di Vercel Dashboard:

1. Buka **Settings** → **General**
2. Scroll ke **Build & Development Settings**
3. Pastikan konfigurasi berikut:

| Setting | Value |
|---------|-------|
| **Framework Preset** | `Vite` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### Override Settings (jika perlu):

Jika Vercel tidak auto-detect Vite, klik **"Override"** dan isi manual:

```
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

---

## ✅ Solusi 4: Environment Variables

Pastikan environment variable untuk API URL sudah diset:

### Di Vercel Dashboard:

1. Buka **Settings** → **Environment Variables**
2. Tambahkan variable berikut:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_API_URL` | `https://your-backend.railway.app/api` | Production, Preview, Development |

### ⚠️ PENTING:
- Prefix `VITE_` **WAJIB** untuk Vite
- Tanpa prefix ini, variable tidak bisa diakses di frontend
- Ganti `your-backend.railway.app` dengan URL backend Railway Anda

### Contoh benar:
```
VITE_API_URL=https://iot-desalinasi-production.up.railway.app/api
```

### Contoh salah:
```
API_URL=https://...   ← Tidak ada VITE_ prefix!
```

---

## 🔄 Cara Redeploy

Setelah mengubah settings, Anda HARUS redeploy:

### Metode 1: Redeploy dari Dashboard

1. Buka **Vercel Dashboard** → Project Anda
2. Klik tab **"Deployments"**
3. Cari deployment terbaru
4. Klik tombol **"..."** (tiga titik)
5. Pilih **"Redeploy"**
6. Centang **"Use existing Build Cache"** = **OFF** (uncheck)
7. Klik **"Redeploy"**

### Metode 2: Push ke GitHub

Cukup push commit baru ke repository:

```bash
git add .
git commit -m "fix: vercel deployment config"
git push origin main
```

Vercel akan auto-deploy.

---

## ✅ Verifikasi Deployment

### 1. Cek Build Logs

1. Di **Deployments** tab, klik deployment terbaru
2. Klik **"Building"** atau **"Ready"** untuk lihat logs
3. Pastikan tidak ada error merah

### Log yang diharapkan:
```
Cloning github.com/username/iot-desalinasi...
Detected Framework: Vite
Running "npm install"
Running "npm run build"
Build completed successfully
```

### 2. Cek Output

Setelah deploy sukses, buka URL Vercel:
- `https://your-project.vercel.app` → Harus tampil Dashboard
- `https://your-project.vercel.app/report` → Harus tampil Report page

### 3. Cek Console Browser

1. Buka website di browser
2. Tekan **F12** → tab **Console**
3. Lihat apakah ada error (warna merah)

---

## 🛠️ Checklist Deployment Vercel

Gunakan checklist ini sebelum deploy:

- [ ] `frontend/vercel.json` ada dan isinya benar
- [ ] Root Directory di Vercel = `frontend`
- [ ] Framework Preset = `Vite`
- [ ] Build Command = `npm run build`
- [ ] Output Directory = `dist`
- [ ] Environment Variable `VITE_API_URL` sudah diset
- [ ] Sudah redeploy setelah ubah settings

---

## 📊 Struktur Project yang Benar

Pastikan struktur repository GitHub Anda seperti ini:

```
iot-desalinasi/              ← Repository root
├── backend/
│   ├── src/
│   ├── package.json
│   └── ...
├── frontend/                ← ROOT DIRECTORY di Vercel
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   └── ...
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json          ← WAJIB ADA!
├── esp32/
└── docs/
```

---

## 🆘 Masih Error? Coba Ini

### 1. Clear Build Cache

1. Settings → General → scroll ke bawah
2. Klik **"Clear Build Cache and Redeploy"**

### 2. Delete dan Re-import Project

1. Settings → Advanced → **"Delete Project"**
2. Add New Project → Import ulang dari GitHub
3. Set Root Directory = `frontend`
4. Deploy ulang

### 3. Cek File index.html

Pastikan `frontend/index.html` ada dan valid:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>IoT Desalinasi</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### 4. Cek vite.config.js

Pastikan tidak ada base path yang salah:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // JANGAN set base kecuali deploy ke subfolder
  // base: '/subfolder/',  ← Jangan ada ini!
})
```

---

## 📞 Informasi Error untuk Support

Jika masih error, catat informasi berikut untuk troubleshooting:

```
Error Code: NOT_FOUND
Error ID: [dari screenshot]
Deployment URL: [URL Vercel Anda]
Root Directory: [setting di Vercel]
Build Log: [screenshot atau paste log]
```

---

## ✅ Sukses!

Jika semua langkah sudah diikuti, website Anda seharusnya:

1. **Halaman utama** → `https://your-project.vercel.app` → Dashboard tampil
2. **Halaman report** → `https://your-project.vercel.app/report` → Report tampil
3. **Refresh halaman** → Tidak error 404
4. **Data realtime** → Terhubung ke backend Railway

---

**Selamat! Frontend Anda sudah online! 🎉**
