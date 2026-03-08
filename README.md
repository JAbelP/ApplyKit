# ApplyKit

A Chrome extension that auto-fills job application forms with your saved profile data — so you spend less time retyping and more time applying.

> **Origin:** This extension was built in a single one-shot prompt to Claude as a practical demonstration of AI-assisted development, created as part of a job application to **Stern Security Inc.**

---

## Features

- **Multiple Profiles** — save distinct profiles (e.g. "Software Engineer", "Internship") and switch between them instantly
- **Smart Auto-Fill** — scores form fields by name, id, placeholder, aria-label, data attributes, and label text to map them to the right profile value
- **Dynamic Work Experience** — add, remove, and reorder multiple experience entries
- **Dynamic Education** — add, remove, and reorder multiple education entries
- **Resume Attachment** — attach a PDF or DOCX resume; the extension will find and populate the most relevant file input on any page
- **React / Angular Support** — dispatches synthetic `input` and `change` events so modern SPA frameworks register the filled values
- **Visual Feedback** — filled fields flash a green highlight; resume inputs flash amber

---

## Fields Supported

| Category | Fields |
|---|---|
| Personal | First name, Last name, Email, Phone |
| Address | Street, City, State, Zip |
| Online | LinkedIn URL, Portfolio / Website URL |
| Experience | Job title, Employer, Start date, End date, Current position |
| Education | Degree, School, Graduation year |
| Misc | Professional summary, Skills, Desired salary, Work authorization |
| Resume | PDF / DOCX file attachment |

---

## Installation (Developer Mode)

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the `ApplyKit` folder.
5. The ApplyKit icon will appear in your toolbar.

---

## Usage

1. Click the **ApplyKit** toolbar icon.
2. Click **New Profile** and fill in your information, then click **Save Profile**.
3. Navigate to any job application page.
4. Open ApplyKit, select your profile, and click **Fill Page**.
5. Filled fields will flash green. Review and submit the form as usual.

---

## Project Structure

```
ApplyKit/
├── manifest.json     # Extension manifest (Manifest V3)
├── popup.html        # Extension popup UI
├── popup.js          # Profile management & fill orchestration
├── popup.css         # Popup styles
├── content.js        # Lightweight content script (PING listener)
└── icons/
    ├── icon48.png
    └── icon128.png
```

---

## Tech Stack

- **Manifest V3** Chrome Extension API
- Vanilla JavaScript (no frameworks, no build step)
- `chrome.storage.local` for profile persistence
- `chrome.scripting.executeScript` for page injection
- `DataTransfer` API for programmatic file input population

---

## One-Shot Build

This entire extension — manifest, popup UI, styling, fill logic, resume attachment, and smart field-scoring — was generated from a **single prompt** to Claude (claude-sonnet-4-6). No iterative back-and-forth, no manual patching. It was submitted as a live demonstration of rapid, AI-assisted development for a position at **Stern Security Inc.**

---

## License

MIT
