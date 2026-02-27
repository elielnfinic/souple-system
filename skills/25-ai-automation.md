# Skill 25: AI & Automation

## Objective
Integrate AI capabilities throughout the Souple platform to reduce human workload, improve user experience, and automate repetitive tasks. Covers AI-powered customer support (auto-responses, smart escalation), content generation (descriptions, summaries), intelligent suggestions (pricing, scheduling, routing), conversational booking assistants, and a pluggable AI provider architecture that supports multiple LLM APIs.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 04 (Trips & Booking) completed
- Skill 18 (Customer Support) completed
- AI API access (Anthropic Claude, OpenAI, or similar)

---

## Design Principles

1. **AI assists, humans decide** — AI handles first-line responses and suggestions. Humans approve, override, or escalate. Never let AI make irreversible decisions (refunds, bans, cancellations) without human confirmation.
2. **Transparent AI** — Users always know when they're interacting with AI. AI-generated content is labeled. Users can request a human at any time.
3. **Pluggable providers** — Abstract the AI layer so you can switch between Claude, OpenAI, local models, or any future provider without changing business logic.
4. **Context-rich prompts** — Always provide the AI with relevant context (booking details, user history, org policies) for accurate responses.
5. **Cost-aware** — Cache common responses, use smaller models for simple tasks, reserve large models for complex reasoning.

---

## Scope

### 1. AI Provider Architecture

```typescript
// app/services/ai/ai_provider.ts
export interface AiProvider {
  name: string

  /**
   * Generate a text completion.
   */
  complete(params: {
    systemPrompt: string
    userMessage: string
    context?: Record<string, any>    // Structured context injected into the prompt
    maxTokens?: number
    temperature?: number             // 0 = deterministic, 1 = creative
    responseFormat?: 'text' | 'json'
  }): Promise<{
    content: string
    usage: { inputTokens: number, outputTokens: number }
    model: string
  }>

  /**
   * Generate embeddings for semantic search.
   */
  embed(texts: string[]): Promise<number[][]>
}

// app/services/ai/providers/claude_provider.ts
export class ClaudeProvider implements AiProvider {
  name = 'claude'
  // Uses Anthropic API (Claude Sonnet for fast tasks, Opus for complex reasoning)
  // Models: claude-sonnet-4-5-20250929 (default), claude-opus-4-6 (complex)
}

// app/services/ai/providers/openai_provider.ts
export class OpenAiProvider implements AiProvider {
  name = 'openai'
  // Fallback provider
  // Models: gpt-4o (default), gpt-4o-mini (simple tasks)
}

// app/services/ai/ai_service.ts
export class AiService {
  private providers: Map<string, AiProvider>
  private defaultProvider: string

  constructor() {
    this.providers = new Map()
    this.providers.set('claude', new ClaudeProvider())
    this.providers.set('openai', new OpenAiProvider())
    this.defaultProvider = env.get('AI_DEFAULT_PROVIDER', 'claude')
  }

  async complete(params: AiCompletionParams): Promise<AiCompletionResult> {
    // 1. Select provider (default or specified)
    // 2. Select model tier based on task complexity:
    //    - 'fast': smaller model (Sonnet/4o-mini) for simple tasks
    //    - 'standard': default model for most tasks
    //    - 'complex': largest model (Opus) for reasoning-heavy tasks
    // 3. Check cache (Redis) for identical prompt+context hash
    // 4. If cache hit: return cached response
    // 5. Call provider
    // 6. Cache response (TTL based on task type)
    // 7. Log usage for cost tracking
    // 8. Return result
  }
}
```

#### Database: AI Usage Tracking
```
ai_usage_logs
  id                    BIGINT UNSIGNED AUTO_INCREMENT PK
  provider              VARCHAR(50)               -- 'claude', 'openai'
  model                 VARCHAR(100)
  task_type             VARCHAR(50)               -- 'support_reply', 'content_gen', 'suggestion', etc.
  input_tokens          INT
  output_tokens         INT
  estimated_cost_usd    DECIMAL(10,6)
  organization_id       BIGINT UNSIGNED FK NULL
  user_id               BIGINT UNSIGNED FK NULL
  cached                BOOLEAN DEFAULT false
  latency_ms            INT
  created_at            TIMESTAMP
  INDEX(task_type, created_at)
  INDEX(organization_id, created_at)
```

---

### 2. AI-Powered Customer Support

The biggest immediate value: reduce support ticket volume by 60-80% with AI first-line responses.

```typescript
// app/services/ai/support_ai_service.ts
export class SupportAiService {

  /**
   * Auto-respond to a new support ticket.
   * The AI reads the ticket, checks context (booking, payment, trip status),
   * and either resolves it directly or drafts a response for human review.
   */
  async handleNewTicket(ticketId: number): Promise<AiSupportAction> {
    // 1. Load ticket + related entities (booking, payment, trip, parcel)
    // 2. Load FAQ articles for the ticket category
    // 3. Load org policies (refund policy, cancellation policy)
    // 4. Classify ticket intent:
    //    - booking_status_inquiry → auto-respond with current status
    //    - refund_request → check refund eligibility, draft response
    //    - trip_info_question → answer from trip/route data
    //    - complaint → escalate to human with AI summary
    //    - technical_issue → check known issues, suggest fixes
    //
    // 5. Decide action:
    //    a. AUTO_RESPOND: AI is confident, send response directly
    //       (only for factual queries: status checks, schedule info, FAQ)
    //    b. DRAFT_FOR_REVIEW: AI drafts response, human agent reviews before sending
    //       (for refund requests, complaints, anything involving money)
    //    c. ESCALATE_TO_HUMAN: AI can't handle it, assign to human with summary
    //       (complex disputes, emotional situations, edge cases)
    //
    // 6. Return: { action, response, confidence, reasoning }
  }

  /**
   * Suggest a response for a support agent to review.
   * Agent sees the suggestion, can edit/approve/reject.
   */
  async suggestReply(ticketId: number, agentUserId: number): Promise<SuggestedReply> {
    // 1. Load full conversation thread
    // 2. Load ticket context (booking, payment, etc.)
    // 3. Generate suggested response in user's language
    // 4. Include: suggested action (refund amount, credit, apology, etc.)
    // 5. Agent clicks "Use suggestion" or edits before sending
  }

  /**
   * Summarize a long support thread for escalation.
   */
  async summarizeThread(ticketId: number): Promise<string> {
    // Condense all messages into a 2-3 sentence summary
    // Include: what happened, what the customer wants, what's been tried
  }

  /**
   * Auto-categorize and prioritize incoming tickets.
   */
  async classifyTicket(subject: string, description: string): Promise<{
    category: TicketCategory
    priority: TicketPriority
    suggestedTags: string[]
  }> {
    // AI reads subject + description
    // Returns suggested category and priority
    // Used to auto-set fields on ticket creation
  }
}
```

#### Support AI Workflow
```
New ticket arrives
  ↓
AI classifies: category + priority
  ↓
AI checks: can this be auto-resolved?
  ├─ YES (status inquiry, FAQ, schedule) → AI responds directly
  │   └─ Mark: "Responded by AI" badge
  │   └─ Customer can reply "talk to human" to escalate
  │
  ├─ MAYBE (refund, change request) → AI drafts response
  │   └─ Human agent reviews draft
  │   └─ Agent approves/edits/rejects
  │   └─ Response sent with agent's name
  │
  └─ NO (complaint, dispute, complex) → Escalate to human
      └─ AI provides summary + suggested approach
      └─ Human handles from here
```

---

### 3. Content Generation

```typescript
// app/services/ai/content_ai_service.ts
export class ContentAiService {

  /**
   * Generate a vehicle description from its attributes.
   * Used when agencies add vehicles but don't write descriptions.
   */
  async generateVehicleDescription(vehicle: {
    brand: string
    model: string
    year: number
    type: string           // 'bus', 'minibus', 'car'
    seatCount: number
    features: string[]     // ['ac', 'wifi', 'usb', 'reclining_seats']
    seatClasses: string[]  // ['economy', 'vip']
  }, locale: string): Promise<string> {
    // Generate a 2-3 sentence professional description
    // In the user's language
    // Example (fr): "Bus Mercedes-Benz Tourismo 2023 de 45 places, équipé de climatisation,
    //                WiFi gratuit et prises USB. Sièges inclinables disponibles en classe
    //                Économique et VIP."
  }

  /**
   * Generate a trip description/notes.
   */
  async generateTripDescription(trip: {
    route: { from: string, to: string, stops: string[] }
    vehicle: { type: string, features: string[] }
    departureTime: string
    duration: string
  }, locale: string): Promise<string> {
    // "Voyage Kinshasa → Lubumbashi avec escales à Kikwit, Kananga et Mbuji-Mayi.
    //  Départ à 06h00, durée estimée 18h. Bus climatisé avec WiFi."
  }

  /**
   * Generate agency/organization profile description.
   */
  async generateOrgDescription(org: {
    name: string
    type: string
    routes: string[]
    vehicleCount: number
    yearsActive: number
    rating: number
  }, locale: string): Promise<string> {}

  /**
   * Generate promotion text from parameters.
   */
  async generatePromoText(promo: {
    type: string
    discountValue: number
    conditions: string
    applicableRoutes: string[]
  }, locale: string): Promise<{ title: string, description: string }> {
    // "Offre spéciale : -20% sur Kinshasa→Lubumbashi ! Réservez avant le 15 mars."
  }

  /**
   * Translate user-generated content between supported languages.
   */
  async translateContent(
    text: string,
    fromLocale: string,
    toLocale: string
  ): Promise<string> {
    // Translate between fr, en, ln, sw
    // Used for: FAQ articles, org descriptions, support messages
    // Especially valuable for Lingala and Swahili which have limited MT support
  }
}
```

---

### 4. Intelligent Suggestions

```typescript
// app/services/ai/suggestion_ai_service.ts
export class SuggestionAiService {

  /**
   * Suggest optimal pricing for a route based on historical data.
   * "Based on demand patterns, we suggest 45,000 FC for Kinshasa→Lubumbashi on weekdays
   *  and 55,000 FC on Fridays/Sundays (peak travel days)."
   */
  async suggestPricing(params: {
    routeId: number
    seatClass: string
    historicalBookings: BookingSummary[]  // Last 90 days
    competitorPrices?: number[]
    currentPrice: number
  }): Promise<PricingSuggestion> {
    // Analyze: booking volume by price point, day of week, season
    // Suggest: optimal base price, peak days, peak multiplier
    // Return: { suggestedPrice, reasoning, confidence, peakDays, peakMultiplier }
  }

  /**
   * Suggest optimal trip schedule based on demand patterns.
   * "Demand for Kinshasa→Lubumbashi peaks at 06:00 and 14:00.
   *  Consider adding a 14:00 departure on Fridays."
   */
  async suggestSchedule(params: {
    routeId: number
    orgId: number
    historicalSearches: SearchSummary[]   // What people search for
    historicalBookings: BookingSummary[]
    currentSchedule: TripSchedule[]
  }): Promise<ScheduleSuggestion[]> {
    // Identify: underserved time slots (high search, no trips)
    // Suggest: new departure times, frequency changes
    // Return: [{ time, dayOfWeek, reasoning, estimatedDemand }]
  }

  /**
   * Suggest routes an agency should consider.
   * Based on search demand data where no providers exist.
   */
  async suggestRoutes(orgId: number): Promise<RouteSuggestion[]> {
    // Analyze marketplace search data
    // Find routes with high demand but low/no supply
    // Filter by routes near the agency's existing coverage
    // Return: [{ from, to, estimatedDemand, competition, reasoning }]
  }

  /**
   * Smart seat assignment suggestion.
   * For ticketers doing quick sales: suggest seats that maximize future availability.
   * E.g., if a passenger goes A→B, assign a seat that's already booked B→E
   * rather than a fully empty seat (which could serve an A→E passenger later).
   */
  async suggestSeatAssignment(params: {
    tripId: number
    boardingStopOrder: number
    alightingStopOrder: number
    seatCount: number
  }): Promise<number[]> {
    // Strategy: prefer seats that are already partially booked on non-overlapping segments
    // This maximizes overall seat utilization
    // Fallback: any available seat
  }
}
```

---

### 5. Conversational AI Assistants

Used across WhatsApp (Skill 19), USSD smart matching (Skill 16), and in-app chat.

```typescript
// app/services/ai/booking_assistant_service.ts
export class BookingAssistantService {

  /**
   * Parse natural language trip requests into structured search params.
   * Handles: multiple languages, abbreviations, relative dates, fuzzy city names.
   *
   * Input: "je veux aller à lushi demain matin" (fr)
   * Output: { fromCity: null, toCity: 'Lubumbashi', date: '2026-02-28', timePreference: 'morning' }
   *
   * Input: "kin to goma next friday for 2 people" (en)
   * Output: { fromCity: 'Kinshasa', toCity: 'Goma', date: '2026-03-06', passengers: 2 }
   *
   * Input: "nataka kwenda Bukavu" (sw)
   * Output: { fromCity: null, toCity: 'Bukavu', date: null, passengers: 1 }
   */
  async parseBookingIntent(
    message: string,
    locale: string,
    userContext?: { lastCity?: string, recentBookings?: Booking[] }
  ): Promise<BookingIntent> {
    // AI parses natural language
    // Uses context (user's city, recent trips) to fill in gaps
    // Returns structured params for trip search
    // Asks follow-up questions for missing required fields
  }

  /**
   * Generate conversational responses for the booking flow.
   * Keeps the tone friendly, concise, and locale-appropriate.
   */
  async generateResponse(params: {
    step: 'greeting' | 'search_results' | 'seat_selection' | 'confirmation' | 'error' | 'followup'
    data: any
    locale: string
    channel: 'whatsapp' | 'ussd' | 'web_chat'
  }): Promise<string> {
    // Generate natural language response
    // Adapt length to channel (USSD = very short, WhatsApp = moderate, web = detailed)
  }

  /**
   * Handle ambiguous or incomplete requests with smart follow-ups.
   */
  async handleAmbiguity(params: {
    originalMessage: string
    missingFields: string[]      // ['fromCity', 'date']
    possibleMatches?: any[]      // For fuzzy matches: did you mean Kinshasa or Kisangani?
    locale: string
  }): Promise<string> {
    // Generate a natural follow-up question
    // "D'où partez-vous ? Kinshasa, Lubumbashi, ou une autre ville ?"
  }
}
```

---

### 6. AI-Powered Actions & Automations

```typescript
// app/services/ai/automation_service.ts
export class AutomationService {

  /**
   * Auto-generate daily/weekly reports and summaries.
   * Sent to agency managers via email/WhatsApp.
   */
  async generateDailySummary(orgId: number, date: Date): Promise<string> {
    // Load: bookings, revenue, cancellations, new reviews, support tickets
    // Generate: natural language summary with key metrics and highlights
    // "Aujourd'hui: 45 réservations (+12% vs hier), revenu de 2.3M FC.
    //  3 annulations. Note moyenne: 4.2/5. 1 ticket support en attente."
  }

  /**
   * Auto-respond to reviews.
   * Draft a response for the agency to approve.
   */
  async draftReviewResponse(review: {
    rating: number
    comment: string
    passengerName: string
    tripRoute: string
  }, orgName: string, locale: string): Promise<string> {
    // Positive review (4-5 stars): thank the customer
    // Negative review (1-2 stars): apologize, acknowledge issue, offer to resolve
    // Neutral (3 stars): thank + ask for specific feedback
    // Always professional, never defensive
  }

  /**
   * Smart notification timing.
   * Instead of fixed reminders, AI determines optimal send time.
   */
  async getOptimalNotificationTime(params: {
    userId: number
    notificationType: string
    tripDepartureAt: DateTime
  }): Promise<DateTime> {
    // Analyze: user's past interaction times, trip departure time
    // For trip reminders: send when user is most likely to check phone
    //   but at least 2 hours before departure
  }

  /**
   * Auto-detect and flag potential issues before they become support tickets.
   */
  async proactiveIssueDetection(): Promise<ProactiveAlert[]> {
    // Run periodically (every hour):
    // - Trips departing in < 2h with unpaid bookings → alert ticketer
    // - Vehicles with maintenance due this week → alert manager
    // - Unusual booking patterns → flag for fraud review
    // - Negative review trend → alert org manager
    // - Support ticket SLA about to breach → alert support lead
  }

  /**
   * Auto-tag and categorize parcels from description.
   */
  async categorizeParcel(description: string): Promise<{
    category: string          // 'documents', 'electronics', 'food', 'clothing', etc.
    estimatedWeight: string   // 'light', 'medium', 'heavy'
    handlingNotes: string[]   // ['fragile', 'keep_upright', 'perishable']
  }> {}
}
```

---

### 7. Database Migrations

#### `ai_configurations`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL  -- NULL = platform default
feature               VARCHAR(100)              -- 'support_auto_reply', 'content_generation', etc.
is_enabled            BOOLEAN DEFAULT true
provider              VARCHAR(50) DEFAULT 'claude'
model_tier            ENUM('fast', 'standard', 'complex') DEFAULT 'standard'
custom_instructions   TEXT NULL                 -- Org-specific AI instructions
auto_respond_categories JSON NULL              -- Which support categories AI can auto-respond to
confidence_threshold  DECIMAL(3,2) DEFAULT 0.85 -- Min confidence for auto-actions
max_monthly_budget_usd DECIMAL(10,2) NULL       -- Cost cap
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(organization_id, feature)
```

#### `ai_responses`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
task_type             VARCHAR(50)
input_hash            VARCHAR(64)               -- SHA-256 of prompt + context (for caching)
provider              VARCHAR(50)
model                 VARCHAR(100)
prompt_summary        TEXT
response              TEXT
confidence            DECIMAL(3,2) NULL
action_taken          ENUM('auto_sent', 'drafted', 'escalated', 'used', 'rejected') NULL
reviewed_by           BIGINT UNSIGNED FK -> users.id NULL
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL
reference_type        VARCHAR(50) NULL          -- 'support_ticket', 'review', 'booking'
reference_id          BIGINT UNSIGNED NULL
created_at            TIMESTAMP
INDEX(task_type, created_at)
INDEX(input_hash)
INDEX(reference_type, reference_id)
```

---

### 8. API Endpoints

```
# AI Support
POST   /api/v1/ai/support/classify               # Classify a support ticket
POST   /api/v1/ai/support/suggest-reply           # Get AI-suggested reply for ticket
POST   /api/v1/ai/support/summarize               # Summarize a support thread

# AI Content
POST   /api/v1/ai/content/vehicle-description     # Generate vehicle description
POST   /api/v1/ai/content/trip-description         # Generate trip description
POST   /api/v1/ai/content/promo-text               # Generate promotion text
POST   /api/v1/ai/content/translate                # Translate content between locales

# AI Suggestions
GET    /api/v1/ai/suggestions/pricing              # Pricing suggestions for route
GET    /api/v1/ai/suggestions/schedule             # Schedule optimization suggestions
GET    /api/v1/ai/suggestions/routes               # Route suggestions for org
POST   /api/v1/ai/suggestions/seat-assignment      # Smart seat assignment

# AI Booking Assistant
POST   /api/v1/ai/assistant/parse-intent           # Parse natural language booking request
POST   /api/v1/ai/assistant/respond                # Generate conversational response

# AI Configuration (org admin)
GET    /api/v1/org/ai/config                       # Get AI settings
PUT    /api/v1/org/ai/config                       # Update AI settings
GET    /api/v1/org/ai/usage                        # AI usage and cost report

# AI Admin (super-admin)
GET    /api/v1/admin/ai/usage                      # Platform-wide AI usage
GET    /api/v1/admin/ai/responses                  # AI response log with quality metrics
PUT    /api/v1/admin/ai/config                     # Global AI configuration
```

---

### 9. Frontend Components

#### Support Agent UI
- **AiSuggestionPanel** — Side panel showing AI's suggested reply, confidence score, reasoning
  - "Use suggestion" / "Edit" / "Ignore" buttons
  - AI badge: shows when a response was AI-generated
- **AiClassificationBadge** — Shows AI-detected category and priority on ticket cards
- **AiSummaryCard** — Collapsed summary of long threads, expandable

#### Content Generation
- **AiGenerateButton** — Small sparkle icon button next to description fields
  - Click → AI fills in the field → user can edit before saving
  - Works on: vehicle description, trip notes, org profile, promo text
- **AiTranslateButton** — Next to multi-language fields, translates from one language to others

#### Suggestions Dashboard (Agency)
- **PricingSuggestions** — Cards showing route pricing recommendations with reasoning
  - "Accept" applies the suggestion, "Dismiss" hides it
- **ScheduleSuggestions** — Calendar view highlighting suggested new departure times
- **RouteSuggestions** — Map or list of suggested new routes with demand data

#### AI Configuration (Org Settings)
- **AiSettingsPage** — Toggle AI features on/off per category
  - Auto-reply for support: on/off, which categories
  - Content generation: on/off
  - Suggestions: on/off
  - Custom instructions: textarea for org-specific tone/policies
  - Monthly budget cap
- **AiUsageReport** — Chart of AI calls, tokens used, estimated cost

#### Booking Assistant (Web Chat)
- **ChatWidget** — Floating chat bubble for conversational booking
  - "How can I help? Search for a trip, check a booking, or ask a question"
  - Natural language input → AI parses → shows search results inline
  - User can complete booking within the chat flow

---

### 10. Integration Points Across Skills

| Skill | AI Integration |
|-------|----------------|
| 04 (Trips & Booking) | Smart seat assignment, natural language search |
| 05 (Payments) | Payment failure diagnosis suggestions |
| 06 (Notifications) | Smart notification timing, message personalization |
| 09 (Dashboards) | AI-generated daily summaries, trend explanations |
| 12 (Marketplace) | Auto-generated descriptions, smart search ranking |
| 13 (Business Model) | Churn prediction, subscription upgrade suggestions |
| 15 (Promotions) | Auto-suggest promotions based on demand patterns |
| 16 (USSD & SMS) | Natural language parsing for SMS booking commands |
| 17 (Agent Network) | Sales performance insights per agent |
| 18 (Customer Support) | Auto-respond, classify, summarize, draft replies |
| 19 (WhatsApp Bot) | Conversational booking assistant, support handoff |
| 21 (In-App Messaging) | Suggested canned responses, auto-translation |
| 24 (Fraud Detection) | Pattern analysis for anomaly detection |

---

### 11. Cost Management

```typescript
// AI cost estimation per task type (approximate):
//
// | Task                    | Model Tier | Tokens  | Est. Cost | Frequency        |
// |-------------------------|-----------|---------|-----------|------------------|
// | Support auto-reply      | fast      | ~500    | $0.001    | Per ticket       |
// | Support draft           | standard  | ~1000   | $0.005    | Per ticket       |
// | Content generation      | fast      | ~300    | $0.0005   | Per item         |
// | Translate               | fast      | ~200    | $0.0003   | Per translation  |
// | Pricing suggestion      | standard  | ~2000   | $0.01     | Weekly per route |
// | Schedule suggestion     | standard  | ~2000   | $0.01     | Weekly per org   |
// | Booking intent parse    | fast      | ~200    | $0.0003   | Per message      |
// | Daily summary           | standard  | ~1500   | $0.007    | Daily per org    |
//
// Estimated monthly cost for a platform with 100 agencies:
// Support (500 tickets/day): ~$75/mo
// Content generation: ~$5/mo
// Suggestions: ~$40/mo
// Booking assistant: ~$30/mo
// Summaries: ~$21/mo
// Total: ~$170/mo (well within margins from subscription revenue)

// Cost controls:
// 1. Cache identical queries (Redis, TTL 1h for suggestions, 24h for content)
// 2. Use 'fast' tier for simple tasks (classification, translation, short content)
// 3. Per-org monthly budget cap (configurable)
// 4. Platform-wide daily budget cap (circuit breaker)
// 5. Fallback to rule-based logic if budget exhausted
```

---

## Acceptance Criteria

1. AI auto-responds to simple support tickets (status inquiries, FAQ) with > 85% accuracy
2. AI drafts responses for complex tickets, agents can approve/edit/reject
3. AI correctly classifies ticket category and priority
4. "Talk to human" from any AI conversation immediately escalates to human agent
5. Vehicle/trip/promo descriptions generated in all 4 languages
6. AI translation works between FR, EN, LN, SW
7. Pricing suggestions provided with reasoning and data backing
8. Natural language booking parsing handles FR, EN, LN, SW with abbreviations and fuzzy city names
9. Smart seat assignment maximizes seat utilization across segments
10. AI configuration per org: toggle features, set budget cap, add custom instructions
11. AI usage tracked with cost estimation, viewable by org admins and platform admin
12. AI responses cached to reduce cost and latency
13. Fallback to non-AI behavior when budget is exhausted or provider is down
14. All AI-generated content clearly labeled as AI-generated

---

## Dependencies
- Skill 01 (Foundation)
- Skill 04 (Trips & Booking) — for booking assistant and seat suggestions
- Skill 18 (Customer Support) — for support AI integration

## Blocks
- None (this is an enhancement layer; all features work without AI, AI makes them better)

## Impacts on Existing Skills
- **Skill 18 (Customer Support)**: Add AI auto-reply pipeline to ticket creation flow
- **Skill 19 (WhatsApp Bot)**: Use BookingAssistantService for natural language parsing
- **Skill 16 (USSD & SMS)**: Use AI for fuzzy city matching and SMS command parsing
- **Skill 12 (Marketplace)**: Use ContentAiService for auto-descriptions
- **Skill 09 (Dashboards)**: Add AI-generated summary widgets
