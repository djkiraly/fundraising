import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pageViews, analyticsEvents } from '@/db/schema';
import { parseUserAgent } from '@/lib/analytics';

/**
 * POST /api/analytics/track
 * Track page views and events (public endpoint, no auth required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, sessionId, ...data } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get visitor information
    const userAgent = request.headers.get('user-agent');
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

    // Parse user agent for demographics
    const { deviceType, browser, os } = parseUserAgent(userAgent);

    // Get geolocation from headers (if available from CDN/proxy)
    // Many hosting providers add these headers
    const country = request.headers.get('cf-ipcountry') || // Cloudflare
                   request.headers.get('x-vercel-ip-country') || // Vercel
                   request.headers.get('x-country-code') ||
                   null;
    const region = request.headers.get('x-vercel-ip-country-region') ||
                  request.headers.get('x-region') ||
                  null;
    const city = request.headers.get('x-vercel-ip-city') ||
                request.headers.get('x-city') ||
                null;

    if (type === 'pageview') {
      // Track page view
      const { path, referrer, playerId } = data;

      if (!path) {
        return NextResponse.json({ error: 'Path required' }, { status: 400 });
      }

      await db.insert(pageViews).values({
        sessionId,
        path,
        referrer: referrer || null,
        playerId: playerId || null,
        ipAddress,
        userAgent,
        country,
        region,
        city,
        deviceType,
        browser,
        os,
      });

      return NextResponse.json({ success: true });
    }

    if (type === 'event') {
      // Track event
      const { eventType, path, playerId, squareId, donationId, value, metadata } = data;

      if (!eventType || !path) {
        return NextResponse.json({ error: 'Event type and path required' }, { status: 400 });
      }

      // Validate event type
      const validEventTypes = [
        'page_view',
        'square_click',
        'square_hover',
        'donation_started',
        'donation_completed',
        'donation_failed',
        'donation_cancelled',
        'share_click',
        'outbound_link',
      ];

      if (!validEventTypes.includes(eventType)) {
        return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
      }

      await db.insert(analyticsEvents).values({
        sessionId,
        eventType,
        path,
        playerId: playerId || null,
        squareId: squareId || null,
        donationId: donationId || null,
        value: value ? value.toString() : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress,
        userAgent,
        country,
        deviceType,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid tracking type' }, { status: 400 });
  } catch (error) {
    // Don't log errors for analytics - they shouldn't disrupt the app
    console.debug('Analytics tracking error:', error);
    return NextResponse.json({ success: false }, { status: 200 }); // Return 200 to not trigger retries
  }
}
