# Skill 16: USSD & SMS Booking Channel

## Objective
Build a USSD and SMS-based booking channel that allows feature phone users (70%+ of the DRC population) to search trips, book seats, pay via mobile money, and receive confirmations — all without a smartphone or internet connection.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 04 (Trips & Booking) completed
- Skill 05 (Payments) completed — mobile money integration
- USSD gateway provider account (e.g., Africa's Talking, Infobip, or local telco partnership)
- SMS gateway provider account (e.g., Africa's Talking, Twilio, or local provider)

---

## Scope

### 1. USSD Menu Flow

#### Main Menu (dial *123# or assigned short code)
```
Welcome to Souple!
1. Search a trip
2. My bookings
3. Check booking status
4. Language / Langue
0. Exit
```

#### Trip Search Flow
```
Screen 1: "Enter departure city:"
  > User types: Kinshasa

Screen 2: "Enter destination city:"
  > User types: Lubumbashi

Screen 3: "Enter travel date (DD/MM):"
  > User types: 15/03

Screen 4: "Available trips on 15/03:
  1. 06:00 - AgencyX - 45000 FC - 12 seats
  2. 08:30 - AgencyY - 50000 FC - 8 seats
  3. 14:00 - DriverZ - 40000 FC - 3 seats
  0. Back"
  > User types: 1

Screen 5: "AgencyX - 15/03 at 06:00
  Kinshasa → Lubumbashi
  Price: 45000 FC
  1. Book 1 seat
  2. Book 2 seats
  3. Book 3 seats
  0. Back"
  > User types: 1

Screen 6: "Confirm booking:
  1 seat - 45000 FC
  Pay with:
  1. MTN Mobile Money
  2. Orange Money
  3. Airtel Money
  0. Cancel"
  > User types: 1

Screen 7: "Enter your MTN number (09XXXXXXXX):"
  > User types: 0991234567

Screen 8: "Payment request sent to 0991234567.
  Please confirm on your phone.
  You will receive an SMS with your booking code.
  0. Main menu"
```

#### Booking Status Check
```
Screen 1: "Enter your booking code:"
  > User types: BK-ABC123

Screen 2: "Booking BK-ABC123
  Status: Confirmed
  Kinshasa → Lubumbashi
  15/03/2026 at 06:00
  Seat: 12A
  Agency: AgencyX
  0. Main menu"
```

### 2. SMS Interactions

#### Inbound SMS Commands
```
BOOK KIN LUB 15/03        → Search trips from Kinshasa to Lubumbashi on March 15
STATUS BK-ABC123           → Check booking status
CANCEL BK-ABC123           → Request cancellation
HELP                       → List available commands
LANG EN                    → Switch language to English
```

#### Outbound SMS Notifications
```
Booking confirmed:
"Souple: Booking BK-ABC123 confirmed. Kinshasa→Lubumbashi, 15/03 06:00, Seat 12A, AgencyX. Show this SMS to board."

Payment received:
"Souple: Payment of 45000 FC received for BK-ABC123. Ticket confirmed."

Trip reminder (day before):
"Souple: Reminder - Your trip Kinshasa→Lubumbashi departs tomorrow 15/03 at 06:00. Boarding at Terminal X."

Trip departed:
"Souple: Your trip BK-ABC123 has departed. Estimated arrival: 18:00."

Trip cancelled by agency:
"Souple: Trip on 15/03 06:00 Kinshasa→Lubumbashi has been cancelled. Reply HELP for refund options."
```

### 3. Architecture

#### USSD Gateway Service
```typescript
// app/services/ussd/ussd_service.ts
export class UssdService {
  /**
   * Handle incoming USSD request.
   * USSD is session-based: each request contains sessionId, input text, and serviceCode.
   * We track session state in Redis (TTL: 5 minutes).
   */
  async handleRequest(params: {
    sessionId: string
    serviceCode: string
    phoneNumber: string
    text: string            // Cumulative input: "1*Kinshasa*Lubumbashi*15/03"
  }): Promise<UssdResponse> {
    // 1. Parse cumulative text to determine current screen
    // 2. Load session state from Redis
    // 3. Process input, advance to next screen
    // 4. Return response with CON (continue) or END (terminate)
  }
}

// Session state stored in Redis:
// ussd:session:{sessionId} → {
//   step: 'main' | 'search_from' | 'search_to' | 'search_date' | 'select_trip' | ...
//   data: { fromCity, toCity, date, selectedTrip, ... }
//   locale: 'fr' | 'en' | 'ln' | 'sw'
//   phoneNumber: string
// }
```

#### SMS Gateway Service
```typescript
// app/services/sms/sms_service.ts
export class SmsService {
  async sendSms(to: string, message: string): Promise<void> {
    // Route to configured SMS provider
    // Handle DRC number formatting (+243)
    // Track delivery status
    // Respect SMS character limits (160 chars, or 70 for Unicode)
    // Split long messages into parts if needed
  }

  async handleInbound(from: string, message: string): Promise<string | null> {
    // Parse command from message text
    // Route to appropriate handler
    // Return response SMS text (or null if no response)
  }
}
```

#### API Endpoints
```
# USSD callback (from gateway provider)
POST   /api/v1/ussd/callback                    # USSD session handler

# SMS callbacks
POST   /api/v1/sms/inbound                      # Inbound SMS handler
POST   /api/v1/sms/delivery-report               # Delivery status webhook

# Admin
GET    /api/v1/admin/ussd/sessions               # Active USSD sessions
GET    /api/v1/admin/sms/logs                     # SMS send/receive logs
```

### 4. City Name Matching (Fuzzy)
```typescript
// USSD users type city names manually — need fuzzy matching
// "Kinshsa" → "Kinshasa", "Lushi" → "Lubumbashi", "Gma" → "Goma"
// Use Levenshtein distance + common abbreviations map
// If ambiguous, show options: "Did you mean: 1. Kinshasa 2. Kisangani"
```

### 5. Language Support
```
USSD and SMS fully translated in: French (default), English, Lingala, Swahili
User language preference stored per phone number in Redis/DB
Automatic detection: MTN numbers default Lingala (west), others default French
```

---

## Acceptance Criteria

1. User can complete a full booking via USSD: search → select → pay → receive SMS confirmation
2. USSD sessions timeout after 5 minutes of inactivity
3. SMS booking commands work (BOOK, STATUS, CANCEL, HELP)
4. Fuzzy city name matching handles common misspellings
5. All USSD/SMS content available in 4 languages
6. SMS booking confirmation serves as a valid boarding pass
7. Payment via mobile money triggers correctly from USSD flow
8. USSD handles concurrent sessions (multiple users simultaneously)
9. SMS character limits respected (split long messages)
10. Admin can view USSD session logs and SMS delivery reports

---

## Dependencies
- Skill 01 (Foundation)
- Skill 04 (Trips & Booking)
- Skill 05 (Payments)
- Skill 06 (Notifications) — SMS sending infrastructure

## Blocks
- None
