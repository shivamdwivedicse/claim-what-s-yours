# Claim What's Yours

**आपका हक़, आपके हाथ।** (Your right, in your hands.)

Built for the **CODEBENDERS ACE Builders Hackathon 2026**, Problem Statement 5: Citizens and Public Services.

Many low-income students and families in Uttar Pradesh miss government benefits because they do not know a scheme exists, are unsure if they qualify, or do not know which documents to bring. Describe your family in plain Hindi or English (typed or spoken), and Claim What's Yours shows the schemes you are **likely eligible** for, why, which documents to keep ready, and how to apply.

## Features

- **Plain-language input** in Hindi or English, plus Hindi/English **voice input** (browser speech recognition).
- **Transparent matching:** every rule is checked and shown as pass, fail or unknown. Each result says why it fits.
- **Family-wise matching:** add family members (mother, sibling, grandparent) and see schemes for each person.
- **Smart follow-up questions** when a detail is missing, and a **"Not matched, and why"** section.
- **Missed Money:** an estimate of the yearly benefit amount a family may be leaving unclaimed.
- **Document checklist, apply steps and official links** for each scheme, with a "last verified" date.
- **My Applications:** track schemes, last dates and progress, with warnings when a deadline is within 7 days.
- **Live AI search (optional):** Gemini with Google Search finds extra schemes beyond the stored data. These are labelled *unverified*, limited to `.gov.in` / `.nic.in` links, and never counted in Missed Money.
- Warm, minimal UI with a landing page, animated tabs and a guided tour by two guides, Raju and Asha. Works in English and Hindi.

## Guardrails

- Wording is always "likely eligible", never a guarantee.
- The app never asks for Aadhaar or any ID number.
- Scheme rules are stored as editable data (`schemes.js`) with source notes and verification dates. An admin page allows editing.
- Only a whitelist of typed values (age, class, category, income band and similar) is sent to the AI. No free text, names or phone numbers.
- AI results are separated from verified data, and links are checked to be official government domains.
- Information comes from public scheme pages. Rules change, so always confirm on the official website.

## Tech

- Front end: plain HTML, CSS and vanilla JavaScript. No build step.
- Back end (only for live search and serving the site): Node.js and Express.
- AI: Google Gemini API (`gemini-2.5-flash-lite` with Google Search grounding by default, with fallbacks).

## Run locally

Requires Node.js 18 or newer.

```bash
cd server
npm install
cp .env.example .env     # Windows: copy .env.example .env
# open .env and set GEMINI_API_KEY=your_key
npm start
```

Open http://localhost:3000.

The stored-scheme matching works with no API key at all. Without a key, only the "Search live (AI)" button is disabled.

Get a free key at https://aistudio.google.com/apikey. To list models your key can use, run `npm run models`.

### Environment variables (`server/.env`)

| Name | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Your Gemini key. Never commit it. |
| `GEMINI_MODEL` | Optional. Comma-separated model names to try first. |
| `PORT` | Optional. Default 3000. |
| `RATE_PER_MIN` | Optional. Live searches allowed per minute per user. Default 8. |
| `ALLOW_UNGROUNDED` | Optional. Set to `1` to allow answers without Google Search. |

## Project structure

```
index.html        page layout and all views
ui.css            styles
schemes.js        scheme data (editable rules, amounts, sources)
app.js            parser, eligibility engine, results, tracking
admin.js          scheme editor
characters.js     Raju and Asha illustrations
landing.js        landing page, tabs, language toggle
tour.js           guided tour
api.js            live AI search UI
server/           Express server and Gemini proxy
```

## Notes

- The UP scholarship window for 2026-27 closed on 31 Oct 2026. Check the official portal for any extension.
- Scheme data last verified: 21 Nov 2026.

## License

MIT (add a LICENSE file if you want it published that way).