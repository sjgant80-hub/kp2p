# 16 Widget Build Plan

## Priority: Maximize Revenue Destruction per Dev Hour

Based on 12/23/2025 SaaS pricing research, here are 16 widgets ranked by:
- **Annual cost killed** per typical user
- **Build complexity** (hours to ship)
- **Market size** (how many people pay for this)

---

## THE 16 TARGETS

### WEEK 1: Quick Kills (4 widgets, 1-2 days each)

#### 1. 📅 Scheduling (Kills Calendly)
**Their cost:** $10-16/seat/mo = **$120-192/yr**
**Build time:** 2 days
**Complexity:** Low

```
Features needed:
- Availability grid (P2P sync)
- Booking form
- Calendar embed
- Confirmation notifications
```

**File:** `src/widgets/calendar.html`

---

#### 2. 📊 Polls & Voting (Kills Typeform Polls, Slido)
**Their cost:** $20-50/mo = **$240-600/yr**
**Build time:** 1 day
**Complexity:** Very Low

```
Features needed:
- Create poll (multiple choice, rating)
- Real-time vote counting
- Results visualization
- Share link
```

**File:** `src/widgets/polls.html`

---

#### 3. 🚦 Status Page (Kills Statuspage.io, BetterStack)
**Their cost:** $29-79/mo = **$348-948/yr**
**Build time:** 1 day
**Complexity:** Very Low

```
Features needed:
- Service list with status
- Incident history
- Uptime percentage
- P2P status updates from admin
```

**File:** `src/widgets/status.html`

---

#### 4. 📋 Waitlist (Kills LaunchList, Waitlist.me)
**Their cost:** $30-50/mo = **$360-600/yr**
**Build time:** 1 day
**Complexity:** Very Low

```
Features needed:
- Email capture
- Position counter
- Referral tracking
- Export CSV
```

**File:** `src/widgets/waitlist.html`

---

### WEEK 2: High-Value Builds (4 widgets, 2-3 days each)

#### 5. 📋 Kanban Board (Kills Trello, Asana basics)
**Their cost:** $10-25/seat/mo = **$120-300/seat/yr**
**Build time:** 3 days
**Complexity:** Medium

```
Features needed:
- Drag-drop columns
- Card creation/editing
- Labels, due dates
- Real-time sync
- Multiple boards
```

**File:** `src/widgets/kanban.html`

---

#### 6. 🔗 Link Shortener (Kills Bitly, Rebrandly)
**Their cost:** $29-199/mo = **$348-2,388/yr**
**Build time:** 1 day
**Complexity:** Low

```
Features needed:
- Create short links
- Click tracking
- QR code generation
- Custom slugs
- Analytics dashboard
```

**File:** `src/widgets/links.html`

---

#### 7. 🔔 Notification Center (Kills Knock, Courier)
**Their cost:** $25-250/mo = **$300-3,000/yr**
**Build time:** 3 days
**Complexity:** Medium

```
Features needed:
- In-app notification feed
- Push notifications (via SW)
- Preferences
- Read/unread state
- P2P delivery
```

**File:** `src/widgets/notifications.html`

---

#### 8. 📝 Wiki / Knowledge Base (Kills Notion basics, GitBook)
**Their cost:** $10-32/seat/mo = **$120-384/seat/yr**
**Build time:** 3 days
**Complexity:** Medium

```
Features needed:
- Markdown pages
- Nested hierarchy
- Search
- Collaborative editing
- Version history
```

**File:** `src/widgets/wiki.html`

---

### WEEK 3: Medium Complexity (4 widgets, 3-5 days each)

#### 9. 📊 Analytics Dashboard (Kills Amplitude/Mixpanel basics)
**Their cost:** $25-49/mo starter = **$300-588/yr**
**Build time:** 5 days
**Complexity:** Medium-High

```
Features needed:
- Event tracking JS
- Dashboard with charts
- Funnels
- User properties
- Privacy-preserving (local-first)
```

**File:** `src/widgets/analytics.html` + `analytics-tracker.js`

---

#### 10. 🗄️ Database/Spreadsheet (Kills Airtable basics)
**Their cost:** $20/seat/mo = **$240/seat/yr**
**Build time:** 5 days
**Complexity:** Medium-High

```
Features needed:
- Tables with columns
- Different field types
- Filtering/sorting
- Views
- Real-time collab
- API access
```

**File:** `src/widgets/database.html`

---

#### 11. 📁 File Sharing (Kills Dropbox/Drive basics)
**Their cost:** $12/mo = **$144/yr**
**Build time:** 4 days
**Complexity:** Medium

```
Features needed:
- Upload files
- Folder structure
- Share links
- Preview
- P2P transfer (large files)
```

**File:** `src/widgets/files.html`

---

#### 12. 👥 CRM Lite (Kills HubSpot free, Pipedrive basics)
**Their cost:** $15-45/seat/mo = **$180-540/seat/yr**
**Build time:** 5 days
**Complexity:** Medium-High

```
Features needed:
- Contact list
- Companies
- Deals pipeline
- Notes/activities
- Import/export
```

**File:** `src/widgets/crm.html`

---

### WEEK 4: Complex Builds (4 widgets, 5-7 days each)

#### 13. 💬 Live Support Widget (Kills Intercom widget basics)
**Their cost:** $29/seat/mo = **$348/seat/yr**
**Build time:** 5 days
**Complexity:** High

```
Features needed:
- Embeddable chat widget
- Agent dashboard
- Visitor info
- Canned responses
- Chat history
- Offline messages
```

**File:** `src/widgets/support.html` + `support-widget.js`

---

#### 14. 📹 Video Chat (Kills Daily.co, Whereby)
**Their cost:** $0.004/min or $12-65/mo = **$144-780/yr**
**Build time:** 5 days
**Complexity:** High

```
Features needed:
- WebRTC video/audio
- Screen sharing
- Multiple participants
- Chat alongside
- No server (P2P mesh)
```

**File:** `src/widgets/video.html`

---

#### 15. 🛒 Simple Checkout (Kills Gumroad basics)
**Their cost:** 10% + fees = **hundreds/yr**
**Build time:** 5 days
**Complexity:** High

```
Features needed:
- Product page
- Cart
- Stripe/PayPal integration
- Digital delivery
- Order management
```

**File:** `src/widgets/checkout.html`

---

#### 16. 🔐 Auth Widget (Kills Auth0 basics)
**Their cost:** $1,249+/mo at scale = **$15K+/yr**
**Build time:** 7 days
**Complexity:** Very High

```
Features needed:
- Login/signup forms
- OAuth providers (client-side redirect)
- JWT generation (local)
- Session management
- P2P identity sync
```

**File:** `src/widgets/auth.html` + `auth-sdk.js`

---

## BUILD SCHEDULE

| Week | Widgets | Total Dev Days | Revenue Killed/User/Yr |
|------|---------|----------------|------------------------|
| 1 | Calendar, Polls, Status, Waitlist | 5 days | $1,068-2,340 |
| 2 | Kanban, Links, Notifications, Wiki | 10 days | $888-6,072 |
| 3 | Analytics, Database, Files, CRM | 19 days | $864-1,716 |
| 4 | Support, Video, Checkout, Auth | 22 days | $15,492+ |

**Total: ~56 dev days = 2 months**
**Total Revenue Destroyed: $18,312-25,128/user/year minimum**

---

## PRIORITY ORDER (If Limited Time)

If you can only build 8, do these first:

1. **Calendar** - Everyone uses Calendly
2. **Kanban** - Everyone uses Trello
3. **Database** - Airtable is expensive
4. **Analytics** - Everyone needs this
5. **Status Page** - Easy win, high value
6. **Video Chat** - COVID made this essential
7. **Support Widget** - Every SaaS needs this
8. **Auth** - Highest cost to kill ($15K+/yr)

---

## FILE STRUCTURE

```
src/widgets/
├── index.html          # ✅ Done - Landing page
├── chat.html           # ✅ Done - Kills Stream
├── comments.html       # ✅ Done - Kills Disqus
├── form.html           # ✅ Done - Kills Typeform
├── whiteboard.html     # ✅ Done - Kills Miro
│
├── calendar.html       # Week 1 - Kills Calendly
├── polls.html          # Week 1 - Kills Slido
├── status.html         # Week 1 - Kills Statuspage
├── waitlist.html       # Week 1 - Kills LaunchList
│
├── kanban.html         # Week 2 - Kills Trello
├── links.html          # Week 2 - Kills Bitly
├── notifications.html  # Week 2 - Kills Knock
├── wiki.html           # Week 2 - Kills Notion
│
├── analytics.html      # Week 3 - Kills Amplitude
├── database.html       # Week 3 - Kills Airtable
├── files.html          # Week 3 - Kills Dropbox
├── crm.html            # Week 3 - Kills HubSpot
│
├── support.html        # Week 4 - Kills Intercom
├── video.html          # Week 4 - Kills Daily.co
├── checkout.html       # Week 4 - Kills Gumroad
└── auth.html           # Week 4 - Kills Auth0
```

---

## TOTAL IMPACT

When all 20 widgets are complete:

| Metric | Value |
|--------|-------|
| Services Killed | 20+ |
| Saved per User/Year | **$20,000+** |
| Potential Users (1% market) | 100,000+ |
| Total Revenue Destroyed | **$2B+** |

They'll notice. By then, we're the standard.
