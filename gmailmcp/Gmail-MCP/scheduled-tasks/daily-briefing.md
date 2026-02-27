# Daily Morning Briefing — Scheduled Task

**Schedule:** Every day at 8:00 AM (local time)
**Trigger:** Automated via Claude Cowork scheduled task runner
**Output:** HTML email delivered to user inbox

---

## What It Does

Sends a single morning email with two sections:

1. **🔴 Needs Your Attention** — Scans ⚡ Priority label and inbox for anything actionable in the past 24 hours. Flags emails with questions, requests, deadlines, or time-sensitive content.

2. **📰 Newsletter Digest** — Summarizes up to 15 newsletters from the past 24 hours, grouped into Ad Tech & Media and General News. Surfaces the 5–10 most worth reading.

If nothing urgent was found, the triage section reads: *"Nothing urgent today — inbox looking clean."*

---

## Design Decisions

**Why combine triage and newsletters in one email?**
Reduces the number of daily touchpoints. One email to open, two categories of information. Fewer context switches.

**Why newsletters marked as read before digest?**
Newsletters auto-mark as read on arrival so they don't inflate the unread count. The digest is the intended consumption point — you never need to open the originals unless something catches your eye.

**Why triage runs first?**
Priority items are surfaced before the newsletter content so the email leads with what matters most, not what arrived most recently.

---

## Prompt Template

```
Fetch emails labeled ⚡ Priority from the past 24 hours.
Fetch inbox emails from the past 24 hours not labeled as newsletters, orders, or alerts.
Assess each for urgency: questions directed at user, deadlines, payment issues, personal emails.

Separately, fetch up to 30 emails labeled 📰 Newsletters from the past 24 hours.
Read up to 15 and summarize by category (Ad Tech & Media, General News).

Compose and send an HTML email to [user]@gmail.com:
- Subject: ☀️ Morning Briefing — [Date]
- Section 1: 🔴 Needs Your Attention
- Section 2: 📰 Newsletter Digest
- Footer: X priority items · X newsletters processed
```
