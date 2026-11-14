import posthog from 'posthog-js'

let initialized = false

export function initPostHog(): void {
   if (initialized || !import.meta.env.DEV) return

   const key = import.meta.env.VITE_POSTHOG_KEY
   const host = import.meta.env.VITE_POSTHOG_HOST
   const enabled = import.meta.env.VITE_POSTHOG_ENABLED === 'true'

   if (!enabled || !key || !host) {
      console.warn('[PostHog] Tracking is not configured')
      return
   }

   posthog.init(key, {
      api_host: host,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      capture_exceptions: false,
   })

   initialized = true
}

export function sendTrackingDemoSession(productId: string): string {
   const sessionId = posthog.get_session_id()
   const steps = [
      { name: 'search', data: { query: 'demo laptop', result_count: 1, page: 'search' } },
      {
         name: 'product_impression',
         data: { product_id: productId, list_id: 'demo-list', position: 1, page: 'catalog' },
      },
      {
         name: 'product_click',
         data: { product_id: productId, list_id: 'demo-list', position: 1, page: 'catalog' },
      },
      { name: 'product_view', data: { product_id: productId, page: 'product_detail' } },
      { name: 'add_to_cart', data: { product_id: productId, page: 'product_detail' } },
   ] as const

   for (const step of steps) {
      const eventId = crypto.randomUUID()
      posthog.capture(step.name, {
         ...step.data,
         event_id: eventId,
         $insert_id: eventId,
         session_id: sessionId,
         app: 'nutee',
         environment: 'dev',
         source: 'website',
         synthetic: true,
         schema_version: 1,
      })
   }
   return sessionId
}

type TrackingEvent =
   | 'product_impression'
   | 'product_click'
   | 'product_view'
   | 'search'
   | 'add_to_cart'
   | 'remove_from_cart'
   | 'cart_quantity_changed'
   | 'checkout_started'

type EventProperties = Record<string, string | number | boolean | null>

export function trackEvent(eventName: TrackingEvent, properties: EventProperties = {}): void {
   if (!initialized) return

   try {
      const eventId = crypto.randomUUID()

      posthog.capture(eventName, {
         ...properties,
         event_id: eventId,
         $insert_id: eventId,
         session_id: posthog.get_session_id(),
         app: 'nutee',
         source: 'website',
         environment: 'dev',
         synthetic: false,
         schema_version: 1,
      })

      if (import.meta.env.DEV) {
         console.debug('[NUTEE Tracking]', eventName, eventId)
      }
   } catch (error) {
      // Analytics must not interrupt navigation or a successful cart mutation.
      if (import.meta.env.DEV) console.warn('[NUTEE Tracking] Capture failed', error)
   }
}

export function identifyTrackingUser(userId: string): void {
   if (!initialized || !userId.trim()) return

   if (posthog.get_distinct_id() !== userId) {
      posthog.identify(userId)
   }
}

export function resetTrackingOnLogout(): void {
   if (initialized) {
      posthog.reset()
   }
}
