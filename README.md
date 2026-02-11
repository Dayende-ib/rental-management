# 🏠 Rental Management System

A comprehensive solution for managing rental properties, tenants, contracts, and maintenance requests. This system consists of a backend API, a web administrative dashboard, and a mobile application for tenants.

## 📂 Project Structure

The project is organized into three main components:

- **[Backend](./backend/README.md)**: REST API built with Node.js, Express, and Supabase. Handles authentication, data persistence, and business logic.
- **[Web App](./web/README.md)**: Administrative dashboard for property managers and staff. Built with React and Vite.
- **[Mobile App](./mobile/README.md)**: Mobile application for tenants to view properties, pay rent, and request maintenance. Built with Flutter.

## 🚀 Key Features

- **Role-Based Access Control**:
  - **Admin/Manager/Staff**: Full access via the Web Dashboard.
  - **Tenants**: Limited access to their own data via the Mobile App.
  - **Public/Guest**: View available properties.
- **Property Management**: Track properties, availability, and details.
- **Tenant Management**: Manage tenant profiles and history.
- **Contract Management**: Digital contract creation, negotiation, and signing.
- **Financials**: Rent payment tracking, graphical dashboards (Web), and payment proofs (Mobile).
- **Maintenance**: Issue reporting and tracking workflow.

## 🛠️ Technology Stack

- **Backend**: Node.js, Express, Supabase (PostgreSQL + Auth + Storage).
- **Web**: React.js, Vite, TailwindCSS, Axios.
- **Mobile**: Flutter, Riverpod, Http.

## 🏁 Getting Started

To get the entire system running locally, you need to set up each component independently. Please refer to the specific README files for detailed instructions:

1. **Setup Backend**: Follow instructions in [backend/README.md](./backend/README.md).
2. **Setup Web**: Follow instructions in [web/README.md](./web/README.md).
3. **Setup Mobile**: Follow instructions in [mobile/README.md](./mobile/README.md).

## 📄 License

This project is licensed under the MIT License.
