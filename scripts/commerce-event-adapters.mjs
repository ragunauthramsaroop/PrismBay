import { createCommerceEvent, validateCommerceEvent } from './commerce-event-taxonomy.mjs';

export function createNoOpCommerceAnalyticsAdapter() {
  return {
    provider: 'noop',
    enabled: false,
    async capture(eventName, properties = {}, options = {}) {
      const event = createCommerceEvent(eventName, properties, options);
      const validation = validateCommerceEvent(event);
      if (!validation.ok) throw new Error(`invalid_commerce_event:${validation.errors.join(',')}`);
      return { accepted: false, sent: false, reason: 'analytics_provider_disabled', event };
    }
  };
}

export function createPostHogLikeAdapter({ enabled = false, captureFn = null } = {}) {
  if (!enabled) return createNoOpCommerceAnalyticsAdapter();
  if (typeof captureFn !== 'function') throw new Error('capture_function_required_when_enabled');

  return {
    provider: 'posthog-compatible',
    enabled: true,
    async capture(eventName, properties = {}, options = {}) {
      const event = createCommerceEvent(eventName, properties, options);
      const validation = validateCommerceEvent(event);
      if (!validation.ok) throw new Error(`invalid_commerce_event:${validation.errors.join(',')}`);
      await captureFn(event);
      return { accepted: true, sent: true, event };
    }
  };
}
