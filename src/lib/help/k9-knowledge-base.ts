export const K9_KNOWLEDGE_BASE = `
# K9desk MASTER USER GUIDE
# This is the "Brain" of the AI. It contains every button, specific color, workflow, and feature in the app.

## 1. NAVIGATION & LAYOUT
**The app has 5 main tabs at the bottom:**
1. **Today (Calendar Icon)**: Your dashboard. Shows today's schedule, KPI stats, and "Add Job" button.
2. **Upcoming (Clock Icon)**: Future schedule. Grouped by day (e.g., "Monday, Oct 25").
3. **Needs Action (Alert Icon)**: Jobs that need attention (e.g., Payment Requested but not paid). Red notification badge.
4. **Leads (User+ Icon)**: New booking requests from your public page. Red notification badge.
5. **Customers (Users Icon)**: Searchable list of all clients and their pets.

**Header Icons (Top Right):**
- **? (Help Circle)**: Opens this Help Drawer.
- **Gear (Settings)**: Opens Business Settings.

---

## 2. THE JOB WORKFLOW (Detailed)
Every job moves through these exact colored stages. You advance them by clicking the main button on the Job Card.

1. **SCHEDULED** (Gray Badge)
   - **Meaning**: Job is booked for a specific time.
   - **Primary Button**: "Send Reminder" (Gray). Sends a pre-written SMS reminder to the client.
   - **Next Step**: Changes to "Sent".

2. **SENT** (Blue Badge "Sent")
   - **Meaning**: You reminded the customer.
   - **Primary Button**: "Start Job" (Blue). Click this when you arrive or begin grooming.
   - **Next Step**: Changes to "In Progress".

3. **IN PROGRESS** (Purple Badge)
   - **Meaning**: Grooming is happening now.
   - **Primary Button**: "Finish Job" (Purple). Click when the dog is ready.
   - **Next Step**: Changes to "Completed".

4. **COMPLETED** (Green Badge "Done")
   - **Meaning**: Service is done, time to get paid.
   - **Button A**: "Log Payment" (Green). Use if they paid you Cash/Check/Venmo right there.
   - **Button B**: "Ask for Pay" (Gray). Sends an SMS with your payment links (Venmo/CashApp).
   - **Next Step**: Changes to "Paid" (if logged) or "Payment Requested".

5. **PAYMENT REQUESTED** (Yellow Badge)
   - **Meaning**: You sent the link, waiting for money.
   - **Primary Button**: "Log Payment" (Yellow). Click this once you confirm you received the money.
   - **Next Step**: Changes to "Paid".

6. **PAID** (Green Badge)
   - **Meaning**: Money is in the bank.
   - **Button A**: "Ask Review" (Green). Sends your Google/Yelp link via SMS.
   - **Button B**: "Close" (Gray). Archives the job.

---

## 3. CORE FEATURES & "HOW TO"

### **How to Navigate (GPS)**
- Go to **Today** or **Upcoming** tab.
- On the Job Card, look for the small **"Navigate"** link with an arrow icon.
- Tap it to open **Apple Maps** or **Google Maps**.
- *Note: It uses the address saved in the Job.*

### **How to Text a Customer**
- **Option 1 (From Customer Profile)**: 
  - Go to **Customers** tab > Tap a Name.
  - Tap the **Phone Number** (it's a clickable link). It opens your phone's SMS app.
- **Option 2 (Automated Actions)**: 
  - Using "Send Reminder", "Ask for Pay", or "Ask Review" buttons on a Job Card will automatically draft an SMS for you.

### **How to Add/Edit Services**
- Go to **Settings** (Gear Icon top right).
- Scroll to **"Services"**.
- **Add**: Tap the small "Add" button > Enter Name & Price > Save.
- **Edit**: Tap the Pencil icon next to any service.
- **Delete**: Tap the Trash icon.

### **How to Share Booking Link**
- Go to **Leads** tab.
- You will see a colorful purple/blue banner: "Your K9desk Booking Page".
- **Actions**:
  - "Text Link": Drafts an SMS to a client with your link.
  - "Copy Link": Copies to clipboard (e.g., k9desk.com/book/your-business).
  - **Edit URL**: Tap the pencil icon to change your custom link name.

### **How to Manage Leads**
- **Active Tab**: New requests.
- **Action**: Tap "Book" (Green) to convert to a Job. Tap "Archive" (Gray) to hide.
- **Badges**: "NEW REQUEST" (Blue) means you haven't touched it yet.

### **How to Configure Payments**
- Go to **Settings** > **Payment Settings**.
- Enter your Venmo handle (e.g., @MyGrooming), CashApp ($Tag), or PayPal link.
- *Why?* This allows the "Ask for Pay" SMS to include your direct payment links.

### **How to See Past Jobs**
- Go to **Customers** tab.
- Tap the **"Past Jobs"** toggle button at the top (next to "Customers").
- Shows a history of all Completed/Paid/Closed jobs.

### **How to Add a Customer (Manual)**
- Currently, you start a job to add a customer, or convert a Lead.
- To just book someone new: Go to **Today** > Tap **"+ Add Job"** (Top Right) > Enter New Customer Details.

---

## 4. UI COLOR GUIDE (Visual Cues)
- **Purple (Brand)**: Main actions, "In Progress", active tabs.
- **Green (Success)**: Completed, Paid, Book buttons.
- **Yellow (Warning)**: Payment Requested (waiting for money).
- **Blue (Info)**: Reminder Sent, New Leads.
- **Red (Danger)**: Delete, Needs Action badge.
- **Gray (Neutral)**: Scheduled, Archived.

`;
