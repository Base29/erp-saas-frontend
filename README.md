# 🚀 Genie Cloud ERP - Multi-Tenant SaaS Frontend

A modern, high-performance, and feature-rich Multi-Tenant ERP SaaS frontend built with React, Vite, and Tailwind CSS. This application provides a comprehensive suite of tools for businesses to manage their accounts, inventory, sales, and more, while offering a robust platform management interface for administrators.

---

## ✨ Key Features

### 🏢 Tenant Workspace
- **Dashboard**: Real-time analytics and overview of business performance.
- **Accounts**: Complete financial management including Chart of Accounts, Journals, and Financial Statements.
- **Inventory**: Advanced stock tracking, product management, and warehouse controls.
- **Sales**: Streamlined sales pipeline from quotations to invoicing.
- **Settings**: Customizable tenant-specific configurations and user management.
- **Recent Activities**: Detailed audit logs and activity tracking.

### 🌐 Platform Administration
- **Tenant Management**: Create, update, and monitor tenant accounts.
- **Module Control**: Granular control over active modules for each tenant.
- **System Dashboard**: High-level overview of the entire SaaS ecosystem.

---

## 🛠️ Tech Stack

- **Framework**: [React 18](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/) & [Lucide Icons](https://lucide.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Data Fetching**: [TanStack Query (React Query)](https://tanstack.com/query/latest)
- **Routing**: [React Router DOM](https://reactrouter.com/)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Testing**: [Vitest](https://vitest.dev/) & [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```bash
   cd erp
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Development
Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

### Production Build
Build the application for production:
```bash
npm run build
```
Preview the production build:
```bash
npm run preview
```

---

## 📂 Project Structure

```
src/
├── api/          # API services and configurations
├── assets/       # Static assets (images, fonts)
├── components/   # Reusable UI components
├── layouts/      # Page layouts (Platform & Tenant)
├── lib/          # External library configurations
├── pages/        # Page components (Platform & Tenant modules)
├── router/       # Routing configuration
├── store/        # Zustand state stores
├── test/         # Testing utilities
├── utils/        # Helper functions
└── App.tsx       # Root component
```

---

## 📜 Available Scripts

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Compiles TypeScript and builds the production bundle.
- `npm run preview`: Previews the production build locally.
- `npm run lint`: Runs ESLint to check for code quality issues.
- `npm run test`: Runs the test suite using Vitest.
- `npm run test:run`: Runs tests once (CI mode).

---

## 🐳 Docker Support

The project includes a `Dockerfile` for easy containerization and deployment. To build and run the Docker container:

```bash
docker build -t erp-frontend .
docker run -p 8080:80 erp-frontend
```

---

## 🤝 Contributing

Please read our contribution guidelines before submitting pull requests.

## 📄 License

This project is licensed under the MIT License.
