# Skill 21: In-App Messaging

## Objective
Build a messaging system for communication between passengers and drivers/agencies within the platform. Handle pre-trip questions, trip-day coordination, post-trip follow-up, and lost item inquiries — while keeping contact details private to prevent platform bypass.

## Prerequisites
- Skill 01 (Foundation) completed
- Skill 04 (Trips & Booking) completed
- Skill 06 (Notifications) completed

---

## Scope

### 1. Database Migrations

#### `conversations`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
booking_id            BIGINT UNSIGNED FK -> bookings.id NULL  -- Context: related booking
trip_id               BIGINT UNSIGNED FK -> trips.id NULL
type                  ENUM('passenger_agency', 'passenger_driver', 'internal')
participant_a_id      BIGINT UNSIGNED FK -> users.id
participant_b_id      BIGINT UNSIGNED FK -> users.id NULL
participant_b_org_id  BIGINT UNSIGNED FK -> organizations.id NULL  -- For passenger_agency type
status                ENUM('active', 'archived', 'blocked') DEFAULT 'active'
last_message_at       TIMESTAMP NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(participant_a_id, last_message_at)
INDEX(participant_b_id, last_message_at)
INDEX(participant_b_org_id, last_message_at)
INDEX(booking_id)
```

#### `messages`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
conversation_id       BIGINT UNSIGNED FK -> conversations.id
sender_id             BIGINT UNSIGNED FK -> users.id
content               TEXT
type                  ENUM('text', 'image', 'system') DEFAULT 'text'
image_url             VARCHAR(500) NULL
is_read               BOOLEAN DEFAULT false
read_at               TIMESTAMP NULL
created_at            TIMESTAMP
INDEX(conversation_id, created_at)
INDEX(sender_id)
```

#### `canned_responses`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL  -- NULL = platform defaults
category              VARCHAR(50)               -- 'greeting', 'pickup', 'delay', 'arrival'
text                  JSON                      -- {"fr": "...", "en": "...", "ln": "...", "sw": "..."}
sort_order            INT DEFAULT 0
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
INDEX(organization_id, category)
```

### 2. Messaging Service

```typescript
// app/services/messaging_service.ts
export class MessagingService {
  async startConversation(params: {
    initiatorUserId: number
    bookingId?: number
    tripId?: number
    targetUserId?: number
    targetOrgId?: number
  }): Promise<Conversation> {
    // 1. Check if conversation already exists for this booking/trip + participants
    // 2. If exists: return existing conversation
    // 3. If not: create new conversation
    // 4. Only allow conversations related to a booking or trip (prevent spam)
  }

  async sendMessage(conversationId: number, senderId: number, content: string): Promise<Message> {
    // 1. Validate sender is participant
    // 2. Filter content: strip phone numbers, email addresses (prevent platform bypass)
    // 3. Create message
    // 4. Update conversation.last_message_at
    // 5. Send push notification to recipient
    // 6. If recipient is org: notify relevant org members (driver, manager)
  }

  async getConversations(userId: number, orgId?: number): Promise<Conversation[]> {
    // List conversations for user or org
    // Include last message preview, unread count
    // Sort by last_message_at desc
  }

  async markAsRead(conversationId: number, userId: number): Promise<void> {
    // Mark all unread messages in conversation as read
    // Update read_at timestamp
  }

  /**
   * System messages sent automatically:
   * - "Your trip departs in 1 hour" (auto-opens conversation if not exists)
   * - "Trip has been cancelled" (system message in existing conversation)
   * - "Driver is on the way to pickup point"
   */
  async sendSystemMessage(conversationId: number, content: string): Promise<Message> {}
}
```

### 3. Content Moderation

```typescript
// Phone number and email detection to prevent platform bypass
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

function filterContent(text: string): { filtered: string, hadContactInfo: boolean } {
  const hasPhone = PHONE_REGEX.test(text)
  const hasEmail = EMAIL_REGEX.test(text)
  const filtered = text
    .replace(PHONE_REGEX, '[phone hidden]')
    .replace(EMAIL_REGEX, '[email hidden]')
  return { filtered, hadContactInfo: hasPhone || hasEmail }
}
// If contact info detected: send message but also log for review
// After X violations: warn user about terms of service
```

### 4. API Endpoints

```
# Conversations
GET    /api/v1/conversations                      # My conversations (with unread counts)
POST   /api/v1/conversations                      # Start conversation (requires bookingId or tripId)
GET    /api/v1/conversations/:id                  # Conversation details + messages
POST   /api/v1/conversations/:id/messages         # Send message
PUT    /api/v1/conversations/:id/read             # Mark as read
PUT    /api/v1/conversations/:id/archive          # Archive conversation

# Org conversations
GET    /api/v1/org/conversations                  # All org conversations
POST   /api/v1/org/conversations/:id/messages     # Reply as org

# Canned responses
GET    /api/v1/org/canned-responses               # List canned responses
POST   /api/v1/org/canned-responses               # Create
PUT    /api/v1/org/canned-responses/:id           # Update
DELETE /api/v1/org/canned-responses/:id           # Delete
```

### 5. Frontend Components

- **ConversationList** — List of conversations with unread badge, last message preview, time
- **ChatWindow** — Message thread, input field, send button, image upload
- **CannedResponsePicker** — Quick reply buttons for drivers/agencies (tap to insert)
- **ContactButton** — "Message Agency" / "Message Driver" button on booking detail and trip detail pages
- **UnreadBadge** — Notification dot on navigation messaging icon
- **SystemMessage** — Distinct styling for system-generated messages (gray, italic, centered)

---

## Acceptance Criteria

1. Passengers can start conversations with agencies/drivers related to their bookings
2. Messages deliver in real-time with push notification to recipient
3. Phone numbers and emails are filtered from message content
4. Unread message count shows on navigation badge
5. Canned responses available for drivers/agencies (quick replies)
6. Conversations are scoped to bookings/trips (no random messaging)
7. System messages sent automatically for trip events
8. Org members (any with message permission) can reply on behalf of the org
9. Conversation list sorted by most recent message
10. Message history persisted and loadable (pagination)

---

## Dependencies
- Skill 01, 04, 06

## Blocks
- None
