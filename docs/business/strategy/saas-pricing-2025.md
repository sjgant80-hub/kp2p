# SaaS Pricing Research - December 2025

## Current Market Pricing (Verified 12/23/2025)

### Real-Time / Collaboration Infrastructure

| Service | Free Tier | Paid Starting | Enterprise | Annual Cost (10 users) |
|---------|-----------|---------------|------------|------------------------|
| **Liveblocks** | 500 MAR | $29/mo | Custom | $348+ |
| **Pusher** | 200 conn/200K msg | $49/mo | Custom | $588+ |
| **Ably** | Usage-based | Pay-as-you-go | Custom | Variable |
| **PubNub** | Limited | $98/mo | Custom | $1,176+ |

### Authentication

| Service | Free Tier | Paid | Enterprise | Annual Cost (10K users) |
|---------|-----------|------|------------|------------------------|
| **Auth0** | 25K MAU | $1,249/mo (10K) | $30K+/yr | $15,000+ |
| **Clerk** | 10K MAU | $0.02/MAU after | - | $2,400 |
| **Firebase Auth** | 50K MAU | Usage-based | - | Variable |

### Analytics

| Service | Free Tier | Paid Starting | Enterprise | Annual Cost |
|---------|-----------|---------------|------------|-------------|
| **Amplitude** | 50K MTU | $49/mo | ~$1,500/mo | $588-18,000 |
| **Mixpanel** | 20M events | $25/mo | ~$2,000/mo | $300-24,000 |
| **PostHog** | 1M events | Usage-based | Custom | Variable |

### Customer Support / Chat

| Service | Free Tier | Paid Starting | Per Seat | Annual (5 seats) |
|---------|-----------|---------------|----------|------------------|
| **Intercom** | None | $29/seat/mo | $29-132 | $1,740-7,920 |
| **Zendesk** | None | $19/agent/mo | $19-115 | $1,140-6,900 |
| **Crisp** | 2 seats | $25/mo | - | $300+ |

### Forms & Surveys

| Service | Free Tier | Paid | Enterprise | Annual Cost |
|---------|-----------|------|------------|-------------|
| **Typeform** | 10 responses | €25/mo | Custom | €300+ |
| **Tally** | Unlimited | $29/mo | Custom | $348 |
| **Formspree** | 50 subs/mo | $10/mo | $40/mo | $120-480 |

### Scheduling

| Service | Free Tier | Paid | Teams | Annual Cost |
|---------|-----------|------|-------|-------------|
| **Calendly** | 1 event type | $10/mo | $16/mo | $120-192/user |
| **Cal.com** | Open source | $15/mo | $37/mo | $180-444 |
| **SavvyCal** | None | $12/mo | $20/mo | $144-240 |

### Databases / No-Code

| Service | Free Tier | Paid | Enterprise | Annual Cost (10 seats) |
|---------|-----------|------|------------|------------------------|
| **Airtable** | 1K records | $20/seat/mo | $45+/seat | $2,400-5,400 |
| **Notion** | Free (personal) | $10/seat/mo | $15+/seat | $1,200-1,800 |
| **Coda** | Free (limited) | $10/seat/mo | $30/seat | $1,200-3,600 |

### Cloud Storage

| Service | Free Tier | Paid | Family/Team | Annual Cost |
|---------|-----------|------|-------------|-------------|
| **Dropbox** | 2GB | $12/mo (2TB) | $20/mo | $144-240 |
| **Google Drive** | 15GB | $2/mo (100GB) | $10/mo (2TB) | $24-120 |
| **OneDrive** | 5GB | $2/mo (100GB) | - | $24+ |

### Backend-as-a-Service

| Service | Free Tier | Paid | Scale | Annual Cost |
|---------|-----------|------|-------|-------------|
| **Firebase** | Spark (limited) | Blaze (usage) | - | $60-6,000+ |
| **Supabase** | 500MB | $25/mo | $599/mo | $300-7,188 |
| **Appwrite** | Self-host free | Cloud TBD | - | Variable |

### Whiteboard / Design

| Service | Free Tier | Paid | Teams | Annual Cost (10) |
|---------|-----------|------|-------|------------------|
| **Miro** | 3 boards | $8/seat/mo | $16/seat | $960-1,920 |
| **FigJam** | Limited | $3/editor | $5/editor | $360-600 |
| **Excalidraw+** | Open source | $7/mo | - | $84 |

### Email / Notifications

| Service | Free Tier | Paid | Scale | Annual Cost |
|---------|-----------|------|-------|-------------|
| **SendGrid** | 100/day | $19.95/mo | Usage | $240+ |
| **Mailgun** | 5K/mo (3mo) | $35/mo | Usage | $420+ |
| **Resend** | 3K/mo | $20/mo | Usage | $240+ |

---

## Priority Targets for P2P Replacement

### Tier 1: Immediate (Already Built or <1 Day)

| Target | Their Cost | Difficulty | Revenue Impact |
|--------|------------|------------|----------------|
| Chat (Stream/SendBird) | $499+/mo | ✅ Done | $6K/yr saved |
| Comments (Disqus) | $10/mo + ads | ✅ Done | $120/yr + privacy |
| Forms (Typeform) | €25/mo | ✅ Done | €300/yr saved |
| Whiteboard (Miro) | $8/seat/mo | ✅ Done | $960/yr saved |

### Tier 2: High-Value Quick Builds (1-3 Days)

| Target | Their Cost | Our Solution | Dev Time |
|--------|------------|--------------|----------|
| **Scheduling** | $10-16/mo | P2P calendar | 2 days |
| **Polls/Voting** | $20+/mo | P2P voting | 1 day |
| **Notifications** | $20+/mo | P2P + Service Worker | 2 days |
| **Status Page** | $29+/mo | P2P uptime | 1 day |
| **Link Shortener** | $25+/mo | P2P redirects | 1 day |
| **Waitlist** | $30+/mo | P2P signup | 1 day |

### Tier 3: Medium Builds (3-7 Days)

| Target | Their Cost | Our Solution | Dev Time |
|--------|------------|--------------|----------|
| **Database/Airtable** | $20/seat/mo | P2P tables | 5 days |
| **CRM Lite** | $25+/seat/mo | P2P contacts | 4 days |
| **Analytics** | $25-49/mo | P2P events | 5 days |
| **File Sharing** | $12+/mo | P2P storage | 5 days |
| **Kanban Board** | $10+/seat/mo | P2P tasks | 3 days |
| **Live Support** | $29+/seat/mo | P2P helpdesk | 5 days |

### Tier 4: Complex (1-2 Weeks)

| Target | Their Cost | Our Solution | Dev Time |
|--------|------------|--------------|----------|
| **Auth/SSO** | $1K+/mo | P2P identity | 10 days |
| **Video Chat** | $0.004+/min | P2P WebRTC | 7 days |
| **Email Service** | $20+/mo | P2P + SMTP bridge | 7 days |
| **E-commerce** | $29+/mo | P2P cart/checkout | 10 days |

---

## Sources

- [Liveblocks Pricing](https://liveblocks.io/pricing)
- [Pusher Pricing (Ably)](https://ably.com/topic/pusher-pricing)
- [Auth0 Pricing (Logto)](https://blog.logto.io/auth0-pricing-explain)
- [Clerk vs Auth0](https://clerk.com/articles/clerk-vs-auth0-for-nextjs)
- [Amplitude Pricing (G2)](https://www.g2.com/products/amplitude-analytics/pricing)
- [Mixpanel vs Amplitude](https://userpilot.com/blog/mixpanel-pricing/)
- [Intercom Pricing](https://www.intercom.com/pricing)
- [Zendesk vs Intercom](https://www.bolddesk.com/blogs/intercom-vs-zendesk)
- [Airtable Pricing (Adalo)](https://www.adalo.com/posts/airtable-pricing)
- [Dropbox vs Google Drive (Cloudwards)](https://www.cloudwards.net/dropbox-vs-google-drive-vs-onedrive/)
- [Firebase Pricing](https://firebase.google.com/pricing)
