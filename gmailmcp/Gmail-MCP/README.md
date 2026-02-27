# Gmail MCP Integration — AI-Powered Inbox Management

> **A PM's zero-inbox system built with Claude + Gmail MCP**
> Automated labeling, priority triage, and a daily digest — all without writing a single line of Python.

---

## The Problem

My Gmail inbox was useless as a signal. 79,000+ emails, no consistent organization, and an unread count that meant nothing because newsletters, order confirmations, and messages from my family all looked the same.

The real cost wasn't the clutter — it was the cognitive overhead of deciding what to act on every time I opened my inbox. I wanted one thing: to open Gmail and immediately know what actually needs my attention today.

---

## The Solution

An AI-powered inbox system built on top of [Claude's MCP (Model Context Protocol)](https://docs.claude.com) that handles three jobs:

1. **Smart labeling** — 10 categories with consistent rules for what gets labeled and whether it stays unread
2. **Priority surfacing** — a ⚡ Priority label for VIP contacts, identified both explicitly and by analyzing 12 months of sent mail frequency
3. **Daily briefing** — a single morning email that leads with anything needing attention, followed by a curated newsletter digest

The entire system required no code. It was built conversationally using Claude in Cowork mode with Gmail MCP tools.

---

## System Architecture

```
Incoming Email
      │
      ▼
┌─────────────────────────────┐
│     Gmail Filter Layer      │  ← 23+ filters, runs on every email
│  (labels + mark-as-read)    │
└─────────────────────────────┘
      │
      ├──► ⚡ Priority     (stays unread — needs attention)
      ├──► 💼 Work/Career  (stays unread — potentially actionable)
      ├──► 🔧 Dev Tools    (stays unread — may need response)
      ├──► 🏠 Local        (stays unread — optional engagement)
      ├──► 💰 Finance      (marked read — surfaced in triage if urgent)
      ├──► 📰 Newsletters  (marked read — consumed via daily digest)
      ├──► 🛒 Orders       (marked read — reference only)
      └──► 🔔 Alerts       (marked read — noise reduced)
                │
                ▼
     ┌─────────────────────┐
     │  Daily 8am Briefing │  ← Claude agent, runs on schedule
     │  ┌───────────────┐  │
     │  │ 🔴 Triage     │  │  Scans ⚡ Priority + inbox
     │  ├───────────────┤  │  for anything actionable
     │  │ 📰 Digest     │  │  Summarizes top newsletters
     │  └───────────────┘  │  by category
     └─────────────────────┘
                │
                ▼
     ┌─────────────────────┐
     │ Weekly Friday Audit │  ← Self-improving filter system
     │ Finds gaps, creates │
     │ new filters, emails │
     │ summary of changes  │
     └─────────────────────┘
```

---

## Label Taxonomy

| Label | What it catches | Mark as read? |
|-------|----------------|---------------|
| ⚡ Priority | VIP contacts (family, top 8 by sent frequency) | No |
| 💼 Work/Career | Work domain, LinkedIn, recruiters | No |
| 🔧 Dev Tools | GitHub, Vercel, Netlify, Supabase, Cloudflare, etc. | No |
| 🏠 Local | Nextdoor, Gothamist, NY1, Timeout, Streetsblog | No |
| 💰 Finance | Banks, financial institutions, payment/statement alerts | Yes |
| 📰 Newsletters | Ad tech, general news, anything with "unsubscribe" | Yes |
| 🛒 Orders | Order confirmations, shipping, delivery, tracking | Yes |
| 🔔 Alerts | Security alerts, 2FA codes, sign-in notifications | Yes |

---

## VIP Identification Method

The ⚡ Priority label uses two inputs:

**Explicit:** Named contacts by last name (family, close friends)

**Data-driven:** Analyzed 12 months of sent mail to rank recipients by frequency. Top 8 non-family contacts were automatically included. This caught professional contacts — financial advisor, accountant, a recurring school contact — that wouldn't have been obvious to list manually.

Sent mail frequency is a better signal than received mail because it reflects who you actually chose to engage with, filtering out newsletters, receipts, and cold outreach.

---

## Daily Briefing

Every morning at 8am, a Claude agent sends a single HTML email:

```
☀️ Morning Briefing — Friday, Feb 27

🔴 NEEDS YOUR ATTENTION
• Cristina Puleo — "Q1 portfolio review" — Asking for a call next week
• Corrie Martin — "Schedule update" — Rescheduling Thursday's appointment

────────────────────────────────

📰 NEWSLETTER DIGEST

Ad Tech & Media
• AdExchanger: Trade desk reports strong Q4 despite cookie deprecation headwinds...
• Digiday: Publishers pivoting to first-party data as Google delays roll out...

General News
• Semafor: Federal reserve signals two rate cuts by end of Q2...
• WSJ: AI chip export controls tighten, Nvidia faces new restrictions...

────────────────────────────────
2 priority items · 14 newsletters processed
```

---

## Tradeoffs and Decisions

**Newsletters: mark as read on arrival vs. archive**
I chose mark-as-read (not archive) so newsletters are still accessible by label but don't inflate the unread count. Archive would make them harder to find; leaving them unread would make the count meaningless.

**Priority identification: manual vs. frequency-based**
A pure manual list is high maintenance and biased toward people you remember. Pure frequency-based misses new important contacts and over-weights noisy relationships. I used both — explicit for family/named contacts, frequency-based for professional contacts.

**Triage + digest as one email vs. two separate emails**
One email reduces daily touchpoints and keeps the morning routine to a single open. The tradeoff is that if the triage section is urgent, it's mixed with lower-priority content. This is mitigated by putting triage first and keeping the digest scannable rather than deep.

**Weekly audit: auto-create filters vs. propose + confirm**
Auto-create is faster and keeps the system zero-touch. The risk is an aggressive filter misfiling something important. Mitigated by the audit email surfacing every change made and the triage agent catching anything that falls through.

**Catch-all newsletter filter using "unsubscribe"**
Gmail can search email body content. Any email containing "unsubscribe" is almost certainly a newsletter or marketing email. This catches senders not explicitly in the domain list. The downside: it can overlap with Finance or Order emails. Acceptable because those labels take precedence and the newsletter label is low-stakes.

---

## What I Learned

**Subdomain matching in Gmail filters is not automatic.** `from:nextdoor.com` does not catch `no-reply@rs.email.nextdoor.com`. Domain-level filter rules need to account for common sending subdomains (e.g., `email.nextdoor.com`, `alert.ally.com`). The weekly audit catches these gaps automatically going forward.

**Sent mail is a better VIP signal than received mail.** When I analyzed received mail frequency, it was dominated by newsletters and automated notifications. Sent mail showed actual human relationships. The top 8 contacts from sent mail analysis included people I'd have missed on a manual list.

**Filters only apply forward, not retroactively.** Gmail filters don't label existing emails — only new ones. Building the system required a separate process to backfill labels. Worth knowing upfront so you plan for it.

**The briefing email is the keystone.** Without it, marking newsletters as read would mean losing them entirely. The daily digest is what makes the zero-inbox approach functional — it's not just noise reduction, it's a replacement consumption model.

---

## Setup

### Prerequisites
- Gmail account
- Claude account with Cowork mode
- Gmail MCP integration enabled in Cowork

### Configuration
1. Copy `.env.example` to `.env` and fill in your credentials (see `.env.example`)
2. Review `filters/filter-config.json` and update with your VIP contacts and domains
3. Import scheduled task prompts from `scheduled-tasks/` into your Cowork scheduled tasks

### Adapting for Your Inbox
- Replace placeholder domains in `filter-config.json` with your actual work domain, financial institutions, etc.
- Update VIP contacts with your own family/key contacts
- Run a sent mail frequency analysis to identify your top non-family contacts over the past 12 months
- Adjust mark-as-read behavior per label based on your own preferences

---

## Folder Structure

```
Gmail-MCP/
├── README.md                        # This file
├── .env.example                     # Credential template (never commit .env)
├── .gitignore
├── filters/
│   └── filter-config.json           # All filter rules (anonymized)
└── scheduled-tasks/
    ├── daily-briefing.md            # Morning triage + digest agent
    └── weekly-audit.md              # Self-improving filter audit
```

---

## Built With

- [Claude](https://claude.ai) — AI agent (Cowork mode)
- [Gmail MCP](https://docs.claude.com) — Gmail API integration via Model Context Protocol
- No code required

---

*Built by Freddy Porges — AI PM @ PayPal*
*[LinkedIn](https://linkedin.com/in/freddyporges)*
