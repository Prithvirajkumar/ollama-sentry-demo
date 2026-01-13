/**
 * Sentry Initialization
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initializeSentry(dsn?: string) {
  if (!dsn) {
    console.warn('⚠️  SENTRY_DSN not provided. Sentry monitoring will be disabled.');
    console.warn('   To enable Sentry, set SENTRY_DSN in your .env file');
    return;
  }

  Sentry.init({
    dsn,
    
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing
    tracesSampleRate: 1.0,

    // Enable profiling
    profilesSampleRate: 1.0,

    integrations: [
      nodeProfilingIntegration(),
    ],

    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Enable debug mode for development
    debug: process.env.NODE_ENV === 'development',

    // Add context
    beforeSend(event) {
      console.log('📊 Sending event to Sentry:', event.event_id);
      return event;
    },
  });

  console.log('✅ Sentry initialized successfully');
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Traces Sample Rate: 100%`);
}

