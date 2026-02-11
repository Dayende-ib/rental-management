# 🌐 Rental Management Backend (Node.js + Supabase)

Robust REST API supporting the rental management ecosystem. Handles authentication, database interactions, and business logic for both the Web Dashboard and the Mobile Application.

## 🛠 Features

- **Authentication**: JWT-based authentication using **Supabase**.
- **Role-Based Access Control**: Middleware ensures `admin`, `manager`, `staff` (Web) and `tenant` (Mobile) roles are strictly enforced.
- **Route Separation**: distinct API endpoints for Web (`/api/web`) and Mobile (`/api/mobile`) to cater to specific needs.
- **Contract Management**: Tenant-initiated contract requests and approvals (`draft` -> `active`).
- **Data Integrity**: **PostgreSQL** schema with relational integrity and views for dashboards.
- **Storage**: Image and document upload to Supabase Storage.
- **Documentation**: Swagger UI documentation available at `/api-docs`.

## 📂 Project Structure

```
backend/
├── src/
│   ├── config/             # Supabase & Env Config
│   ├── controllers/        # Business Logic (property, tenant, contract, etc.)
│   ├── middlewares/        # Auth, Role Checks, Validation
│   ├── routes/             # API Route Definitions
│   │   ├── mobile/         # Mobile-specific Routes
│   │   ├── web/            # Web-specific Routes
│   │   └── ...             # Shared Routes
│   └── app.js              # Express App Setup
├── fix_permissions.sql     # SQL Script to fix table permissions
├── fix_policies.sql        # SQL Script to fix RLS policies
├── schema.sql              # Database Schema Definition
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Supabase Project (Database, Auth, Storage)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd rental-management/backend
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Variables**:
    Create a `.env` file based on `.env.example`:
    ```ini
    PORT=5000
    SUPABASE_URL=your_supabase_url
    SUPABASE_ANON_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (optional, for admin tasks)
    JWT_SECRET=your_jwt_secret (from Supabase Auth Settings)
    ```

4.  **Database Setup**:
    - Run the `schema.sql` script in your Supabase SQL Editor to create tables and views.
    - Run `fix_policies.sql` to setup Row Level Security (RLS) policies.
    - Run `fix_permissions.sql` if you encounter permission issues.

5.  **Start the Server**:
    ```bash
    npm run dev
    # Functions on http://localhost:5000
    ```

## 📡 API Documentation

### Base URL: `http://localhost:5000`

### Authentication (`/api/auth`)
- `POST /register`: Register a new user (tenant).
- `POST /login`: Generate JWT token.

### Web Resources (`/api/web`) - Requires `staff` role
- `GET /properties`: List all properties.
- `POST /properties`: Create property.
- `GET /contracts`: View all contracts.
- `GET /tenants`: Manage tenants.
- `GET /dashboard/stats`: Admin dashboard statistics.

### Mobile Resources (`/api/mobile`) - Requires `tenant` role
- `GET /me`: Get current tenant profile.
- `GET /properties`: View available properties.
- `POST /contracts`: Request to rent a property.
- `POST /contracts/:id/accept`: Accept/Sign a contract.
- `POST /contracts/:id/reject`: Reject a contract.
- `GET /payments`: View payment history.
- `POST /payments/:id/proof`: Upload proof of payment.
- `POST /maintenance`: Report maintenance issue.

## 🐳 Docker Deployment

Build and run the container:

```bash
docker build -t backend-app .
docker run -p 5000:5000 --env-file .env --name backend-app backend-app
```

Or using Docker Compose:
```bash
docker compose up --build
```

## 📝 Database Schema

Key entities:
- **Profiles**: Extended user profiles tied to Auth.
- **Properties**: Flats/Houses with details, status, photos.
- **Tenants**: Detailed tenant info (employment, identity).
- **Contracts**: Lease agreements linking Property and Tenant.
- **Payments**: Rent transactions and status.
- **MaintenanceRequests**: Issues reported by tenants.

---
**Note**: Ensure your Supabase RLS policies are active to secure data access directly at the database level.
