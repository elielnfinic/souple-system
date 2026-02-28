import { Queue, Worker, type Job } from 'bullmq'
import { DateTime } from 'luxon'
import redis from '@adonisjs/redis/services/main'
import db from '@adonisjs/lucid/services/db'
import notificationService from '#services/notification_service'

// ─── Scheduler ────────────────────────────────────────────────────────────────

/**
 * Schedule the trip departure reminder cron job using BullMQ's repeateable jobs.
 * Call once at startup — BullMQ deduplicates by jobId so it's idempotent.
 *
 * Runs every 30 minutes. Each run finds trips departing in ~2 hours and
 * sends a reminder to all passengers with confirmed bookings.
 */
export async function scheduleTripReminders(): Promise<void> {
  const queue = new Queue('trip-reminders', {
    connection: redis.connection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: 10,
      removeOnFail: 50,
    },
  })

  await queue.add(
    'send_trip_reminders',
    {},
    {
      repeat: {
        every: 30 * 60 * 1000, // every 30 minutes in ms
      },
      jobId: 'trip-reminders-cron',
    }
  )

  console.info('[TripReminders] Cron job scheduled (every 30 min)')
}

// ─── Worker ───────────────────────────────────────────────────────────────────

/**
 * Start the BullMQ worker that processes trip reminder jobs.
 *
 * For each run:
 *   1. Query trips departing between now+1h45min and now+2h15min
 *      (45-min window centred on the 2-hour mark, prevents double-sending)
 *   2. For each trip, load confirmed booking user IDs
 *   3. Broadcast 'trip_departure_reminder' notification to those users
 */
export function startTripRemindersWorker(): Worker {
  const worker = new Worker(
    'trip-reminders',
    async (_job: Job) => {
      const now = DateTime.utc()
      const windowStart = now.plus({ minutes: 105 }) // 1h 45min from now
      const windowEnd = now.plus({ minutes: 135 })   // 2h 15min from now

      // Find trips in the departure window
      const trips = await db
        .from('trips')
        .whereIn('status', ['scheduled', 'boarding'])
        .whereBetween('departure_at', [
          windowStart.toSQL()!,
          windowEnd.toSQL()!,
        ])
        .select('id', 'departure_at', 'organization_id')

      if (trips.length === 0) {
        console.info('[TripReminders] No trips departing in the 2-hour window')
        return
      }

      console.info(`[TripReminders] Found ${trips.length} trip(s) needing reminders`)

      for (const trip of trips) {
        try {
          // Load confirmed bookings for this trip
          const bookings = await db
            .from('bookings')
            .where('trip_id', trip.id)
            .whereIn('status', ['confirmed', 'checked_in'])
            .whereNotNull('user_id')
            .select('user_id', 'passenger_name', 'passenger_phone')

          const userIds = [
            ...new Set(
              bookings
                .map((b: { user_id: number | null }) => b.user_id)
                .filter((id: number | null): id is number => id !== null)
            ),
          ]

          if (userIds.length === 0) continue

          // Format departure time for the notification body
          const departureTime = DateTime.fromJSDate(new Date(trip.departure_at))
            .setZone('Africa/Kinshasa')
            .toFormat('HH:mm')

          await notificationService.broadcast({
            userIds,
            type: 'trip_departure_reminder',
            title: 'Rappel de départ',
            body: `Votre voyage part dans environ 2 heures (${departureTime}). Veuillez vous présenter à l'arrêt de départ. Bon voyage avec Souple!`,
            data: {
              tripId: trip.id,
              departureAt: trip.departure_at,
            },
            organizationId: trip.organization_id ?? undefined,
          })

          console.info(
            `[TripReminders] Sent reminders for trip ${trip.id} to ${userIds.length} passenger(s)`
          )
        } catch (error) {
          console.error(`[TripReminders] Failed to process trip ${trip.id}:`, error)
        }
      }
    },
    {
      connection: redis.connection(),
      concurrency: 1, // Process one cron tick at a time
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[TripReminders] Job ${job?.id ?? 'unknown'} failed: ${err.message}`)
  })

  worker.on('error', (err) => {
    console.error('[TripReminders] Worker error:', err)
  })

  return worker
}
