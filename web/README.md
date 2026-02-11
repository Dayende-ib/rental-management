# 🖥️ Rental Management Web Dashboard

A powerful React-based Single Page Application (SPA) for property managers and administrators to oversee the rental business.

## 🛠 Features

- **Authenticated Dashboard**: Secure login for Admin/Manager roles.
- **Tenant Overview**: Manage tenant profiles, view contracts, and payment history.
- **Property Management**: Create, update, and list rental properties. Upload photos.
- **Contract Administration**: View contract details, status, and associated payments.
- **Financial Tracking**: Monitor rent collection status, validate payments, and view revenue stats.
- **Maintenance Tracking**: Manage maintenance requests and assign tasks.
- **Responsive Design**: Optimized for desktop and tablet use with **TailwindCSS**.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Backend API Running (default: `http://localhost:5000`)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd rental-management/web
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Variables**:
    Create `.env` (optional, defaults are usually fine for dev):
    ```ini
    VITE_API_URL=http://localhost:5000/api
    ```

4.  **Start Development Server**:
    ```bash
    npm run dev
    # Functions on http://localhost:5173
    ```

## 🏗️ Project Structure

```
web/
├── public/                 # Static Assets
├── src/
│   ├── assets/             # Images, Global Styles
│   ├── components/         # Reusable Components (Button, Card, Layout)
│   ├── context/            # Global State (AuthContext, ThemeContext)
│   ├── layouts/            # Page Layouts (MainLayout, AuthLayout)
│   ├── pages/              # Main Route Components
│   │   ├── Dashboard.jsx
│   │   ├── Properties.jsx
│   │   ├── Tenants.jsx
│   │   ├── Contracts.jsx
│   │   ├── Payments.jsx
│   │   └── Login.jsx
│   ├── services/           # API Service Integration (Axios)
│   ├── App.jsx             # Main App Component
│   ├── main.jsx            # Entry Point
│   └── index.css           # Global Styles / Tailwind Imports
├── index.html              # HTML Entry Point
├── tailwind.config.js      # Tailwind Configuration
└── vite.config.js          # Vite Configuration
```

## 📡 API Integration

The application communicates with the backend via `src/services/api.js`.
- **Axios Interceptor**: Automatically attaches the JWT token from `localStorage` to all authenticated requests.
- **Route Prefixing**: Requests to `/web/*` endpoints are automatically handled.

## 📦 Build for Production

To build the optimized static assets for deployment:

```bash
npm run build
```

The output will be in the `dist/` directory, ready to be served by Nginx, Apache, or Vercel/Netlify.

