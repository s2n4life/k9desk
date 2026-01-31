export const K9_KNOWLEDGE_BASE = `
# K9desk MASTER USER GUIDE
# This is the "Brain" of the AI. It contains every button, specific color, workflow, and feature in the app.

## 1. NAVIGATION & LAYOUT

**The app has 5 main tabs at the bottom:**

1. **Today (Calendar Icon)**: Your dashboard showing today's schedule, KPI stats (Revenue, Jobs Today, Upcoming), and "+ Add Job" button (top right)
2. **Upcoming (Clock Icon)**: Future schedule grouped by day (e.g., "Monday, Oct 25"). Shows all jobs scheduled for future dates
3. **Needs Action (Alert Icon)**: Jobs requiring attention (Payment Requested but not paid, Review Requested). Shows red notification badge with count
4. **Leads (User+ Icon)**: New booking requests from your public booking page. Shows red notification badge with count. Has "Active" and "Archived" tabs
5. **Customers (Users Icon)**: Searchable list of all clients and their pets. Toggle between "Customers" and "Past Jobs" views

**Header Icons (Top Right):**
- **? (Help Circle)**: Opens Help Drawer with FAQ, K9 Assistant chatbot, and Email Support
- **Gear (Settings)**: Opens Business Settings page

---

## 2. THE JOB WORKFLOW (Complete State Machine)

Every job moves through these exact colored stages. You advance them by clicking the main button on the Job Card.

### Job States & Transitions:

1. **SCHEDULED** (Gray Badge)
   - **Meaning**: Job is booked for a specific date and time
   - **Primary Button**: "Send Reminder" (Gray) - Sends pre-written SMS reminder to client
   - **Secondary Actions**: Reschedule, Cancel, Mark No-Show
   - **Next State**: Changes to "Reminder Sent"

2. **REMINDER SENT** (Blue Badge "Sent")
   - **Meaning**: Customer has been reminded via SMS
   - **Primary Button**: "Start Job" (Blue) - Click when you arrive or begin grooming
   - **Secondary Actions**: Reschedule, Cancel, Mark No-Show
   - **Next State**: Changes to "In Progress"

3. **IN PROGRESS** (Purple Badge)
   - **Meaning**: Grooming is actively happening
   - **Primary Button**: "Finish Job" (Purple) - Click when dog is ready
   - **Secondary Actions**: Cancel, Mark No-Show
   - **Next State**: Changes to "Completed"

4. **COMPLETED** (Green Badge "Done")
   - **Meaning**: Service is complete, time to collect payment
   - **Button A**: "Log Payment" (Green) - Use if paid Cash/Check/Venmo on the spot
   - **Button B**: "Ask for Pay" (Gray) - Sends SMS with your payment links (Venmo/Zelle/CashApp/PayPal)
   - **Secondary Actions**: Cancel, Mark No-Show
   - **Next State**: "Paid" (if logged) or "Payment Requested" (if asked)

5. **PAYMENT REQUESTED** (Yellow Badge)
   - **Meaning**: Payment link sent, waiting for customer to pay
   - **Primary Button**: "Log Payment" (Yellow) - Click once you confirm receipt
   - **Secondary Actions**: Cancel, Mark No-Show
   - **Next State**: Changes to "Paid"

6. **PAID** (Green Badge)
   - **Meaning**: Payment received and logged
   - **Button A**: "Ask Review" (Green) - Sends Google/Yelp review link via SMS
   - **Button B**: "Close" (Gray) - Archives the job
   - **Secondary Actions**: Cancel, Mark No-Show
   - **Next State**: "Closed" (if closed) or stays "Paid" (if review requested)

7. **CLOSED** (Gray Badge)
   - **Meaning**: Job is complete and archived
   - **Terminal State**: No further actions available

8. **CANCELLED** (Red Badge)
   - **Meaning**: Job was cancelled before completion
   - **Terminal State**: No further actions available

9. **NO SHOW** (Orange Badge)
   - **Meaning**: Customer didn't show up for appointment
   - **Terminal State**: No further actions available

### Payment Methods Available:
- Cash
- Check
- Venmo
- Zelle
- Stripe (credit card)
- Other

---

## 3. CORE FEATURES & "HOW TO"

### **How to Add a New Job**
- Go to **Today** tab
- Tap **"+ Add Job"** button (top right)
- Select existing customer or create new one
- Select pet(s) - can select multiple pets for same appointment
- Choose services for each pet
- Set date and time
- Add address and notes
- Tap **"Create Job"**

### **How to Navigate (GPS)**
- Go to **Today** or **Upcoming** tab
- On the Job Card, tap the **"Navigate"** link with arrow icon
- Opens **Apple Maps** or **Google Maps** with customer's address

### **How to Text a Customer**
- **Option 1 (From Customer Profile)**:
  - Go to **Customers** tab → Tap customer name
  - Tap the **Phone Number** (clickable link) → Opens SMS app
- **Option 2 (Automated Actions)**:
  - Use "Send Reminder", "Ask for Pay", or "Ask Review" buttons
  - These automatically draft SMS messages with pre-filled content

### **How to Add/Edit Services**
- Go to **Settings** (Gear icon top right)
- Scroll to **"Services"** section → Tap to expand
- **Add**: Tap "+ Add" button → Enter Name & Price → Save
- **Edit**: Tap Pencil icon next to service → Modify → Save
- **Delete**: Tap Trash icon → Confirm deletion

### **How to Share Your Booking Link**
- Go to **Leads** tab
- See purple/blue gradient banner: "Your K9desk Booking Page"
- **Actions**:
  - **"Text Link"**: Drafts SMS to send link to a client
  - **"Copy Link"**: Copies URL to clipboard (e.g., k9desk.com/book/your-business)
  - **"Edit URL"**: Tap pencil icon to customize your booking page slug

### **How to Manage Leads**
- Go to **Leads** tab
- **Active Tab**: Shows new booking requests
- **Archived Tab**: Shows dismissed/converted leads
- **Actions on Lead Card**:
  - **"Book" (Green)**: Converts lead to job, auto-fills customer/pet data
  - **"Archive" (Gray)**: Hides lead from active view
- **Badge**: "NEW REQUEST" (Blue) means you haven't interacted with it yet
- **Auto-Select Date**: When converting lead to job, preferred date is pre-selected

### **How to Configure Payment Settings**
- Go to **Settings** → **Payment Settings** section
- Enter your payment handles:
  - **Venmo**: @YourHandle
  - **Zelle**: Phone or Email
  - **PayPal**: paypal.me/username
  - **Cash App**: $Cashtag
  - **Custom URL**: Any other payment link
- Tap **"Save Payment Settings"**
- *Why?* "Ask for Pay" SMS includes these payment links

### **How to Set Review Link**
- Go to **Settings** → **Review Settings**
- Enter your Google/Yelp review URL
- Tap **"Save Review Settings"**
- *Why?* "Ask Review" button sends this link to customers

### **How to See Past Jobs**
- Go to **Customers** tab
- Tap **"Past Jobs"** toggle button at top
- Shows history of all Completed/Paid/Closed jobs
- Can search by customer name or filter by date

### **How to Add a Customer Manually**
- Go to **Today** tab → Tap **"+ Add Job"**
- In customer selection, choose **"+ New Customer"**
- Enter customer details (name, phone, address, notes)
- Add pet details (name, breed, size, age, notes)
- Continue with job creation

### **How to Edit Customer/Pet Info**
- Go to **Customers** tab → Tap customer name
- Tap **"Edit"** button
- Modify customer details (name, phone, address, notes)
- Modify pet details (name, breed, size, age, notes)
- Tap **"Save"**

### **How to Reschedule a Job**
- Open job card (from Today, Upcoming, or Needs Action)
- Tap **"Reschedule"** button (in secondary actions menu)
- Select new date and time
- Tap **"Save"**

### **How to Cancel a Job**
- Open job card
- Tap **"Cancel"** button (in secondary actions menu)
- Confirm cancellation
- Job moves to "Cancelled" state (terminal)

### **How to Mark No-Show**
- Open job card
- Tap **"Mark No-Show"** button (in secondary actions menu)
- Confirm
- Job moves to "No Show" state (terminal)

### **How to Set Business Hours**
- Go to **Settings** → **Service Area & Schedule**
- See **"Weekly Schedule"** section
- For each day:
  - Toggle switch to mark as Open/Closed
  - If open, set start and end times
- Tap **"Save Service Area Settings"**

### **How to Set Scheduling Defaults**
- Go to **Settings** → **Scheduling Defaults**
- **Time per Appointment**: How long each job takes (15-480 min)
- **Average Drive Time**: Buffer between appointments (0-120 min)
- Tap **"Save Scheduling Defaults"**

### **How to Manage Subscription**
- Go to **Settings** → **Subscription Status** section
- See current status: Trial, Active, Past Due, Canceled
- **If Trialing**: See days left in 14-day free trial
- **If Active**: Tap **"Manage Billing"** to open Stripe portal
- **If Trialing**: Tap **"Upgrade to Pro"** to subscribe
- **Cancel Account**: Tap **"Cancel My Account"** (only during trial)

### **How to Use K9 Assistant (AI Chatbot)**
- Tap **? (Help)** icon (top right)
- Scroll to **"Ask K9 Assistant"** card
- Tap **"Start Chat"**
- Type your question about CRM, scheduling, billing, etc.
- Get instant AI-powered answers

### **How to Contact Support**
- Tap **? (Help)** icon (top right)
- Scroll to bottom → Tap **"Email Support"**
- Enter subject and detailed message
- Tap **"Send Message"**
- Team responds within 24 hours

### **How to Force Sync**
- Open **Help Drawer** (? icon)
- Scroll to bottom → See sync status
- Tap **"Sync Now"** button
- Manually triggers sync of local changes to cloud

---

## 4. SETTINGS SECTIONS (Complete Breakdown)

### **Subscription Status**
- Shows current plan: Trial, Active, Comped, Past Due, Canceled
- Trial countdown (days remaining)
- "Manage Billing" button (opens Stripe portal)
- "Upgrade to Pro" button (during trial)
- "Cancel My Account" button (during trial)
- **No Risk Message**: "No credit card required. You will NOT be auto-charged."

### **Business Info**
- **Business Name**: Editable with pencil icon
- **Phone Number**: Used for account contact and support
- **Save Button**: Saves both fields

### **Scheduling Defaults**
- **Time per Appointment**: 15-480 minutes (default: 60)
- **Average Drive Time**: 0-120 minutes (default: 30)
- Used for calculating available time slots

### **Services**
- **Add Service**: Name + Price
- **Edit Service**: Modify name/price
- **Delete Service**: Remove from list
- Services appear in job creation dropdown

### **Payment Settings**
- **Venmo Handle**: @YourHandle
- **Zelle**: Phone or Email
- **PayPal.me Link**: paypal.me/username
- **Cash App Tag**: $Cashtag
- **Custom Payment URL**: Any other link
- Used in "Ask for Pay" SMS

### **Review Settings**
- **Review Link**: Google/Yelp review URL
- Used in "Ask Review" SMS

### **Service Area & Schedule**
- **Weekly Schedule**: Set open/closed days and hours for each day
- **Business Hours**: Start/end times for each open day
- Affects available booking slots on public booking page

---

## 5. UI COLOR GUIDE (Visual Cues)

### **Brand Colors**
- **Purple (Brand Primary)**: Main actions, "In Progress" state, active tabs, primary buttons
- **Blue (Info)**: "Reminder Sent" state, new leads badge, informational messages
- **Green (Success)**: "Completed", "Paid", "Closed" states, "Book" buttons, success messages
- **Yellow (Warning)**: "Payment Requested" state (waiting for money), warnings
- **Red (Danger)**: Delete buttons, "Cancelled" state, error messages, notification badges
- **Orange (Warning)**: "No Show" state
- **Gray (Neutral)**: "Scheduled" state, secondary buttons, archived items

### **Badge Colors**
- **Gray**: Scheduled, Closed
- **Blue**: Reminder Sent
- **Purple**: In Progress
- **Green**: Completed, Paid
- **Yellow**: Payment Requested
- **Red**: Cancelled
- **Orange**: No Show

### **Button Colors**
- **Primary (Purple)**: Main actions (Create Job, Save, Start Job, Finish Job)
- **Secondary (Gray)**: Cancel, Archive, secondary actions
- **Success (Green)**: Log Payment, Ask Review, Book Lead
- **Danger (Red)**: Delete, Cancel Account, Mark No-Show

---

## 6. COMMON QUESTIONS & ANSWERS

**Q: How do I add my first customer?**
A: Go to the Today tab and tap "+ Add Job" at the top right. You can create a new customer and pet while creating your first job.

**Q: How can I reschedule an appointment?**
A: Open the job card and tap "Reschedule" in the secondary actions menu. Select a new date and time, then save.

**Q: How do I send a reminder to a customer?**
A: On a Scheduled job card, tap "Send Reminder". This opens your SMS app with a pre-written reminder message.

**Q: How do I record a payment?**
A: When a job is Completed or Payment Requested, tap "Log Payment". Select the payment method (Cash, Venmo, etc.), confirm the amount, and save.

**Q: How do I request payment from a customer?**
A: On a Completed job, tap "Ask for Pay". This opens your SMS app with a message containing your payment links. The job moves to "Payment Requested" state.

**Q: Where do new booking requests go?**
A: All requests from your public booking page appear in the "Leads" tab with a red notification badge.

**Q: How do I convert a lead to a job?**
A: In the Leads tab, tap "Book" (green button) on the lead card. This opens the job creation form with customer, pet, and service details pre-filled.

**Q: How do I share my booking page?**
A: Go to the Leads tab. You'll see a purple/blue banner with your booking page URL. Tap "Text Link" to send it via SMS, or "Copy Link" to copy the URL.

**Q: How do I add a new service?**
A: Go to Settings → Services section → Tap "+ Add" → Enter service name and price → Tap "Save Service".

**Q: How do I set up my payment links?**
A: Go to Settings → Payment Settings. Enter your Venmo handle, Zelle info, PayPal.me link, Cash App tag, and any custom payment URL. These links are included in "Ask for Pay" SMS messages.

**Q: How do I request a review from a customer?**
A: On a Paid job card, tap "Ask Review". This opens your SMS app with a message containing your review link (Google, Yelp, etc.).

**Q: How do I set my review link?**
A: Go to Settings → Review Settings. Enter your Google or Yelp review URL, then tap "Save Review Settings".

**Q: How do I navigate to a customer's address?**
A: On any job card, tap the "Navigate" link with the arrow icon. This opens Apple Maps or Google Maps with the customer's address.

**Q: How do I see my past jobs?**
A: Go to Customers tab → Tap "Past Jobs" toggle at the top. This shows all completed, paid, and closed jobs.

**Q: What if a customer doesn't show up?**
A: Open the job card and tap "Mark No-Show" in the secondary actions menu. The job will be marked as a no-show and archived.

**Q: How do I cancel a job?**
A: Open the job card and tap "Cancel" in the secondary actions menu. The job will be marked as Cancelled and archived.

**Q: How do I manage my subscription?**
A: Go to Settings → Subscription Status section → Tap "Manage Billing". This opens the Stripe portal where you can update payment methods, view invoices, and manage your plan.

**Q: How do I upgrade from trial to paid?**
A: Go to Settings → Tap "Upgrade to Pro". This takes you to the pricing page where you can subscribe.

**Q: Will I be auto-charged after my trial?**
A: No! Your trial does NOT require a credit card, and you will NOT be auto-charged. You must manually upgrade to continue after the trial.

**Q: How do I set my working hours?**
A: Go to Settings → Service Area & Schedule. Toggle each day on/off and set your start and end times for open days.

**Q: What is "Time per Appointment" and "Average Drive Time"?**
A: These are in Settings → Scheduling Defaults. Time per Appointment is how long each job takes (default 60 min). Average Drive Time is the buffer between jobs for travel (default 30 min). These help calculate available booking slots.

**Q: Can I book multiple pets in one appointment?**
A: Yes! When creating a job, you can select multiple pets for the same customer. Each pet can have different services.

**Q: How do I edit customer or pet information?**
A: Go to Customers tab → Tap customer name → Tap "Edit" → Modify details → Tap "Save".

**Q: How do I get help if I'm stuck?**
A: Tap the "?" icon (top right) to open the Help Drawer. You can search FAQs, chat with the K9 Assistant AI, or email support.

**Q: What if my data isn't syncing?**
A: Open the Help Drawer (?) and scroll to the bottom. Check the sync status. If it says "Sync Error", tap "Sync Now" to retry. If the problem persists, contact support.

---

This guide covers all features, buttons, colors, states, and workflows in K9desk!
`;
