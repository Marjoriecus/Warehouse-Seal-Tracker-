# 📦 Warehouse Seal Tracker
**A High-Integrity Inventory & Audit System for Logistic Compliance.**

## 🎯 Purpose
In high-security warehouse environments, maintaining the chain of custody for container seals is critical for insurance compliance and theft prevention. This application provides **Administrative Oversight** and **Personnel Accountability** by tracking the full lifecycle of warehouse seals from intake to application.

## 🚀 Key Features
- **Role-Based Access Control (RBAC):** Restricts inventory intake and permanent record deletion to authorized Admin accounts.
- **Department-Specific Silos:** Staff members are restricted to viewing inventory for their assigned departments (Inbound, Shipping, Outbound).
- **Audit-Ready Documentation:** Supports photo-proof evidence and a correction-note thread for every seal to ensure records are "Audit-Ready" for security inspections.
- **Optimized Performance:** Implements client-side image compression (HTML5 Canvas) to reduce storage costs and improve upload speeds in areas with weak warehouse Wi-Fi.
- **Data Integrity:** Centralized constants and database triggers prevent department naming mismatches.

## 🛠 Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** JavaScript (ES6+)
- **Database & Auth:** Supabase (PostgreSQL)
- **Storage:** Supabase Buckets (Image Hosting)
- **Styling:** Tailwind CSS
- **Notifications:** Sonner (Production-grade Toasts)

## 🏗 Modular Architecture
This project follows a **Separation of Concerns** design pattern to ensure scalability and maintainability:

- **Custom Hooks (`/hooks`):** Decoupled authentication logic (`useAuth`) and inventory state management (`useSeals`) from the UI.
- **Utility Layer (`/utils`):** Centralized complex business logic like `imageUtils` for reusable processing.
- **Component Pattern:** UI is broken down into Atomic components (e.g., `SealCard`, `AdminIntake`) to prevent "Prop Drilling" and improve render performance.

## 📋 Standard Operating Procedure (SOP) Workflow
1. **Intake:** Admin adds new serial numbers and assigns them to a specific department.
2. **Checkout:** Department staff selects an 'In-Stock' seal and enters container/dock door details.
3. **Evidence:** User uploads a photo of the applied seal (auto-compressed for efficiency).
4. **Audit:** Management reviews the 'Used Inventory' and adds correction notes if discrepancies are found.
5. **Reporting:** Admins can export the filtered audit trail to CSV for external reporting.

## ⚙️ Installation & Setup
1. Clone the repository.
2. Run `npm install`.
3. Set up your `.env.local` with your Supabase URL and Anon Key.
4. Run `npm run dev` to start the development server.

---
## 📬 Connect
- **Developer:** Marjorie Usey  
- **Portfolio:** (https://github.com/Marjoriecus)
- **LinkedIn:** (https://www.linkedin.com/in/marjorie-usey-249332318/)
