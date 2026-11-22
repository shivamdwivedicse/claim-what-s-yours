// schemes.js - verified UP student and family schemes for "Claim What's Yours".
// Loaded with a plain <script src="schemes.js"> tag. No modules.
// Last checked against official or secondary sources on 2026-11-21.
// verify_flag: true = limit or amount came from a secondary source or sources disagree; the app shows a "confirm" note.
// income_limit_by_category / income_limit_by_place override the income rule when the profile knows that value.
// stage_amounts picks the highest class_min that is <= the student's class.

const SCHEMES = [
  {
    id: "up-pre-matric",
    name: "UP Scholarship: Pre-Matric (Class 9-10)",
    category: "Scholarship",
    benefit_text: "State scholarship for Class 9 and 10 students of Uttar Pradesh studying in a recognised school. The amount varies, so please check the portal.",
    benefit_amount_per_year: null,
    rules: [
      { field: "state", operator: "==", value: "UP", label: "Uttar Pradesh resident" },
      { field: "education_level", operator: ">=", value: 9, label: "Class 9 or above" },
      { field: "education_level", operator: "<=", value: 10, label: "Class 10 or below" },
      { field: "income", operator: "<=", value: 250000, label: "Family income limit" }
    ],
    documents: [
      "UP domicile (residence) certificate",
      "Current income certificate",
      "Caste certificate (if SC, ST or OBC)",
      "Previous class marksheet",
      "Bonafide or admission proof from the school",
      "Current-year fee receipt",
      "Bank passbook in the student's own name",
      "Aadhaar card (keep a copy ready; do not type the number here)"
    ],
    apply_steps: [
      "Open scholarship.up.gov.in and complete the One Time Registration (OTR) with the student's details.",
      "Log in and choose Pre-Matric, then Fresh or Renewal.",
      "Fill personal, school and bank details and upload the documents.",
      "Submit, download the confirmation page, and ask the school to verify the form."
    ],
    deadline: "Fresh applications for 2026-27 closed on 31 Oct 2026 (sources differ). Check the portal for an extension or the next cycle.",
    official_url: "https://scholarship.up.gov.in",
    last_verified: "2026-11-21",
    fee: 0,
    verify_flag: true,
    source_note: "Careers360 and Buddy4Study 2026-27 articles; income limit for OBC and Minority at pre-matric level is not clearly stated, confirm on the portal."
  },
  {
    id: "up-post-matric",
    name: "UP Scholarship: Post-Matric (Class 11, college, ITI, diploma)",
    category: "Scholarship",
    benefit_text: "State scholarship for Class 11 and above (including degree, diploma and ITI) for students of Uttar Pradesh. The amount varies, so please check the portal.",
    benefit_amount_per_year: null,
    income_limit_by_category: { SC: 250000, ST: 250000, OBC: 200000, General: 200000 },
    rules: [
      { field: "state", operator: "==", value: "UP", label: "Uttar Pradesh resident" },
      { field: "education_level", operator: ">=", value: 11, label: "Class 11 or above (or in college)" },
      { field: "category", operator: "in", value: ["SC", "ST", "OBC", "General"], label: "Caste category (needed to find your income limit)" },
      { field: "income", operator: "<=", value: 250000, label: "Family income limit" }
    ],
    documents: [
      "UP domicile (residence) certificate",
      "Current income certificate",
      "Caste certificate (if SC, ST or OBC)",
      "Previous exam marksheet",
      "Admission proof, student ID or bonafide certificate",
      "Current-year fee receipt",
      "Bank passbook in the student's own name",
      "Aadhaar card (keep a copy ready; do not type the number here)"
    ],
    apply_steps: [
      "Open scholarship.up.gov.in and complete the One Time Registration (OTR) with the student's details.",
      "Log in and choose Post-Matric (Intermediate or Other than Intermediate), then Fresh or Renewal.",
      "Fill personal, course and bank details and upload the documents.",
      "Submit, download the confirmation page, and get the form verified by the institution."
    ],
    deadline: "Fresh applications for 2026-27 closed on 31 Oct 2026 (sources differ). Check the portal for an extension or the next cycle.",
    official_url: "https://scholarship.up.gov.in",
    last_verified: "2026-11-21",
    fee: 0,
    verify_flag: true,
    source_note: "Buddy4Study and Careers360: SC/ST limit Rs 2.5 lakh, General/OBC/Minority Rs 2 lakh. One source says Rs 2 lakh for all, so confirm on the portal."
  },
  {
    id: "pm-yasasvi-pre-matric",
    name: "PM YASASVI Pre-Matric (OBC, EBC, DNT; Class 9-10)",
    category: "Scholarship",
    benefit_text: "Rs 4,000 per year for OBC, EBC and DNT students of Class 9 and 10 in government schools. Cannot be combined with another pre-matric scholarship. Up to two boys per family can benefit; there is no limit for girls.",
    benefit_amount_per_year: 4000,
    rules: [
      { field: "category", operator: "==", value: "OBC", label: "Category OBC (EBC and DNT also count)" },
      { field: "education_level", operator: ">=", value: 9, label: "Class 9 or above" },
      { field: "education_level", operator: "<=", value: 10, label: "Class 10 or below" },
      { field: "school_type", operator: "==", value: "government", label: "Studying in a government school" },
      { field: "income", operator: "<=", value: 250000, label: "Family income limit" }
    ],
    documents: [
      "OBC, EBC or DNT caste certificate",
      "Income certificate (needed once, at admission)",
      "Previous class marksheet",
      "School bonafide certificate",
      "Bank passbook",
      "Aadhaar card (keep a copy ready; do not type the number here)"
    ],
    apply_steps: [
      "Open scholarships.gov.in and register as a new applicant (One Time Registration).",
      "Choose the PM YASASVI Pre-Matric scholarship for OBC, EBC and DNT students.",
      "Fill your details, upload the documents and submit.",
      "The school verifies the application. Track the status on the portal."
    ],
    deadline: null,
    official_url: "https://scholarships.gov.in",
    last_verified: "2026-11-21",
    fee: 0,
    source_note: "Official NSP guideline PDF (PRE_MATRIC_OBC_GUIDELINES). Needs at least 75% attendance in the previous year."
  },
  {
    id: "nmmss",
    name: "National Means-cum-Merit Scholarship (NMMSS)",
    category: "Scholarship",
    benefit_text: "Rs 12,000 per year from Class 9 to Class 12 for students selected in the state test held in Class 8. You need at least 55% in Class 7 (50% for SC/ST) to appear, then a pass in the selection test. Renewal needs 60% in Class 10.",
    benefit_amount_per_year: 12000,
    rules: [
      { field: "state", operator: "==", value: "UP", label: "Uttar Pradesh resident" },
      { field: "education_level", operator: "==", value: 8, label: "Class 8 student (selection test year)" },
      { field: "income", operator: "<=", value: 350000, label: "Family income limit" }
    ],
    documents: [
      "Class 7 marksheet",
      "Income certificate",
      "Caste certificate (if SC or ST)",
      "School enrolment proof",
      "Bank passbook",
      "Aadhaar card (keep a copy ready; do not type the number here)"
    ],
    apply_steps: [
      "Ask your school head teacher about the NMMSS selection test form for your state.",
      "Apply as the school or state notice says and appear in the Class 8 selection test.",
      "If selected, apply and renew every year on scholarships.gov.in.",
      "The money goes straight to the student's bank account."
    ],
    deadline: null,
    official_url: "https://scholarships.gov.in",
    last_verified: "2026-11-21",
    fee: 0,
    verify_flag: true,
    source_note: "Official education ministry page (dsel.education.gov.in/scheme/nmmss). Scheme continuation was approved till FY 2025-26; confirm it continues for 2026-27."
  },
  {
    id: "kanya-sumangala",
    name: "Mukhyamantri Kanya Sumangala Yojana (UP)",
    category: "Direct benefit",
    benefit_text: "One-time amounts in stages, Rs 25,000 in all: birth 5,000, full immunisation 2,000, Class 1 admission 3,000, Class 6 admission 3,000, Class 9 admission 5,000, and 7,000 after passing Class 10 or 12 and joining a degree or diploma. The amount shown is the stage linked to the girl's current class. Maximum 2 girls and 2 children per family.",
    benefit_amount_per_year: null,
    stage_amounts: [
      { class_min: 1, amount: 3000 },
      { class_min: 6, amount: 3000 },
      { class_min: 9, amount: 5000 },
      { class_min: 10, amount: 7000 }
    ],
    rules: [
      { field: "gender", operator: "==", value: "female", label: "Girl child" },
      { field: "state", operator: "==", value: "UP", label: "Uttar Pradesh resident" },
      { field: "income", operator: "<=", value: 300000, label: "Family income limit" }
    ],
    documents: [
      "Bank passbook of the mother, father, guardian or the girl",
      "Domicile or address proof (ration card, voter ID, electricity or phone bill)",
      "Recent photo of the girl",
      "Immunisation card (for the immunisation stage)",
      "Admission certificate for Class 1, 6 or 9 (for those stages)",
      "Class 10 or 12 marksheet or institute ID (for the last stage)",
      "Death certificate, if a parent has passed away"
    ],
    apply_steps: [
      "Register on the citizen portal mksy.up.gov.in and activate your profile.",
      "Add the girl as a beneficiary and complete the verification on the portal.",
      "Fill the form for the right stage and submit the declaration.",
      "Print the application and track its status online."
    ],
    deadline: null,
    official_url: "https://mksy.up.gov.in",
    last_verified: "2026-11-21",
    fee: 0,
    source_note: "Official MKSY presentation PDF and eligibility page (mksy.up.gov.in)."
  },
  {
    id: "csss-college",
    name: "Central Sector Scholarship for College Students (CSSS)",
    category: "Scholarship",
    benefit_text: "Rs 12,000 per year for degree students (first 3 years) and Rs 20,000 per year for postgraduate study. You need to be above the 80th percentile in the Class 12 board exam in a regular degree course. Cannot be combined with another scholarship or fee waiver (for example the UP scholarship). Renewal needs 50% marks and 75% attendance.",
    benefit_amount_per_year: 12000,
    rules: [
      { field: "education_level", operator: ">=", value: 12, label: "Class 12 passed or in college" },
      { field: "marks_percent", operator: ">", value: 80, label: "Class 12 board percentile (not marks %)" },
      { field: "income", operator: "<=", value: 450000, label: "Family income limit" }
    ],
    documents: [
      "Class 12 marksheet",
      "Income certificate (fresh applicants only)",
      "College admission and fee proof",
      "Bank passbook",
      "Aadhaar card (keep a copy ready; do not type the number here)"
    ],
    apply_steps: [
      "Open scholarships.gov.in and register as a new applicant.",
      "Choose the Central Sector Scholarship for college and university students.",
      "Fill your Class 12, course and bank details and upload the documents.",
      "Submit and renew every year on the portal."
    ],
    deadline: null,
    official_url: "https://scholarships.gov.in",
    last_verified: "2026-11-21",
    fee: 0,
    verify_flag: true,
    source_note: "Official CSSS guideline PDF (scholarships.gov.in). The cut-off is a percentile rank in your board exam, not the marks percentage, so confirm your percentile on the portal."
  },
  {
    id: "minority-post-matric",
    name: "Post-Matric Scholarship for Minorities",
    category: "Scholarship",
    benefit_text: "For Muslim, Christian, Sikh, Buddhist, Jain and Parsi students from Class 11 to postgraduate level. A Class 11-12 day scholar gets up to Rs 7,000 course fee plus Rs 3,500 maintenance; hostellers and higher courses get different amounts. Maximum 2 students per family.",
    benefit_amount_per_year: null,
    stage_amounts: [
      { class_min: 11, amount: 10500 }
    ],
    rules: [
      { field: "minority", operator: "is_true", value: null, label: "Belongs to a notified minority" },
      { field: "education_level", operator: ">=", value: 11, label: "Class 11 or above (or in college)" },
      { field: "marks_percent", operator: ">=", value: 50, label: "At least 50% in the previous exam" },
      { field: "income", operator: "<=", value: 200000, label: "Family income limit" }
    ],
    documents: [
      "Minority community certificate",
      "Income certificate from the Tehsildar or equivalent office",
      "Previous exam marksheet",
      "Current course fee receipt",
      "Bank passbook",
      "Domicile certificate",
      "Bonafide certificate from the institution",
      "Passport-size photo (all files PDF or JPEG under 200 KB)",
      "Aadhaar card (keep a copy ready; do not type the number here)"
    ],
    apply_steps: [
      "Open scholarships.gov.in and register as a new applicant.",
      "Choose the Post-Matric Scholarship for Minorities.",
      "Fill personal, course, income and bank details and upload the documents.",
      "Submit, then track the institute and state verification on the portal."
    ],
    deadline: null,
    official_url: "https://scholarships.gov.in",
    last_verified: "2026-11-21",
    fee: 0,
    verify_flag: true,
    source_note: "Buddy4Study 2025 article. Amounts and the 2026-27 deadline need confirmation on NSP."
  },
  {
    id: "pm-kisan",
    name: "PM Kisan Samman Nidhi",
    category: "Direct benefit",
    benefit_text: "Rs 6,000 per year in three instalments of Rs 2,000 for landholding farmer families. The land must be in the family's name. Income tax payers, government or PSU employees and constitutional post holders are not eligible.",
    benefit_amount_per_year: 6000,
    rules: [
      { field: "occupation", operator: "==", value: "Farmer", label: "Farmer family" }
    ],
    documents: [
      "Land records (khatauni)",
      "Bank passbook",
      "Mobile number",
      "Aadhaar card (keep a copy ready; e-KYC is done on the PM-KISAN portal, not here)"
    ],
    apply_steps: [
      "Open pmkisan.gov.in, or visit a Common Service Centre, and register as a new farmer.",
      "Your land records are checked digitally.",
      "Complete e-KYC (OTP, biometric or face authentication).",
      "Track the beneficiary status on the portal or app."
    ],
    deadline: null,
    official_url: "https://pmkisan.gov.in",
    last_verified: "2026-11-21",
    fee: 0,
    source_note: "PIB official document (Nov 2025)."
  },
  {
    id: "up-old-age-pension",
    name: "UP Old Age Pension (Vridha Pension)",
    category: "Pension",
    benefit_text: "Monthly pension (Rs 1,000 at last report) for people aged 60 or above in low-income families in Uttar Pradesh. The UP government announced Rs 1,500 per month on 16 June 2026, but the start date is not confirmed. You must not receive any other pension.",
    benefit_amount_per_year: 12000,
    income_limit_by_place: { rural: 46080, urban: 56460 },
    rules: [
      { field: "age", operator: ">=", value: 60, label: "Age 60 or above" },
      { field: "state", operator: "==", value: "UP", label: "Uttar Pradesh resident" },
      { field: "income", operator: "<=", value: 56460, label: "Family income limit" }
    ],
    documents: [
      "Recent photograph",
      "Age proof",
      "Income certificate",
      "Bank passbook",
      "Aadhaar card (keep a copy ready; do not type the number here)"
    ],
    apply_steps: [
      "Apply online on the SSPY UP portal, or ask at the Jan Suvidha Kendra, District Social Welfare Office or tehsil office.",
      "Fill the form and attach the documents.",
      "Save the registration number you get, and use it to track the application."
    ],
    deadline: null,
    official_url: "https://sspy-up.gov.in",
    last_verified: "2026-11-21",
    fee: 0,
    verify_flag: true,
    source_note: "Policybazaar article; the Rs 1,500 announcement is from Organiser (16 Jun 2026). Rural limit Rs 46,080, urban Rs 56,460. Confirm the portal address and amount at the district office."
  },
  {
    id: "up-widow-pension",
    name: "UP Widow Pension (Nirashrit Mahila Pension)",
    category: "Pension",
    benefit_text: "Monthly pension (Rs 1,000 at last report) for widows and destitute women aged 18 or above in low-income families in Uttar Pradesh. The UP government announced Rs 1,500 per month for destitute women on 16 June 2026, but the start date is not confirmed. You must not receive any other pension.",
    benefit_amount_per_year: 12000,
    rules: [
      { field: "widow_in_family", operator: "is_true", value: null, label: "Widow in the family" },
      { field: "state", operator: "==", value: "UP", label: "Uttar Pradesh resident" },
      { field: "income", operator: "<=", value: 200000, label: "Family income limit" }
    ],
    documents: [
      "Passport-size photograph",
      "Husband's death certificate",
      "Income certificate",
      "Bank passbook",
      "Aadhaar card (keep a copy ready; do not type the number here)"
    ],
    apply_steps: [
      "Apply online on the SSPY UP portal, or ask at the Jan Suvidha Kendra, District Social Welfare Office or tehsil office.",
      "Fill the form and attach the documents.",
      "Save the registration number you get, and use it to track the application."
    ],
    deadline: null,
    official_url: "https://sspy-up.gov.in",
    last_verified: "2026-11-21",
    fee: 0,
    verify_flag: true,
    source_note: "Policybazaar article; the Rs 1,500 announcement is from Organiser (16 Jun 2026). Confirm the portal address and amount at the district office."
  }
];
