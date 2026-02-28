/**
 * Workers startup preload — Skill 06: Notifications & Communication
 *
 * This file starts the BullMQ workers and schedules the trip reminders cron.
 * It is registered in adonisrc.ts preloads and only runs in the HTTP server
 * process (not during CLI commands like migrations).
 *
 * In production you may run workers in a separate process by importing and
 * calling startNotificationWorker() / startTripRemindersWorker() directly
 * from a dedicated worker entrypoint, keeping the API process lean.
 */

import app from '@adonisjs/core/services/app'

// Only boot workers when the HTTP server is starting (not during ace commands)
app.ready(async () => {
  const { startNotificationWorker } = await import('#jobs/send_notification_job')
  const { startTripRemindersWorker, scheduleTripReminders } = await import(
    '#jobs/send_trip_reminders_job'
  )

  startNotificationWorker()
  startTripRemindersWorker()
  await scheduleTripReminders()

  console.info('[Workers] Notification worker and trip reminders cron started')
})
