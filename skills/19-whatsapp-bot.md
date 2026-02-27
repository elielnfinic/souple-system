# Skill 19: WhatsApp Bot Integration

## Objective
Build a WhatsApp-based booking and support channel using the WhatsApp Business API. Allow users to search trips, book tickets, check status, receive notifications, and contact support — all via WhatsApp, the most used messaging app in DRC.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 04 (Trips & Booking) completed
- Skill 05 (Payments) completed
- Skill 06 (Notifications) completed
- WhatsApp Business API access (via Meta Business Platform or BSP like Twilio, MessageBird, 360dialog)

---

## Scope

### 1. WhatsApp Conversational Flows

#### Welcome / Menu
```
User: "Hi" / any first message
Bot: "Welcome to Souple! How can I help you?

1 - Search a trip
2 - Check my booking
3 - Talk to support
4 - Change language

Or type a route like: Kinshasa Lubumbashi 15/03"
```

#### Trip Search (Natural Language + Structured)
```
User: "Kinshasa to Lubumbashi on March 15"
Bot: "Trips from Kinshasa → Lubumbashi on 15/03:

1. 06:00 | AgencyX | 45 000 FC | 12 seats left
2. 08:30 | AgencyY | 50 000 FC | 8 seats left
3. 14:00 | DriverZ | 40 000 FC | 3 seats left

Reply with trip number to book, or type another route."

User: "1"
Bot: "AgencyX - 15/03 at 06:00
Kinshasa → Lubumbashi
Price: 45 000 FC per seat

How many seats? (1-5)"

User: "1"
Bot: "Your booking summary:
- 1 seat on AgencyX
- Kinshasa → Lubumbashi
- 15/03/2026 at 06:00
- Total: 45 000 FC

Pay with:
1 - MTN Mobile Money
2 - Orange Money
3 - Airtel Money"

User: "1"
Bot: "Enter your MTN number:"

User: "0991234567"
Bot: "Payment request sent to 0991234567.
Please confirm on your phone.
I'll send you the booking confirmation once payment is received."

[After payment confirmed]
Bot: "Booking confirmed!
Code: BK-ABC123
Kinshasa → Lubumbashi
15/03/2026 at 06:00
Seat: 12A | AgencyX

Show this message when boarding.
[QR Code Image]"
```

#### Booking Status Check
```
User: "Check booking BK-ABC123"
Bot: "Booking BK-ABC123
Status: Confirmed
Kinshasa → Lubumbashi
15/03/2026 at 06:00
Seat: 12A
Agency: AgencyX

Your trip is tomorrow! Departure from Terminal Central."
```

#### Support Handoff
```
User: "3" or "support" or "help"
Bot: "What do you need help with?
1 - Booking issue
2 - Payment problem
3 - Cancel/refund
4 - Lost parcel
5 - Other

Or describe your issue and I'll connect you with our team."

User: "My trip was cancelled and I want a refund"
Bot: "I'm sorry about that. Let me create a support ticket for you.
Please provide your booking code:"

User: "BK-ABC123"
Bot: "Support ticket SUP-789012 created for booking BK-ABC123.
Our team will respond within 4 hours.
You'll receive updates here on WhatsApp."
```

### 2. WhatsApp Notifications (Outbound)

Using WhatsApp Message Templates (pre-approved by Meta):

```
# Booking Confirmation
"Your Souple booking is confirmed!
Code: {{booking_code}}
Route: {{from}} → {{to}}
Date: {{date}} at {{time}}
Seat: {{seat}} | {{agency}}
Show this message when boarding."

# Payment Received
"Payment of {{amount}} received for booking {{booking_code}}. Your ticket is confirmed."

# Trip Reminder (day before)
"Reminder: Your trip {{from}} → {{to}} departs tomorrow {{date}} at {{time}}.
Boarding at {{terminal}}.
Booking: {{booking_code}}"

# Trip Departure
"Your trip {{booking_code}} has departed. Estimated arrival: {{arrival_time}}."

# Trip Cancelled
"Your trip on {{date}} from {{from}} to {{to}} has been cancelled by {{agency}}.
Reply REFUND to request a refund or HELP for assistance."

# Parcel Status Update
"Parcel {{tracking_code}}: {{status}} at {{location}} on {{date}}."
```

### 3. Architecture

```typescript
// app/services/whatsapp/whatsapp_service.ts
export class WhatsAppService {
  /**
   * Handle incoming WhatsApp message via webhook.
   * Supports: text, interactive (button/list replies), location, media
   */
  async handleIncoming(message: WhatsAppIncomingMessage): Promise<void> {
    // 1. Identify or create user by phone number
    // 2. Load conversation state from Redis (TTL: 30 min)
    // 3. Parse intent (NLP or keyword matching)
    // 4. Route to appropriate handler:
    //    - TripSearchHandler
    //    - BookingHandler
    //    - StatusCheckHandler
    //    - SupportHandler
    //    - LanguageHandler
    // 5. Generate response (text, buttons, list, or media)
    // 6. Send via WhatsApp API
    // 7. Update conversation state in Redis
  }

  /**
   * Send template message (for notifications)
   */
  async sendTemplate(to: string, templateName: string, params: Record<string, string>): Promise<void> {
    // 1. Format template with parameters
    // 2. Send via WhatsApp Business API
    // 3. Track delivery status
  }

  /**
   * Send interactive message (buttons or list)
   */
  async sendInteractive(to: string, content: WhatsAppInteractiveMessage): Promise<void> {
    // WhatsApp supports:
    // - Reply buttons (max 3 buttons)
    // - List messages (max 10 items in sections)
    // Use these for trip selection, payment method, etc.
  }

  /**
   * Send media (QR code image for boarding pass)
   */
  async sendImage(to: string, imageUrl: string, caption: string): Promise<void> {}
}
```

#### Conversation State (Redis)
```typescript
// whatsapp:conversation:{phoneNumber} → {
//   step: 'idle' | 'searching' | 'selecting_trip' | 'selecting_seats' | ...
//   data: { fromCity, toCity, date, trips, selectedTrip, ... }
//   locale: 'fr' | 'en' | 'ln' | 'sw'
//   userId: number | null
//   lastActivity: ISO timestamp
// }
// TTL: 30 minutes (conversation resets after inactivity)
```

### 4. API Endpoints

```
# WhatsApp webhook (from Meta/BSP)
GET    /api/v1/whatsapp/webhook                  # Webhook verification (challenge)
POST   /api/v1/whatsapp/webhook                  # Incoming messages + status updates

# Admin
GET    /api/v1/admin/whatsapp/conversations       # Active conversations
GET    /api/v1/admin/whatsapp/templates            # Message template status
GET    /api/v1/admin/whatsapp/stats                # Message volume, response times
```

### 5. WhatsApp as Notification Channel

Integration with Skill 06 (Notifications):
```typescript
// Add WhatsApp as a notification channel alongside Email, SMS, Telegram, Push
// User preference: can enable/disable WhatsApp notifications
// Priority order for each notification type:
//   Booking confirmation: WhatsApp > SMS > Email
//   Trip reminder: WhatsApp > Push > SMS
//   Payment: WhatsApp > SMS > Email

// In notification_preferences table:
// channel ENUM adds 'whatsapp' option
```

### 6. Language Support
```
All WhatsApp responses available in: French (default), English, Lingala, Swahili
User can switch via "4" menu option or "LANG EN" / "LANG FR" / "LANG LN" / "LANG SW"
Language preference stored per phone number and synced with user profile
```

---

## Acceptance Criteria

1. Users can search trips via WhatsApp with natural language ("Kin to Lushi tomorrow")
2. Full booking flow works: search → select trip → select seats → pay → confirmation
3. QR code boarding pass sent as image after booking confirmation
4. Booking status check works with booking code
5. Support ticket creation works from WhatsApp with auto-linking to booking
6. All WhatsApp notification templates approved by Meta and delivered
7. Trip reminders sent via WhatsApp day before departure
8. Conversation state persists across messages within a 30-minute session
9. Language switching works across all 4 languages
10. Admin can view conversation logs and message delivery stats
11. Graceful fallback to SMS if WhatsApp delivery fails

---

## Dependencies
- Skill 01, 04, 05, 06
- Skill 18 (Customer Support) — support ticket creation from WhatsApp

## Blocks
- None
