# ProjectHub — Full Project Documentation

**Hormuud University · Academic Project Management System**

| | |
|---|---|
| **Version** | 0.0.1 |
| **Project folder** | `C:\Users\25261\Downloads\Design ProjectHub UI_UX` |
| **Frontend URL** | http://localhost:5180/ |
| **API URL** | http://localhost:3004 |
| **Database** | SQL Server — `ProjectHub` on `AHMED666\TEW_SQLEXPRESS` |
| **Brand color** | `#168055` (Hormuud University green) |

> **Open in Microsoft Word:** File → Open → select this file (`PROJECT_DOCUMENTATION.md`), or copy/paste into a new Word document and Save As `.docx`.

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Requirements](#3-requirements)
4. [Installation & First Run](#4-installation--first-run)
5. [How to Start Every Time (CMD)](#5-how-to-start-every-time-cmd)
6. [URLs & Portals](#6-urls--portals)
7. [User Roles & Features](#7-user-roles--features)
8. [Authentication & Registration](#8-authentication--registration)
9. [Admin Guide](#9-admin-guide)
10. [Database](#10-database)
11. [Network Access (Other Computers)](#11-network-access-other-computers)
12. [Mobile & Phone](#12-mobile--phone)
13. [Desktop Application (PWA)](#13-desktop-application-pwa)
14. [Project Structure](#14-project-structure)
15. [Configuration (.env)](#15-configuration-env)
16. [NPM Scripts](#16-npm-scripts)
17. [Backup & Save](#17-backup--save)
18. [Troubleshooting](#18-troubleshooting)
19. [Security Notes](#19-security-notes)
20. [Related Files](#20-related-files)

---

## 1. Overview

**ProjectHub** is a full-stack web application for Hormuud University. It lets students propose academic projects, build teams by HU ID, collaborate via chat, and submit work to teachers. Teachers review submissions with AI assistance. Administrators manage users, approvals, and system health.

### Key capabilities

- HU ID authentication for students and teachers  
- Project proposals and teacher assignment  
- Team invites and project chat  
- Submission and approval workflow  
- AI-assisted review (Athena) and collision detection  
- Admin dashboard with live stats and user management  
- Responsive design (desktop, tablet, phone)  
- Installable as PWA / desktop app window  

### Technology stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS 4, Motion |
| Backend | Node.js, Express 4 |
| Database | Microsoft SQL Server (Express) |
| Auth | JWT (JSON Web Tokens), bcrypt passwords |
| UI icons | Lucide React |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser / Phone / Desktop App                              │
│  http://localhost:5180  (Vite + React)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ /api/* (proxy)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Express API — http://localhost:3004                        │
│  auth · projects · student · teacher · admin · messages     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  SQL Server — ProjectHub database                           │
│  AHMED666\TEW_SQLEXPRESS                                    │
└─────────────────────────────────────────────────────────────┘
```

All user data (accounts, projects, messages, submissions) is stored in **SQL Server**, not only in the browser.

---

## 3. Requirements

| Requirement | Details |
|-------------|---------|
| **OS** | Windows 10/11 |
| **Node.js** | Installed (`node` and `npm` in PATH) |
| **SQL Server** | SQL Server Express (local instance) |
| **Browser** | Chrome, Edge, or Firefox (latest) |
| **RAM** | 4 GB+ recommended |
| **Network** | Optional — for LAN access from other PCs/phones |

---

## 4. Installation & First Run

### First-time setup

1. Ensure **Node.js** and **SQL Server Express** are installed and running.  
2. Open the project folder:  
   `C:\Users\25261\Downloads\Design ProjectHub UI_UX`  
3. Double-click **`START.bat`**  
   - Installs npm dependencies  
   - Creates `ProjectHub` database and tables  
   - Seeds demo accounts  
   - Starts API + UI servers  
   - Opens browser  

### What START.bat does

1. `npm install` (root)  
2. `npm install` (server)  
3. `npm run setup:db` — create database and tables  
4. `npm run seed` — demo users and sample projects  
5. Starts API in a new CMD window  
6. Starts Vite dev server in a new CMD window  
7. Opens http://localhost:5180/  

---

## 5. How to Start Every Time (CMD)

### Option A — Full start (recommended)

Open **CMD** and run:

```cmd
cd /d "C:\Users\25261\Downloads\Design ProjectHub UI_UX"
START.bat
```

### Option B — Desktop app window

```cmd
cd /d "C:\Users\25261\Downloads\Design ProjectHub UI_UX"
LAUNCH_APP.bat
```

Opens ProjectHub in its own window (Edge/Chrome app mode).

### Option C — Fast daily start (servers only)

If database is already set up, open **two CMD windows**:

**Window 1 — API:**
```cmd
cd /d "C:\Users\25261\Downloads\Design ProjectHub UI_UX"
npm run start:server
```

**Window 2 — Frontend:**
```cmd
cd /d "C:\Users\25261\Downloads\Design ProjectHub UI_UX"
npm run dev
```

Then open: http://localhost:5180/

### Stop the project

Close both **ProjectHub API** and **ProjectHub UI** CMD windows, or press **Ctrl+C** in each.

---

## 6. URLs & Portals

| Page | URL |
|------|-----|
| **Homepage** | http://localhost:5180/ |
| **Student sign-in** | http://localhost:5180/student |
| **Teacher sign-in** | http://localhost:5180/teacher |
| **Register (student)** | http://localhost:5180/register?role=student |
| **Register (teacher)** | http://localhost:5180/register?role=teacher |
| **Admin sign-in** | http://localhost:5180/admin |
| **Admin dashboard** | http://localhost:5180/admin/overview |
| **All users (admin)** | http://localhost:5180/admin/users |
| **System health** | http://localhost:5180/admin/health |
| **API health check** | http://localhost:3004/api/health |

**Important:** Use port **5180** for the UI. Do **not** use 5173.

---

## 7. User Roles & Features

### Student

| Feature | Description |
|---------|-------------|
| Dashboard | Welcome, project progress, KPIs |
| My Projects | View and manage assigned projects |
| My Teacher | Connect with assigned teacher |
| My Team | Invite classmates by HU ID |
| My Progress | Scores and status |
| Feedback | Teacher feedback |
| Project Atlas | Browse project archive |
| Settings | Profile, password, photo |

**Mobile:** Bottom navigation — Home · Projects · Team · Atlas · Settings

### Teacher

| Feature | Description |
|---------|-------------|
| Dashboard | Overview and analytics |
| AI Review Queue | Pending submissions with AI suggestions |
| All Submissions | Full submission list |
| Collision Alerts | Similar project warnings |
| Students | Student/submission view |
| Analytics | Charts and stats |
| Project Atlas | Browse all projects |
| AI Tools | Quick actions panel |
| Settings | Account settings |

### Admin

| Feature | Description |
|---------|-------------|
| Admin Dashboard | Live users online, KPIs, charts, export |
| All Users | Search, approve, edit, delete users |
| System Health | API + SQL Server status |
| Batch AI Scanner | Bulk AI analysis |
| All Submissions | Full project access |
| Pending accounts | Approve/reject registrations |

---

## 8. Authentication & Registration

### Sign-in rules

| Role | Login fields |
|------|--------------|
| **Student** | HU ID + email + password |
| **Teacher** | HU ID + email + password |
| **Admin** | Email + password only (no HU ID) |

### University ID format

- Format: `HU000` + digits in groups of 4  
- Examples: `HU000-1234` or `HU000-1234-5678`

### Registration flow

1. User registers at `/register?role=student` or `teacher`  
2. Account status = **pending**  
3. Admin approves in Admin Dashboard or All Users  
4. User can then sign in  

### Demo accounts (after seed)

Password for all demo accounts: **`ProjectHub123!`**

| Role | HU ID | Email |
|------|-------|-------|
| Admin | HU0009000 | admin@hu.edu |
| Teacher | HU000-5001 | swilliams@hu.edu |
| Teacher (AI) | HU000-5003 | ai.teacher@hu.edu |
| Student | HU000-1001 | alex.chen@hu.edu |

> Demo credentials are **not** shown on the public UI (by design).

---

## 9. Admin Guide

### Admin login

| Field | Value |
|-------|-------|
| URL | http://localhost:5180/admin |
| Email | admin@hu.edu |
| Password | ProjectHub123! |

See also: `ADMIN_ACCESS.txt`

### Common admin tasks

1. **Approve new users** — Admin Dashboard → Pending Accounts, or All Users → filter pending  
2. **Reject registration** — Removes pending account permanently  
3. **Edit user** — Change HU ID or reset password in All Users  
4. **Delete user** — Removes user and related data  
5. **Export report** — Admin Dashboard → Export Excel/PDF  
6. **Monitor system** — System Health page + SQL Server  

---

## 10. Database

### Connection

| Setting | Value |
|---------|-------|
| Server | `AHMED666\TEW_SQLEXPRESS` |
| Database | `ProjectHub` |
| Auth | Windows Authentication (default) |

Configured in `.env` (see `.env.example`).

### Main tables

| Table | Stores |
|-------|--------|
| `Users` | Accounts (student, teacher, admin) |
| `Projects` | Project proposals and assignments |
| `ProjectMembers` | Team membership |
| `ProjectInvitations` | Team invite requests |
| `Submissions` | Submitted project work |
| `Messages` | Chat messages |
| `Notifications` | User alerts |
| `AIAnalyses` | AI review results |
| `Settings` | App/university settings |

### View data in SQL Server Management Studio (SSMS)

1. Connect to `AHMED666\TEW_SQLEXPRESS`  
2. Expand **Databases → ProjectHub → Tables**  
3. Right-click table → **Select Top 1000 Rows**

Example query:

```sql
USE ProjectHub;
SELECT UserId, UniversityId, Email, FirstName, LastName, Role, AccountStatus
FROM Users ORDER BY CreatedAt DESC;
```

---

## 11. Network Access (Other Computers)

Other PCs/phones on the **same Wi‑Fi** can use ProjectHub if your server PC is running.

1. Run `START.bat` on your PC  
2. Find your IP: CMD → `ipconfig` → IPv4 Address (e.g. `192.168.1.105`)  
3. On other device: `http://192.168.1.105:5180/`  
4. Allow Windows Firewall for ports **5180** and **3004** if prompted  

See: `NETWORK_ACCESS.txt`

**Not available:** Public internet access without cloud hosting.

---

## 12. Mobile & Phone

The frontend is **responsive** — works on phones and tablets.

### Preview on PC (phone mode)

1. Open http://localhost:5180/  
2. Press **F12**  
3. Click **phone/tablet icon** (or **Ctrl+Shift+M**)  
4. Select **iPhone 14** or **Samsung Galaxy**  
5. Press **F5** to refresh  

### Real phone (same Wi‑Fi)

Open `http://YOUR_PC_IP:5180/` on the phone browser.

### Install on phone

- **iPhone:** Safari → Share → Add to Home Screen  
- **Android:** Chrome → Install app / Add to Home screen  

See: `MOBILE_PHONE.txt`

---

## 13. Desktop Application (PWA)

| Method | File / Action |
|--------|----------------|
| App window | `LAUNCH_APP.bat` |
| Install banner | Green “Install ProjectHub” on homepage (Chrome/Edge) |
| Desktop shortcut | `ProjectHub.lnk` on Desktop (if created) |

See: `APP_GUIDE.txt`

---

## 14. Project Structure

```
Design ProjectHub UI_UX/
├── START.bat              ← Start everything (main)
├── LAUNCH_APP.bat         ← Start + desktop app window
├── PROJECT_DOCUMENTATION.md  ← This file
├── ADMIN_ACCESS.txt       ← Admin credentials (private)
├── ACCESS.txt             ← Quick access reference
├── APP_GUIDE.txt          ← PWA / app install guide
├── NETWORK_ACCESS.txt     ← LAN access guide
├── MOBILE_PHONE.txt       ← Mobile preview guide
├── .env                   ← Database & server config (local)
├── .env.example           ← Config template
├── index.html             ← HTML entry
├── vite.config.ts         ← Vite + PWA config (port 5180)
├── package.json           ← Frontend scripts
├── public/                ← Static assets, PWA icons
├── server/                ← Express API
│   ├── package.json
│   └── src/
│       ├── index.js       ← API entry (port 3004)
│       ├── db.js          ← SQL Server connection
│       ├── setupDatabase.js
│       ├── seed.js        ← Demo data
│       └── routes/        ← API routes
└── src/
    ├── main.tsx           ← React entry
    └── app/
        ├── App.tsx        ← Routing
        ├── AppShell.tsx   ← Logged-in layout
        ├── api/client.ts  ← Frontend API calls
        ├── pages/         ← Page components
        ├── components/    ← UI components
        ├── config/        ← Branding, images
        └── styles/        ← CSS (welcome, app-shell)
```

---

## 15. Configuration (.env)

Copy `.env.example` to `.env` and edit if needed:

```env
DB_SERVER=AHMED666\TEW_SQLEXPRESS
DB_DATABASE=ProjectHub
DB_USE_WINDOWS_AUTH=true
PORT=3004
CLIENT_URL=http://localhost:5180
JWT_SECRET=change-this-to-a-long-random-secret-key
JWT_EXPIRES_IN=7d
```

| Variable | Purpose |
|----------|---------|
| `DB_SERVER` | SQL Server instance name |
| `DB_DATABASE` | Database name |
| `DB_USE_WINDOWS_AUTH` | `true` = Windows login to SQL |
| `PORT` | API port (must match Vite proxy: 3004) |
| `CLIENT_URL` | Frontend URL for CORS |
| `JWT_SECRET` | Token signing secret |

---

## 16. NPM Scripts

### Root (frontend)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start frontend dev server (5180) |
| `npm run build` | Production build → `dist/` |
| `npm run start:server` | Start API |
| `npm run setup:db` | Create database and tables |
| `npm run seed` | Seed demo users and projects |
| `npm run export:db` | Export database |

### Server folder

| Command | Purpose |
|---------|---------|
| `npm run start` | Run API |
| `npm run dev` | API with auto-reload |
| `npm run seed` | Seed data |

---

## 17. Backup & Save

| Script | Purpose |
|--------|---------|
| `SAVE_EVERYTHING.bat` | Full backup (code + dist + database + config) |
| `SAVE.bat` | Quick code backup |

Backups folder (if configured):  
`C:\Users\25261\Downloads\ProjectHub-Backups\`

---

## 18. Troubleshooting

| Problem | Solution |
|---------|----------|
| Blank white page | Check browser console (F12). Restart START.bat. |
| Cannot connect | Ensure API + UI CMD windows are open. |
| Login fails | Check credentials. Admin uses email only. |
| Pending approval | Admin must approve account first. |
| Port 5173 | Wrong port — use **5180**. |
| Database failed | Check SQL Server is running. Verify `DB_SERVER` in `.env`. |
| Other PC can't connect | Same Wi‑Fi, firewall allows 5180/3004, use PC IP not localhost. |
| API health fails | Open http://localhost:3004/api/health — read error message. |

---

## 19. Security Notes

- Change **admin password** before sharing on a network  
- Do **not** publish `ADMIN_ACCESS.txt` publicly  
- Admin portal is not linked prominently on homepage (direct URL only)  
- JWT tokens stored in browser `localStorage`  
- SQL Server should stay **local** — only the API connects to it  
- For production/internet: use HTTPS, strong secrets, and university IT support  

---

## 20. Related Files

| File | Contents |
|------|----------|
| `PROJECT_DOCUMENTATION.md` | This full documentation |
| `ACCESS.txt` | Quick URLs and logins |
| `ADMIN_ACCESS.txt` | Admin URL and password |
| `APP_GUIDE.txt` | Install as desktop/mobile app |
| `NETWORK_ACCESS.txt` | LAN / other computers |
| `MOBILE_PHONE.txt` | Phone preview and access |
| `.env.example` | Environment template |

---

## Quick Reference Card

```
START:     cd /d "C:\Users\25261\Downloads\Design ProjectHub UI_UX" && START.bat
URL:       http://localhost:5180/
ADMIN:     http://localhost:5180/admin  |  admin@hu.edu  |  ProjectHub123!
STUDENT:   http://localhost:5180/student
TEACHER:   http://localhost:5180/teacher
API:       http://localhost:3004/api/health
DATABASE:  ProjectHub on AHMED666\TEW_SQLEXPRESS
```

---

*Document generated for ProjectHub — Hormuud University. English only.*
