# Full-Stack POS System - Frontend

This repository contains the frontend for a modern, multi-tenant Point of Sale (POS) system. It is a responsive single-page application (SPA) built with **React** and **Ant Design**, providing the user interface for all system features.

---

### **Backend Repository**
The backend for this project is in a separate repository:  
**[POS Backend Repository](https://github.com/Ubaidhullah/pos-backend)**

---

## App Preview

### Dashboard & Features
| POS Dashboard | Product List |
|---------------|-------------|
| <img width="600" src="https://github.com/user-attachments/assets/7b1a30e5-8cc6-4655-bcb3-12d9f4ce39d4" alt="POS Dashboard" /> | <img width="600" src="https://github.com/user-attachments/assets/48c06de9-003b-412a-a751-830aa1411b7d" alt="Product List" /> |

| Inventory Management | Purchase Orders |
|--------------------|----------------|
| <img width="600" src="https://github.com/user-attachments/assets/49c8f86f-ebfa-47a8-8963-edd0488fc231" alt="Inventory Management" /> | <img width="600" src="https://github.com/user-attachments/assets/0bcf55e1-6e19-46a4-8d25-c514e5d87f6b" alt="Purchase Orders" /> |



---

## Features

- **Responsive UI:** Works on desktops, tablets, and mobile devices.  
- **Component-Based:** Built with React and Ant Design.  
- **Data-Driven:** Fetches data dynamically from a GraphQL backend using Apollo Client.  
- **Real-time Functionality:** Uses GraphQL subscriptions for live updates.  
- **Secure:** Token-based authentication and role-based access control.  
- **Feature-Rich:** POS interface, multi-tab sales, inventory & product management, purchase orders, quotations, reporting, user management, and administrative settings.

---

## Technology Stack

- **Framework:** React  
- **Build Tool:** Vite  
- **Language:** TypeScript  
- **UI Library:** Ant Design  
- **Data & State Management:** Apollo Client for GraphQL  
- **Routing:** React Router  

---

## Getting Started

### Prerequisites

- Node.js (v20.x or higher recommended)  
- Git  

### Installation & Setup

1. **Clone the repository:**
    ```bash
    git clone https://github.com/Ubaidhullah/pos-frontend.git
    cd pos-frontend
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Setup Environment Variables:**
    Create a `.env` file in the root directory:
    ```
    VITE_GRAPHQL_ENDPOINT=http://localhost:3000/graphql
    ```

4. **Run the application:**
    ```bash
    npm run dev
    ```
    The frontend will run at `http://localhost:5173` (or another available port).

---

## License

This project is open-source. Feel free to use and modify it according to your needs.
