# Edify School Hub

The current frontend is a Vite/React application that uses the Edify backend API for authentication and school data. Start the backend and PostgreSQL by following `../backend/README.md`, then run `npm install` and `npm run dev` from this directory. Set `VITE_API_URL` to the backend's `/api` URL when it differs from `http://localhost:4000/api`.

The design brief below is historical and describes an earlier localStorage-only prototype; it is not an accurate description of the current persistence or authentication model.

Complete prompt

Build a complete, modern, professional School Management & Fee Management System frontend for:

EDIFY SCHOOL
THINKBEYOND

IMPORTANT:
This is FRONTEND ONLY.

Technology requirements:
- React.js
- Vite
- JavaScript and JSX only
- TanStack Router
- Tailwind CSS
- Lucide React icons
- LocalStorage for all data persistence
- No backend
- No Supabase
- No Firebase
- No API calls
- No database
- No authentication server

The application must work completely using browser LocalStorage so that the entire frontend can be demonstrated without a backend.

==================================================
1. BRANDING
==================================================

Use the uploaded Edify School logo as the main branding reference.

Brand:
EDIFY SCHOOL
THIKKONDA

Use the colors from the logo as the primary visual identity:
- Orange as the primary accent
- Black / very dark charcoal for primary text
- White for clean backgrounds
- Light gray for secondary backgrounds
- Use subtle orange variations for hover, active, focus and highlights.

Do NOT use the previous red/black TechMinds color scheme.

The website must visually feel like a premium modern school management platform.

Typography:
- Use a modern sans-serif font throughout the application.
- Prefer "Inter", "Manrope", or a similar professional sans-serif.
- No serif fonts.
- No handwritten fonts.
- No decorative fonts.
- Headings should be strong and clean.
- Body text should be highly readable.

==================================================
2. DESIGN DIRECTION
==================================================

Create a premium school administration dashboard rather than a generic admin template.

Design characteristics:
- Clean
- Professional
- Modern
- Minimal
- Trustworthy
- Education-focused
- Spacious
- Excellent visual hierarchy
- Subtle animations
- Smooth transitions
- Responsive
- Desktop-first but fully mobile responsive

Use:
- Rounded cards
- Soft shadows
- Thin borders
- Clean tables
- Modern form controls
- Status badges
- Empty states
- Skeleton/loading states where appropriate
- Toast notifications
- Confirmation dialogs
- Modal forms
- Dropdowns
- Search
- Filters
- Pagination where useful

Avoid:
- Excessive gradients
- Excessive glassmorphism
- Neon colors
- Overly colorful dashboards
- Huge unnecessary animations
- Generic Bootstrap-looking layouts
- Cluttered screens

==================================================
3. ANIMATIONS
==================================================

Add professional, subtle animations throughout the application.

Use animations for:
- Page transitions
- Sidebar opening/closing
- Dashboard cards
- Modal opening/closing
- Dropdowns
- Table row appearance
- Toast notifications
- Buttons
- Hover states
- Form validation
- Sidebar navigation
- Login screen

Animations must be fast and professional.

Do NOT make animations distracting.

Prefer:
- fade
- slide
- scale
- subtle hover elevation
- smooth transitions

If appropriate, use Framer Motion.

==================================================
4. APPLICATION STRUCTURE
==================================================

Create two different user experiences:

1. SUPER ADMIN
2. CASHIER

The Super Admin has complete control.

The Cashier has a restricted dashboard and only access to cashier-related functionality.

==================================================
5. LOGIN SYSTEM
==================================================

Create a professional Edify School login page.

Login screen:
- Edify School logo
- "School Management System"
- Email/Username
- Password
- Show/hide password
- Remember me
- Login button
- Forgot password UI
- Professional school-themed illustration or subtle background
- Responsive mobile design

Authentication must be simulated using LocalStorage.

Create demo users:

Super Admin:
username: admin
password: admin123

Cashier:
username: cashier
password: cashier123

DO NOT expose passwords unnecessarily inside the UI.

After login:
- Store authenticated user in LocalStorage.
- Redirect according to role.

==================================================
6. ROLE-BASED ACCESS
==================================================

SUPER ADMIN:

Full access to:
- Dashboard
- Students
- Admissions
- Parents/Guardians
- Classes
- Sections
- Fee Structure
- Fee Terms / Installments
- Fee Collection
- Fee History
- Receipts
- Reports
- Academic Years
- Cashier Management
- School Settings

CASHIER:

Restricted access to:
- Cashier Dashboard
- Student Search
- Fee Collection
- Payment History
- Receipt Generation
- Receipt Reprinting
- Relevant fee reports

Cashier must NOT be able to access:
- Admin settings
- Cashier management
- Fee structure configuration
- Academic year configuration
- School settings
- User access management

If a cashier manually enters an unauthorized route URL, redirect them to their dashboard or show an "Access Denied" page.

==================================================
7. ADMIN CREATES CASHIER ACCESS
==================================================

The Super Admin must be able to create cashier accounts.

Create:

Cashier Management

Features:
- Add Cashier
- Edit Cashier
- Activate/deactivate cashier
- Delete cashier
- Search cashier
- View cashier details
- Reset password UI

Cashier fields:
- Full Name
- Employee ID
- Email
- Phone
- Username
- Password
- Status
- Created Date

Store cashier accounts in LocalStorage.

The Super Admin controls who has cashier access.

When the cashier logs in, their dashboard must automatically use their cashier identity.

Example:

"Welcome, Ravi"

"Today's Collections"

"Receipts Generated"

etc.

==================================================
8. SUPER ADMIN DASHBOARD
==================================================

Create a premium dashboard.

Top section:
"Good Morning, Admin"
"Here's what's happening at Edify School today."

Statistics cards:

- Total Students
- Total Classes
- Today's Collection
- Pending Fees
- Total Fee Collection
- Active Cashiers

Use attractive but simple visual indicators.

Add charts:

1. Fee Collection Overview
   - Daily
   - Weekly
   - Monthly

2. Class-wise Fee Collection

3. Paid vs Pending Fees

4. Recent Fee Payments

5. Recent Admissions

Use realistic demo data.

Charts must be responsive.

==================================================
9. CASHIER DASHBOARD
==================================================

The cashier dashboard must be completely different from the Admin dashboard.

Focus on daily operations.

Header:

"Good Morning, [Cashier Name]"

Cards:

- Today's Collection
- Today's Transactions
- Receipts Generated
- Pending Collections

Main section:

"Collect Fee"

Make this the primary action.

Quick actions:
- Collect Fee
- Search Student
- Print Receipt
- Reprint Receipt
- Payment History

Show:

Today's Transactions

Columns:
- Receipt No
- Student
- Admission No
- Class
- Amount
- Payment Mode
- Time
- Status

Cashier should have a simple operational interface rather than administrative configuration screens.

==================================================
10. STUDENT ADMISSION
==================================================

Create a professional multi-step admission form.

This should be one of the best-designed parts of the application.

Step 1:
Student Information

Fields:
- Admission Number
- Student ID
- First Name
- Last Name
- Date of Birth
- Gender
- Blood Group
- Aadhaar / ID Number
- Previous School
- Admission Date

Step 2:
Parent / Guardian Information

Fields:
- Father's Name
- Father's Phone
- Father's Email
- Mother's Name
- Mother's Phone
- Mother's Email
- Guardian Name
- Relationship
- Guardian Phone
- Address

Step 3:
Academic Information

Fields:
- Academic Year
- Class
- Section
- Roll Number
- Previous Class
- Previous School

Step 4:
Fee Information

Fields:
- Fee Category
- Applicable Fee Structure
- Discount
- Initial Payment
- Payment Mode

Step 5:
Review & Submit

Show a complete summary before saving.

Use:
- Step indicators
- Progress bar
- Section cards
- Clear labels
- Inline validation
- Required field indicators
- Error messages
- Success notification

Save the student to LocalStorage.

==================================================
11. STUDENT MANAGEMENT
==================================================

Create a Student Management page.

Features:
- Add Student
- Search Student
- Filter Student
- View Student
- Edit Student
- Delete Student
- View fee history
- View parent details
- View academic information

Search by:
- Student name
- Admission number
- Phone number
- Class

Filters:
- Class
- Section
- Academic Year
- Gender
- Fee Status

Create a professional student table.

Mobile view should convert the table into cards.

==================================================
12. STUDENT PROFILE
==================================================

Create a detailed Student Profile page.

Header:
- Student photo/avatar
- Student name
- Admission number
- Class
- Section
- Academic year
- Fee status

Tabs:

Overview
Parent Details
Academic Details
Fee Details
Payment History

Include:
- Edit button
- Print profile
- Fee history
- Payment summary

==================================================
13. CLASS & SECTION MANAGEMENT
==================================================

Super Admin only.

Features:
- Add Class
- Edit Class
- Delete Class
- Add Section
- Edit Section
- Delete Section
- Assign students

Example:

Class 1
- A
- B
- C

Class 2
- A
- B

Show:
- Total students
- Total sections
- Class-wise fee structure

==================================================
14. FEE STRUCTURE
==================================================

Super Admin only.

Create fee structure management.

Fee heads:
- Tuition Fee
- Admission Fee
- Transport Fee
- Books
- Uniform
- Examination Fee
- Activity Fee
- Other Fee

Allow admin to:
- Create fee structure
- Assign structure to class
- Define fee heads
- Define amounts
- Edit
- Delete
- Activate/deactivate

==================================================
15. FEE TERMS / INSTALLMENTS
==================================================

Create installment management.

Example:

Annual Fee
â‚¹30,000

Installments:

Term 1
â‚¹10,000
Due Date

Term 2
â‚¹10,000
Due Date

Term 3
â‚¹10,000
Due Date

Allow admin to configure installment schedules.

==================================================
16. FEE COLLECTION
==================================================

This is one of the most important modules.

Create a professional fee collection screen.

Search student by:
- Admission Number
- Student Name
- Phone Number

After selecting student show:

Student:
Name
Admission Number
Class
Section

Fee Summary:

Total Fee
Paid
Pending
Discount
Balance

Show installment/fee-head breakdown.

Example:

Tuition Fee
â‚¹20,000
Paid â‚¹10,000
Balance â‚¹10,000

Transport
â‚¹5,000
Paid â‚¹5,000
Balance â‚¹0

Allow cashier to collect payment.

Payment fields:
- Amount
- Payment Mode
- Transaction/reference number
- Date
- Remarks

Payment modes:
- Cash
- UPI
- Card
- Bank Transfer

Prevent payment greater than outstanding balance unless explicitly configured by admin.

Save payment to LocalStorage.

Automatically update:
- Paid amount
- Balance
- Payment history
- Dashboard statistics

==================================================
17. FEE RECEIPT
==================================================

After payment:

Automatically generate a professional fee receipt.

Receipt should contain:

EDIFY SCHOOL
THIKKONDA

School logo

Receipt Number
Date

Student Name
Admission Number
Class
Section

Fee Details

Amount Paid
Payment Mode

Previous Balance
Current Payment
Remaining Balance

Cashier Name

Authorized Signature

Create buttons:
- Print Receipt
- Download Receipt
- Reprint

Use a clean A4-printable receipt layout.

When printing:
- Hide dashboard/sidebar/navigation.
- Print only the receipt.

==================================================
18. PAYMENT HISTORY
==================================================

Create a complete payment history page.

Columns:

Receipt Number
Date
Student
Admission Number
Class
Amount
Payment Mode
Cashier
Status

Filters:
- Date
- Class
- Cashier
- Payment Mode

Search:
- Receipt number
- Student
- Admission number

Actions:
- View
- Print
- Reprint

==================================================
19. REPORTS
==================================================

Create a professional Reports section.

Reports:

Daily Collection Report
Monthly Collection Report
Class-wise Collection Report
Cashier-wise Collection Report
Student Fee History
Pending Fee Report
Paid Fee Report
Balance Fee Report

Add filters:
- Date range
- Academic year
- Class
- Section
- Cashier
- Payment mode

Show:
- Total transactions
- Total collected
- Pending amount
- Number of students

Provide:
- Print
- Download CSV
- Print report

==================================================
20. ACADEMIC YEAR MANAGEMENT
==================================================

Super Admin only.

Allow:
- Add academic year
- Set active academic year
- Edit
- Close academic year

Example:

2025-2026
2026-2027
2027-2028

When switching academic year, the UI must clearly show the currently active year.

Do not accidentally mix student/fee data between academic years.

==================================================
21. SCHOOL SETTINGS
==================================================

Super Admin only.

Create settings page.

School information:

School Name:
Edify School

Location:
Thikkonda

Allow:
- School logo
- Address
- Phone
- Email
- Website
- Receipt footer
- Principal name

Store settings in LocalStorage.

==================================================
22. LOCAL STORAGE DATA ARCHITECTURE
==================================================

Create a clean LocalStorage architecture.

Use keys such as:

edify_auth
edify_users
edify_cashiers
edify_students
edify_parents
edify_classes
edify_sections
edify_fee_structures
edify_fee_terms
edify_payments
edify_receipts
edify_academic_years
edify_school_settings

Create reusable helper functions:

setStorage()
getStorage()
removeStorage()
updateStorage()

Initialize demo data only when no data exists.

Do NOT overwrite existing LocalStorage data on every reload.

==================================================
23. DEMO DATA
==================================================

Include realistic demo data so the application looks complete immediately after startup.

Create:
- 30+ students
- Multiple classes
- Multiple sections
- Parents
- Fee structures
- Fee installments
- Payment records
- Receipts
- 2â€“3 cashier accounts

Use realistic Indian school data.

Do not use fake-looking random names everywhere.

==================================================
24. SIDEBAR
==================================================

Create a modern responsive sidebar.

Logo at top.

Admin navigation:

Dashboard
Admissions
Students
Classes & Sections
Fee Structure
Fee Terms
Fee Collection
Payment History
Receipts
Reports
Academic Years
Cashiers
School Settings

Cashier navigation:

Dashboard
Students
Fee Collection
Payment History
Receipts
Reports

Highlight active route.

Sidebar should:
- Collapse on desktop
- Become drawer on mobile
- Animate smoothly

==================================================
25. HEADER
==================================================

Header should contain:

- Sidebar toggle
- Page title
- Academic year selector
- Search
- Notification icon
- User profile
- Role badge
- Logout

For cashier:

Show cashier name and "Cashier" role.

For admin:

Show admin name and "Super Admin" role.

==================================================
26. RESPONSIVE DESIGN
==================================================

This is extremely important.

Desktop:
- Full sidebar
- Large dashboard
- Tables

Tablet:
- Collapsible sidebar
- Responsive cards

Mobile:
- Drawer navigation
- Stacked cards
- Horizontal scrolling only where absolutely necessary
- Tables should transform into cards where practical
- Forms should use one-column layout
- Buttons should remain easily tappable
- Dashboard statistics should stack properly

Test the application at:
- 1440px
- 1280px
- 1024px
- 768px
- 480px
- 375px

==================================================
27. UX DETAILS
==================================================

Add:
- Toast notifications
- Confirmation dialogs
- Loading states
- Empty states
- Error states
- Form validation
- Success states
- Search debounce where appropriate
- Keyboard-friendly forms
- Accessible labels
- Focus states

Examples:

After adding student:

"Student successfully admitted."

After payment:

"Payment collected successfully. Receipt #ED-2026-0001 generated."

After cashier creation:

"Cashier account created successfully."

==================================================
28. SECURITY SIMULATION
==================================================

This is a frontend-only project, so this is NOT real authentication.

Implement role-based access only as a frontend demonstration using LocalStorage.

Clearly structure the code so a real backend/JWT authentication system can replace it later.

Do not claim that LocalStorage authentication is production security.

==================================================
29. CODE QUALITY
==================================================

Use a clean component architecture.

Suggested structure:

src/
  components/
  layouts/
  pages/
    auth/
    admin/
    cashier/
    students/
    admissions/
    fees/
    reports/
    settings/
  routes/
  hooks/
  utils/
  services/
  data/
  context/
  assets/

Create reusable components:

Button
Input
Select
Modal
Table
Badge
Card
StatCard
SearchBar
DatePicker
Pagination
Toast
ConfirmDialog
EmptyState
PageHeader
FormSection
LoadingSpinner

Avoid putting everything into one large component.

==================================================
30. IMPORTANT IMPLEMENTATION RULES
==================================================

- Do not build a backend.
- Do not use Supabase.
- Do not use Firebase.
- Do not use external APIs.
- Use LocalStorage only.
- Do not change the Edify School branding.
- Use the uploaded Edify School logo.
- Use the logo's orange, black and white color identity.
- Use professional sans-serif typography.
- Keep the UI consistent across every page.
- Admin and Cashier dashboards must be visually and functionally different.
- Admin must control Cashier account creation/access.
- Cashier must only access permitted modules.
- All CRUD operations must persist after browser refresh.
- Do not lose LocalStorage data on refresh.
- Do not overwrite existing data when initializing demo data.
- Use realistic school data.
- Make the application production-quality from a UI/UX perspective even though the data layer is LocalStorage.
- Do not add unnecessary modules that are not required by the provided requirements.

==================================================
31. FINAL TESTING
==================================================

Before finishing:

1. Run the project.
2. Verify login.
3. Verify Super Admin dashboard.
4. Verify Cashier dashboard.
5. Verify admin can create cashier.
6. Verify cashier login.
7. Verify unauthorized cashier routes are blocked.
8. Add a student.
9. Refresh browser.
10. Confirm student still exists.
11. Create a fee structure.
12. Collect a payment.
13. Generate receipt.
14. Refresh browser.
15. Confirm payment and receipt still exist.
16. Reprint receipt.
17. Test search and filters.
18. Test reports.
19. Test academic year.
20. Test responsive design.
21. Check console for errors.
22. Fix all build/runtime errors.
23. Make sure `npm run build` succeeds.

IMPORTANT FINAL REQUIREMENT:

Do not create a generic school admin template.

Create a unique, premium, professional school management experience specifically designed for EDIFY SCHOOL THIKKONDA.

The final interface should look like a real commercial school management product that a school could confidently demonstrate to administrators and cashiers.

One important architectural decision

For this particular project, LocalStorage is fine for the frontend prototype/demo, but don't present it as production-grade security or multi-user storage. If the school later wants multiple computers/cashiers using the same live data simultaneously, you'll need a backend/database.

For now, your flow can be:

React + LocalStorage â†’ build â†’ deploy frontend â†’ demonstrate to Edify School.

The quotation itself specifies the system as a web application for a single school, with Super Admin and Cashier roles, so this prompt keeps the implementation focused instead of turning it into the larger multi-school ERP you have worked on previously.

## Development

Install dependencies and start the app locally:

```sh
npm install
npm run dev
```

Create a production build with `npm run build` and serve it locally with `npm run preview`.
