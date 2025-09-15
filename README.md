# Full-Stack POS System - Frontend

This repository contains the frontend for a modern, multi-tenant Point of Sale (POS) system. It is a responsive single-page application (SPA) built with React and Ant Design, providing the user interface for all system features.

### **Backend Repository**
The backend for this project is in a separate repository. You can find it here:
**[https://github.com/Ubaidhullah/pos-backend](https://github.com/Ubaidhullah/pos-backend)**

---

## App Preview

![App Preview GIF](https://your-gif-url-here.gif)

---

## Features

- **Responsive UI:** Adapts to desktops, tablets, and mobile devices.
- **Component-Based:** Built with React and a professional Ant Design component library.
- **Data-Driven:** All data is fetched dynamically from a GraphQL backend using Apollo Client.
- **Real-time Functionality:** Uses GraphQL Subscriptions for live updates on pages like the Delivery Dashboard.
- **Secure:** Implements token-based authentication and role-based access control to hide/show features.
- **Feature-Rich:** Includes UIs for the POS interface, multi-tab sales, inventory and product management, purchase orders, quotations, reporting, user management, and all administrative settings.

## Technology Stack

- **Framework:** React
- **Build Tool:** Vite
- **Language:** TypeScript
- **UI Library:** Ant Design
- **Data & State Management:** Apollo Client for GraphQL
- **Routing:** React Router

## Getting Started

### Prerequisites

- Node.js (v20.x or higher recommended)
- Git

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/Ubaidhullah/pos-frontend.git](https://github.com/Ubaidhullah/pos-frontend.git)
    cd pos-frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Setup Environment Variables:**
    Create a `.env` file in the root of the project. You need to specify the URL of the running backend API:
    ```
    VITE_GRAPHQL_ENDPOINT=http://localhost:3000/graphql
    ```

4.  **Run the application:**
    ```bash
    npm run dev
    ```
    The frontend will be running at `http://localhost:5173` (or another available port).
