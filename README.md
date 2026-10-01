# Wared · وارد: an AI front-desk operator for construction offices

> Run the front desk. Then automate it.

**Wared** (Arabic for "incoming", as in *سجل الوارد*, the incoming correspondence register) handles the administrative work that reaches a construction management office: letters, emails, WhatsApp messages, phone calls and visitors. It understands each item, does the routine work itself, sends exceptions to a person, and records everything.

It is not a chatbot. It is a workflow with AI at the intake step and fixed rules at the decision step.

```
 Incoming work ──▶ AI understands it ──▶ AI does the routine work ──▶ People approve the exceptions ──▶ Everything is recorded
 letter, email,     sender, project,       log, route, follow-ups,      replies to outside parties,       register, follow-ups,
 WhatsApp, call,    urgency, deadlines     reminders                    doubtful routing                  audit log
 visitor
```

## Why construction?

Every letter that reaches a construction consultancy starts a clock. A Notice of Claim under FIDIC 2017 gives the Engineer **14 days** to say it is time-barred; after that it is deemed valid. An interim payment statement starts a **28-day** certification period. An RFI blocks a concrete pour. At the front desk these arrive mixed together, in Arabic and English. Wared makes sure none of them is missed.

## What's in the app

| Screen | What it does |
| --- | --- |
| **Command Center** | Today's interactions, AI vs. human actions, pending approvals, overdue follow-ups, visitors on site, estimated time saved, a "needs a person" queue and live activity. **Every number is counted from the app's own records.** |
| **Intake** | Paste text or drop a scan, photo or PDF. Gemini extracts sender, project, type, urgency, deadlines and owner, and drafts bilingual acknowledgements. Wared then shows a **workflow plan**: which steps run automatically and which wait for a person. |
| **Approvals** | Replies to outside parties and low-confidence routing wait here. Each shows *why* it needs a person. You can edit the English/Arabic draft, then approve, open it in email, or reject. |
| **Register** | The incoming register (*سجل الوارد*): reference numbers, owners, next deadline countdowns, status, search, CSV export. |
| **Follow-ups** | Created from deadlines, calls and requests, or by hand. Grouped into overdue / today / this week, each with an owner, due date and source. Renewals (insurance, licences) live here too. |
| **Visitors** | Expected guests, walk-ins, check-in/out, host notification and meeting-room clash detection. AI quick-add turns "Eng. Sami is coming tomorrow at 2 to see Lina, boardroom" into a booking. |
| **Audit log** | Every action by the AI or a person, with time, detail and the record it touched. |
| **Ask Wared** | An assistant that answers from the office's own records ("Who is handling the Stone Horizon claim?", "Who is visiting today?", in English or Arabic). It can *propose* a follow-up; a person clicks to create it. |
| **Team & projects** | Plain-language routing rules and project contract forms that the AI reads on every item. No retraining needed. |

## Try it (3 minutes)

1. **Command Center**: look at what is waiting. One RFI response is overdue and two replies are awaiting approval.
2. **Intake → "Arabic notice of claim" → Analyse → Run workflow.** An Arabic letter becomes an English record, routed to the Contracts Manager, with the 14-day FIDIC 20.2.2 time-bar as a follow-up. The acknowledgement waits for approval.
3. **Approvals**: read why it needs you, switch the draft between English and Arabic, approve it.
4. **Ask Wared**: "Who is handling the Stone Horizon claims and what is due this week?", then "Create a follow-up for Lina to confirm the Area C handover date by Sunday."
5. **Audit log**: every step above, labelled AI or human.

Other samples: an RFI with a pour date, a design-review meeting request, a phone enquiry from a prospective client, a courier delivering arbitration papers (mixed Arabic/English WhatsApp message), and an interim payment application. All companies, people and projects are fictional.

## Guardrails are code, not prompts

The model proposes; [`src/lib/workflow.ts`](src/lib/workflow.ts) decides. Prompt text can't switch these rules off:

- **Anything leaving the office needs approval.** Every external acknowledgement goes to Approvals. Contractual or financial items (notices, claims, variations, payments, disputes) get a stricter reason.
- **Doubtful routing needs approval.** A low-confidence project match on a substantive item raises a routing check.
- **Safe actions run automatically.** Logging, internal routing, follow-ups and reminders.
- **The server does the date math.** The model returns a period and the date it runs from; [`/api/triage`](src/app/api/triage/route.ts) computes every due date and discards unknown owners or projects.
- **Replies have limits.** Acknowledgements confirm receipt only, "without prejudice", and never comment on the merits.
- **Everything is logged.** Every AI and human action is written to the audit log, including approvals, rejections, status changes and deletions.
- **Metrics are honest.** Time saved is an *estimate* from logged AI actions using stated per-step minutes (shown in the UI). No accuracy figures are claimed that haven't been measured.

## Architecture

```
Next.js client (React)                         Route handlers (server)                Gemini
──────────────────────                         ───────────────────────                ──────
Intake ──── text / image / PDF ──────────────▶ /api/triage  ── prompt built from ───▶ multimodal read,
           + team rules + projects                            the office's rules      JSON-schema output
                                     ◀──────── normalised triage (dates recomputed)
planWorkflow() → auto steps + approvals
executePlan()  → register, follow-ups, approvals, audit

Assistant ── question + office snapshot ─────▶ /api/ask      ──────────────────────▶ grounded answer,
                                     ◀──────── answer + optional proposed follow-up    optional follow-up
Visitors ─── free-text note ─────────────────▶ /api/visitor  ──────────────────────▶ structured booking
```

- **Model fallback chain.** [`src/lib/gemini.ts`](src/lib/gemini.ts) tries `gemini-3.8-flash`, then `gemini-flash-latest`, `gemini-3.5-flash` and `gemini-flash-lite-latest`, moving on when a model is overloaded or retired. That way a public demo link survives demand spikes. It uses low thinking for speed, has per-request timeouts and applies a best-effort rate limit.
- **State.** The demo keeps the whole office state in the browser (`localStorage`) so every reviewer gets their own sandbox. Production would use Postgres with an append-only audit table.

## Run locally

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY from https://aistudio.google.com/apikey
npm run dev
```

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Google Gemini (`@google/genai`, structured output) · lucide icons · Vercel.

## What's next

- Postgres, user accounts and roles (reception, managers), with approvals tied to a named approver
- Microsoft 365 / Gmail connection to auto-ingest a shared `frontdesk@` inbox and actually send approved replies
- Calendar integration for real meeting-room and participant availability
- WhatsApp Business webhook for incoming messages, and reminders 48 hours before each deadline
- An outgoing register (*الصادر*) linked to the incoming items it answers
- Measured classification and routing accuracy from human corrections (every routing override is already logged)
