# Skill 06: Notifications & Communication

## Objective
Build a multi-channel notification system supporting email, SMS, Telegram, and web push notifications. Notifications are processed asynchronously via BullMQ and users can configure their preferences per channel.

## Prerequisites
- Skill 01 (Foundation) completed
- BullMQ/Redis configured
- SMS provider account (Africa's Talking or Twilio)
- SMTP/Email provider (Resend, Mailgun, or SMTP server)
- Telegram Bot token (from @BotFather)

---

## Scope

### 1. Database Migrations

#### `notifications`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
user_id               BIGINT UNSIGNED FK -> users.id
organization_id       BIGINT UNSIGNED FK -> organizations.id NULL
channel               ENUM('email', 'sms', 'telegram', 'push')
type                  VARCHAR(100)            -- 'booking_confirmed', 'payment_receipt', etc.
title                 VARCHAR(255)
body                  TEXT
data                  JSON NULL               -- Structured payload for rich notifications
status                ENUM('pending', 'queued', 'sent', 'delivered', 'failed') DEFAULT 'pending'
error_message         TEXT NULL
external_id           VARCHAR(255) NULL       -- Provider message ID
sent_at               TIMESTAMP NULL
delivered_at          TIMESTAMP NULL
read_at               TIMESTAMP NULL
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(user_id, read_at)
INDEX(user_id, type)
INDEX(status)
INDEX(organization_id, created_at)
```

#### `notification_preferences`
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
user_id               BIGINT UNSIGNED FK -> users.id
channel               ENUM('email', 'sms', 'telegram', 'push')
type                  VARCHAR(100)            -- notification type or '*' for all
enabled               BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
UNIQUE(user_id, channel, type)
```

#### `telegram_links` (user links their Telegram account)
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
user_id               BIGINT UNSIGNED FK -> users.id
telegram_chat_id      BIGINT
telegram_username     VARCHAR(100) NULL
is_active             BOOLEAN DEFAULT true
linked_at             TIMESTAMP
created_at            TIMESTAMP
updated_at            TIMESTAMP
UNIQUE(user_id)
INDEX(telegram_chat_id)
```

#### `push_subscriptions` (Web Push)
```
id                    BIGINT UNSIGNED AUTO_INCREMENT PK
user_id               BIGINT UNSIGNED FK -> users.id
endpoint              TEXT
p256dh_key            VARCHAR(255)
auth_key              VARCHAR(255)
user_agent            VARCHAR(255) NULL
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
INDEX(user_id)
```

---

### 2. API Endpoints

```
# Notification management
GET    /api/v1/notifications                      # List user's notifications (paginated)
GET    /api/v1/notifications/unread-count          # Get unread count
PUT    /api/v1/notifications/:id/read              # Mark as read
PUT    /api/v1/notifications/read-all              # Mark all as read
DELETE /api/v1/notifications/:id                   # Delete notification

# Preferences
GET    /api/v1/notifications/preferences           # Get user preferences
PUT    /api/v1/notifications/preferences           # Update preferences

# Telegram linking
POST   /api/v1/notifications/telegram/link         # Get link code (user sends to bot)
DELETE /api/v1/notifications/telegram/unlink        # Unlink Telegram

# Push subscription
POST   /api/v1/notifications/push/subscribe        # Register push subscription
DELETE /api/v1/notifications/push/unsubscribe       # Remove push subscription

# Admin: send notifications
POST   /api/v1/notifications/send                  # Send notification to user(s)
POST   /api/v1/notifications/broadcast              # Broadcast to org or all users
```

---

### 3. Notification Service Architecture

```
                     +-----------------------+
                     |  NotificationService  |
                     |    (Dispatcher)       |
                     +----------+------------+
                                |
                     +----------v------------+
                     |   BullMQ Queue        |
                     |  'notifications'      |
                     +----------+------------+
                                |
              +-----------------+------------------+
              |                 |                   |
     +--------v------+  +------v--------+  +-------v-------+  +-------v-------+
     | EmailChannel  |  | SmsChannel    |  | TelegramChan  |  | PushChannel   |
     | (AdonisJS     |  | (Africa's     |  | (grammy /     |  | (web-push     |
     |  Mail)        |  |  Talking)     |  |  telegraf)    |  |  library)     |
     +---------------+  +---------------+  +---------------+  +---------------+
```

#### NotificationService (Dispatcher)
```typescript
// app/services/notification_service.ts
export class NotificationService {
  /**
   * Send a notification to a user across their preferred channels.
   */
  async notify(params: {
    userId: number
    type: NotificationType
    title: string
    body: string
    data?: Record<string, any>
    channels?: NotificationChannel[]  // Override: specific channels. If omitted, use preferences.
    organizationId?: number
  }): Promise<void> {
    // 1. Load user preferences for this notification type
    // 2. Determine which channels to use (explicit or from preferences)
    // 3. For each active channel:
    //    a. Create Notification record (status: pending)
    //    b. Dispatch SendNotificationJob to BullMQ queue
  }

  /**
   * Broadcast to multiple users (e.g., all passengers on a trip).
   */
  async broadcast(params: {
    userIds: number[]
    type: NotificationType
    title: string
    body: string
    data?: Record<string, any>
    organizationId?: number
  }): Promise<void> {
    // Batch dispatch: one job per user per channel
  }
}
```

#### Channel Implementations

**Email Channel**
```typescript
// app/services/notification/channels/email_channel.ts
export class EmailChannel implements NotificationChannel {
  async send(notification: Notification, user: User): Promise<SendResult> {
    // Use AdonisJS Mail
    // Templates: Edge templates in resources/views/emails/
    //   - booking_confirmed.edge
    //   - payment_receipt.edge
    //   - trip_departure_reminder.edge
    //   - trip_cancelled.edge
    //   - welcome.edge
    //   - otp_code.edge
    //   - kyc_approved.edge
    //   - kyc_rejected.edge
    // Attach PDF receipt if payment notification
  }
}
```

**SMS Channel**
```typescript
// app/services/notification/channels/sms_channel.ts
export class SmsChannel implements NotificationChannel {
  async send(notification: Notification, user: User): Promise<SendResult> {
    // Use Africa's Talking SMS API (or Twilio)
    // Keep messages short (< 160 chars for single SMS)
    // Template format: "Souple: Booking SP-XXXX confirmed. Kinshasa→Lubumbashi 26/02 at 08:00. Seat B3. Amount: 50,000 CDF"
  }
}
```

**Telegram Channel**
```typescript
// app/services/notification/channels/telegram_channel.ts
export class TelegramChannel implements NotificationChannel {
  async send(notification: Notification, user: User): Promise<SendResult> {
    // Load TelegramLink for user
    // Send formatted message via Bot API
    // Support markdown formatting
    // Include inline buttons (e.g., "View Booking" deep link to web app)
  }
}
```

**Push Channel**
```typescript
// app/services/notification/channels/push_channel.ts
export class PushChannel implements NotificationChannel {
  async send(notification: Notification, user: User): Promise<SendResult> {
    // Load PushSubscriptions for user
    // Use web-push library to send to all active subscriptions
    // Payload: { title, body, icon, badge, data: { url, type } }
    // Handle expired subscriptions (remove on 410 response)
  }
}
```

---

### 4. Telegram Bot

```typescript
// app/services/telegram_bot_service.ts
export class TelegramBotService {
  // Bot commands:
  // /start - Welcome message + link instructions
  // /link <code> - Link account using code from web app
  // /unlink - Unlink account
  // /bookings - List recent bookings
  // /track <code> - Track a booking

  async handleLinkCommand(chatId: number, code: string): Promise<void> {
    // 1. Validate code from Redis (set during /api/v1/notifications/telegram/link)
    // 2. Create TelegramLink record
    // 3. Send confirmation to chat
  }
}
```

---

### 5. Notification Types

| Type | Email | SMS | Telegram | Push | Trigger |
|------|:-----:|:---:|:--------:|:----:|---------|
| `booking_confirmed` | X | X | X | X | BookingCreated event (after payment) |
| `payment_receipt` | X | X | X | | PaymentCompleted event |
| `trip_departure_reminder` | | X | X | X | Cron: 2h before departure |
| `trip_cancelled` | X | X | X | X | TripStatusChanged event |
| `trip_started` | | | X | X | TripStatusChanged event |
| `trip_completed` | | | X | X | TripStatusChanged event |
| `parcel_status_update` | | X | X | X | ParcelScanned event |
| `kyc_approved` | X | X | X | | KYC review action |
| `kyc_rejected` | X | X | X | | KYC review action |
| `welcome` | X | | X | | UserRegistered event |
| `otp_code` | X | X | | | Auth OTP request |
| `fleet_booking_confirmed` | X | X | X | | FleetBooking confirmed |
| `payout_processed` | X | X | X | | Payout completed |

---

### 6. BullMQ Jobs

```typescript
// app/jobs/send_notification_job.ts
export default class SendNotificationJob {
  static queueName = 'notifications'

  async handle(payload: {
    notificationId: number
    channel: string
    userId: number
  }) {
    // 1. Load notification record
    // 2. Load user
    // 3. Resolve channel implementation
    // 4. Send notification
    // 5. Update notification status (sent/failed)
    // 6. Store external_id from provider
  }

  // Retry: 3 attempts with exponential backoff
  // Dead letter: move to failed queue after max retries
}

// app/jobs/send_trip_reminders_job.ts
export default class SendTripRemindersJob {
  static queueName = 'notifications'

  // Cron job: runs every 30 minutes
  // Finds trips departing in 2 hours that haven't been reminded
  // Sends reminder to all passengers with confirmed bookings
}
```

---

### 7. Frontend Components

#### Notification Center
- **NotificationBell** — Header icon with unread count badge
- **NotificationDropdown** — Dropdown list of recent notifications
- **NotificationList** — Full page list with filters (type, read/unread, date)
- **NotificationItem** — Single notification with icon, title, body, time, read status

#### Preferences
- **NotificationPreferences** — Settings page
  - Toggle per channel (email, SMS, Telegram, push)
  - Toggle per notification type per channel
  - Telegram linking flow (get code → send to bot)
  - Push notification permission request

---

## Acceptance Criteria

1. Booking confirmation sends email + SMS + push (based on user preferences)
2. Payment receipt email contains correct amounts and PDF attachment
3. SMS notifications are delivered and under 160 chars
4. Telegram bot can be linked via code flow
5. Telegram notifications arrive with formatted content
6. Web push notifications appear on subscribed devices
7. User can toggle notification preferences per type per channel
8. Trip departure reminders fire 2 hours before departure
9. Notification center shows unread count and list of notifications
10. Failed notifications are retried 3 times before being marked failed
11. Notification sending doesn't block the main API request (async via queue)

---

## Dependencies
- Skill 01 (Foundation)
- Skill 04 (Trips & Booking) — for booking/trip events

## Blocks
- Skill 05 (Payments) — uses this for receipt delivery
