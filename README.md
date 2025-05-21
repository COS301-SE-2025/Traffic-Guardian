
# 🚦 Traffic Guardian Frontend

This guide outlines how to set up and run the Traffic Guardian's current React frontend locally.

---

## 📦 Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
- Git (for cloning the repository)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-team/traffic-guardian.git
cd traffic-guardian
````

### 2. Install Dependencies

Using npm:

```bash
npm install
```

Or with Yarn:

```bash
yarn
```

---

## 🖥️ Running the App Locally

### Start the Development Server

```bash
npm run dev
```

Or:

```bash
yarn dev
```

The app will be available at:

```
http://localhost:5173
```

> If you're using Vite (which is recommended), it will hot reload on file changes.

---

## 📁 Project Structure

```
src/
├── assets/               # Static assets (images, icons, etc.)
├── components/           # Reusable components (e.g., NavBar)
├── pages/                # Individual page components (Dashboard, Account, etc.)
├── App.tsx               # Root component
├── main.tsx              # Entry point
├── App.css               # Global styles
└── index.html            # HTML template
```

---

## 🔁 Routing

The app uses **React Router** for navigation.

| Path         | Page Component |
| ------------ | -------------- |
| `/`          | Dashboard      |
| `/dashboard` | Dashboard      |
| `/live-feed` | Live Feed      |
| `/incidents` | Incidents      |
| `/account`   | Login Page     |
| `/signup`    | Sign-Up Page   |

---
## 🧰 Scripts

| Script            | Purpose                  |
| ----------------- | ------------------------ |
| `npm run dev`     | Run local dev server     |
| `npm run build`   | Create production build  |
| `npm run preview` | Preview production build |

---
```
