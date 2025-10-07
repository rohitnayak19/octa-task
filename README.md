# 🌟 OctaTech Task — Smart Task & Lead Management App

Welcome to **OctaTech Task**, a web-based platform designed to simplify task tracking, client management, and business lead monitoring — all in one place.  
Whether you’re a **Manager** or a **Client**, OctaTech helps you stay connected and organized effortlessly.

---

## 🚀 What Is OctaTech Task?

OctaTech Task is an all-in-one web app where:

- 🧑‍💼 **Managers** can manage clients, assign tasks, schedule calls, and track leads.  
- 👥 **Clients** can connect with their managers using a special code, view assigned tasks, and stay updated in real time.

It’s fast, clean, and works on both desktop and mobile — you can even install it as a Progressive Web App (PWA)!

---

## 🪜 Getting Started (User Guide)

### 🧩 Step 1: Register as a Manager
1. Visit the **Register** page.  
2. Enter your **Name**, **Email**, and **Password**.  
3. Select **Manager** as your role.  
4. Click **Register** — a unique **Manager Code** will be generated for you.

This code allows clients to connect to your account.

📸 **Screenshot:**  
![Manager Registration](./Screenshot%202025-10-07%20120511.png)

---

### 👥 Step 2: Register as a Client
1. Go to **Register**.  
2. Fill in your details (Name, Email, Password).  
3. Choose **Client** under *Role*.  
4. Enter the **Manager Code** shared by your manager.  
5. Click **Register** to send a connection request.

📸 **Screenshot:**  
![Client Registration](./Screenshot%202025-10-07%20120550.png)

---

### 🔑 Step 3: Login
After registration, use your email and password to log in.
📸 **Screenshot:**  
![Login Page](./Screenshot%202025-10-07%20115507.png)

---

## 👨‍💼 Manager Dashboard
Once logged in as a Manager, you’ll be redirected to your dashboard.  
Here you can:

- Add new tasks  
- Approve or reject clients  
- Manage your team and track work progress  
- Copy and share your **Manager Code**

📸 **Screenshot:**  
![Manager Dashboard](./Screenshot%202025-10-07%20115645.png)

---

## 🔄 Client Approval Flow
When a client registers using your **Manager Code**, you’ll receive their request.  
You can **Approve**, **Reject**, or **Remove** the client anytime.

📸 **Screenshot (Pending Request):**  
![Client Pending Request](./Screenshot%202025-10-07%20120603.png)

📸 **Screenshot (Approved Client):**  
![Approved Client](./Screenshot%202025-10-07%20120615.png)

---

## ⏳ Client Status Screens

### 🕒 Waiting for Approval
When a client signs up, they must wait until the manager approves their access.  
📸 ![Waiting for Approval](./Screenshot%202025-10-07%20115653.png)

### 🚫 Access Removed / Denied
If access is removed or rejected, the client sees this message and can request access again.  
📸 ![Access Removed](./Screenshot%202025-10-07%20115645.png)

---

## 🧾 Client Dashboard

Once approved, clients can access their personalized dashboard to:

- View manager-assigned tasks  
- Add tasks for their manager  
- Track deadlines (Today, Tomorrow, Overdue)  
- Add comments for communication

📸 **Screenshot:**  
![Client Dashboard](./Screenshot%202025-10-07%20120632.png)

---

## 📅 Schedule Call (Manager Feature)

Managers can use the **Schedule Call** tab to plan and manage follow-up or business calls with clients.  
They can set a call date, status, and easily view all scheduled sessions.

📸 **Screenshot:**  
![Schedule Call Page](./Screenshot%202025-10-07%20122211.png)

---

## 📊 Leads Management & Analytics

Managers can also track and analyze their business leads with detailed stats and charts.

### 📋 Leads List
- View all leads in one place.  
- Filter by date or status.  
- Edit or delete leads as needed.

📸 **Screenshot:**  
![Leads Table](./Screenshot%202025-10-07%20122228.png)

### 📈 Visual Reports
Analyze leads with interactive charts showing:
- Lead Status distribution  
- Business Type comparison  

📸 **Screenshot:**  
![Leads Analytics](./Screenshot%202025-10-07%20120557.png)
---
## 🗂 Tabs in the Dashboard

| Tab | Description |
|------|--------------|
| **Todo** | Tasks yet to be started |
| **In Process** | Ongoing tasks |
| **Done** | Completed tasks |
| **Clients** | Manage client approvals (Manager only) |
| **Leads** | Track and analyze business leads |
| **Schedule Call** | Manage upcoming client meetings |

---

## 📱 Install OctaTech Task (PWA)
You can install OctaTech Task on your device for a native-app experience.
### 💻 Desktop (Chrome / Edge)
1. Visit the app’s main page.  
2. Click the **Install** icon in your browser’s address bar.  
3. Choose **Install** — the app opens in its own window.

### 📱 Mobile (Android / iPhone)
1. Open the site in your mobile browser.  
2. Tap the **Share** icon → **Add to Home Screen**.  
3. Launch it directly like any app.

---

## 🔒 Access Rules

| User Type | What They Can Do |
|------------|------------------|
| **Manager** | Add/manage tasks, approve/reject clients, schedule calls, track leads |
| **Client** | Add/view tasks, track progress, connect with a manager |
| **Removed Client** | Cannot access dashboard; can request access again |

---

## 💡 Tips

- If you see **Waiting for Approval**, your manager hasn’t accepted yet.  
- If you see **Access Removed**, click **Request Access**.  
- Managers can easily share their **Manager Code** via the **Copy** button.  
---

## Developed By OctaTech
Designed and built by **OctaTech VIII** using:
- React + Vite  
- Firebase Auth + Firestore  
- Tailwind CSS  
- Chart JS  
- PWA support  
