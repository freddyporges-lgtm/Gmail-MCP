# Gmail-MCP

> A local MCP server that gives Claude read/write access to my Gmail — the first building block toward an AI assistant that doesn't just organize my inbox, but tells me what actually matters.

---

## The Problem

I have a contradictory relationship with my inbox.

I *want* a full, noisy inbox. I subscribe to newsletters across ads, tech, parenting, finance, travel, and product. I want all of it flowing in — it's how I stay informed, get ideas, and feel connected to things I care about. The volume is intentional.

But I also hate unread emails. The little badge drives me insane. An inbox with 847 unread feels like failure even when most of those are newsletters I chose to receive.

And underneath all of that, there's the real problem: important things get buried. A note from my kid's school. A bill that's about to be due. A message from someone I actually need to respond to. These get swallowed by the same inbox that also contains three Substack digests, a flight deal alert, and a recruiter cold email.

Gmail's native filters helped a little. I could route newsletters to a label, skip the inbox for certain senders. But the logic is static and dumb — it doesn't know that an email from a newsletter I subscribe to might occasionally contain something genuinely time-sensitive. It can't tell me "hey, this one's different." It just files and forgets.

What I actually needed wasn't better organization. It was a smarter assistant — something that could receive everything I want to receive, keep it out of my way by default, and surface the signal when it matters.

---

## The Vision

My inbox is effectively my central information repository. Work, personal life, finances, parenting, travel, entertainment — it all lands there. The problem isn't that I get too much. The problem is that nothing is helping me prioritize across all of it.

The end state I'm building toward: an agent that sits on top of my inbox, understands the full landscape of what's coming in, and proactively tells me what I need to pay attention to. Not a filter that routes things. An assistant that reasons about importance and surfaces it to me.

That means:
- **Everything gets categorized** — newsletters, work threads, personal, finance, travel, parenting — cleanly separated so I can engage with each on its own terms
- **Nothing interrupts by default** — all of it out of the inbox, zero unread count, total silence unless it matters
- **The agent decides what matters** — and tells me, unprompted, when something needs my attention

Gmail-MCP is step one. Before an agent can reason about my inbox, it needs programmatic access to it. This server is the plumbing.

---

## What It Does Today

Gmail-MCP is a locally-run MCP (Model Context Protocol) server that connects Claude directly to my Gmail account. Right now it handles the organizational layer — giving Claude the ability to create and manage the labels and filters that form the structure the future agent will reason on top of.

- Lists all existing labels and filters so Claude knows the current state before making changes
- Creates new labels with custom visibility settings
- Creates filters based on sender, subject, keywords, or freeform Gmail query logic
- Bulk creates multiple filters in one operation
- Deletes outdated filters and labels

In practice: instead of clicking through Gmail's settings UI, I describe what I want in plain English and Claude handles the API calls. "Label everything from Substack, skip the inbox, but flag anything where the subject line sounds time-sensitive" — that kind of thing.

---

## Key Tradeoff: MCP Server vs. Standalone Script

I could have built a simpler standalone script — a config file of filter rules that gets applied to Gmail in one shot. Faster to build, easier to run.

But a script is static. You define rules upfront and that's it. There's no way to ask "what filters do I already have?" before adding new ones, no feedback loop, no iteration. Every change requires editing code and re-running.

The reason I needed MCP is that my inbox is dynamic. My life doesn't fit into a fixed set of rules I can define once and walk away from. What counts as "important" shifts — by season, by what's going on at work, by what's happening with my family. I needed an interface that could adapt with me, not just execute a fixed config.

Building as an MCP server means Claude becomes the interface. I can have a conversation about my inbox, make decisions mid-stream, and evolve the organizational structure over time without touching code. That's the foundation the agent layer needs to work on top of.

The cost is complexity. OAuth setup, local server config, keeping it running. Not plug-and-play. Worth it for where this is going.

---

## What I Learned

**The real problem wasn't organization, it was prioritization.** I started this thinking I needed smarter filters. Halfway through I realized filters are just a prerequisite — the actual thing I'm trying to build is an agent that reasons about importance across the full surface area of my life. That reframe changed what I built and why.

**Static rules don't match dynamic lives.** Gmail's filter UI makes you think in terms of fixed sender/subject logic. But the things I care about don't map cleanly onto rules. The email from a newsletter I subscribe to that happens to contain something time-sensitive — a rule can't catch that. A reasoning agent can. That's the gap I'm trying to close.

**OAuth is always the hard part.** The Gmail API integration itself was straightforward. Handling token refresh and keeping the auth state stable without requiring me to re-authorize constantly — that took longer than everything else combined.

**MCP as a pattern is worth understanding firsthand.** A Gmail MCP connector already exists inside Claude.ai. I built my own anyway because I wanted to understand the pattern — how tools get exposed to LLMs, what the server/client boundary looks like, where the friction lives. That mental model is the foundation for building the agent layer on top of.

---

## What's Next

The filter and label infrastructure is the foundation. The next layer is the agent itself — something that monitors incoming mail, reasons about what's important given context it understands about me, and surfaces it proactively.

Practically, that means:
- A categorization layer that routes everything correctly by default (newsletters, work, personal, finance, travel, parenting)
- An importance-scoring pass that flags things that need attention regardless of category
- A daily or on-demand digest: "here's what came in, here's what you need to act on"

The goal is an inbox that's always at zero unread, always fully received, and always has someone watching it for me.

---

## Setup

Runs locally. You'll need Node.js and a Google Cloud project with Gmail API enabled and OAuth 2.0 credentials (Desktop app type).

```bash
git clone https://github.com/freddyporges-lgtm/Gmail-MCP
cd Gmail-MCP
npm install
```

Add your OAuth credentials, run the auth flow once to generate your token, then point your Claude Desktop config at the server. Full instructions in `SETUP.md`.

---

*Part of my broader exploration of AI-augmented PM workflows. More at [github.com/freddyporges-lgtm](https://github.com/freddyporges-lgtm).*
