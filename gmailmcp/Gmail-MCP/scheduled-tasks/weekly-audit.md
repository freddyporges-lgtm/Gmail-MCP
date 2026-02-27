# Weekly Filter Audit — Scheduled Task

**Schedule:** Every Friday at 9:00 AM (local time)
**Trigger:** Automated via Claude Cowork scheduled task runner
**Output:** HTML email summarizing new filters added

---

## What It Does

Reviews the past 7 days of email, identifies senders not caught by existing filters, creates new filters for recurring patterns, and emails a summary of changes made.

This makes the filtering system **self-improving** — it gets more comprehensive each week without manual maintenance.

---

## Design Decisions

**Why weekly instead of daily?**
Daily would be noisy and likely surface the same gaps repeatedly. Weekly gives enough volume to identify real patterns vs. one-off senders.

**Why auto-create filters vs. just reporting?**
The audit is meant to be zero-touch. If the agent identifies a gap and creates a fix, the user doesn't need to act. The email is a summary of what already happened, not a to-do list.

**Why Friday?**
End of week is a natural review point. If something was miscategorized, the Friday audit catches it before the weekend.

---

## Prompt Template

```
Search all emails from the past 7 days (newer_than:7d), up to 100 results.

For each email:
- Check if it has the appropriate label based on sender and content
- If not, determine whether it should be labeled and whether it's a recurring sender

For gaps identified:
- Create new Gmail filters using domain-level matching where possible
- Apply same mark-as-read behavior as existing filters for that label category

Send summary email to [user]@gmail.com:
- Subject: 🔍 Weekly Filter Audit — [Date]
- List all new filters created
- Total emails scanned
- Next audit date
```

---

## Mark-As-Read Policy by Label

| Label | Mark as Read? | Rationale |
|-------|--------------|-----------|
| 📰 Newsletters | ✅ Yes | Consumed via daily digest |
| 💰 Finance | ✅ Yes | Low urgency, findable when needed |
| 🛒 Orders | ✅ Yes | Reference only, no action required |
| 🔔 Alerts | ✅ Yes | Noise reduction |
| 💼 Work/Career | ❌ No | Potentially actionable |
| 🔧 Dev Tools | ❌ No | May require response |
| 🏠 Local | ❌ No | User may want to engage |
| ⚡ Priority | ❌ No | Always requires attention |
