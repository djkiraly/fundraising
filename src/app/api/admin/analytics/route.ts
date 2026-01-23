import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { pageViews, analyticsEvents, players, donations } from '@/db/schema';
import { eq, sql, desc, gte, and, count } from 'drizzle-orm';

/**
 * GET /api/admin/analytics
 * Get analytics data for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d, all

    // Calculate date range
    let startDate: Date | null = null;
    const now = new Date();

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = null;
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Build date filter
    const dateFilter = startDate ? gte(pageViews.createdAt, startDate) : undefined;
    const eventDateFilter = startDate ? gte(analyticsEvents.createdAt, startDate) : undefined;
    const donationDateFilter = startDate ? gte(donations.createdAt, startDate) : undefined;

    // Get total page views
    const [totalPageViews] = await db
      .select({ count: count() })
      .from(pageViews)
      .where(dateFilter);

    // Get unique visitors (by session)
    const [uniqueVisitors] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${pageViews.sessionId})` })
      .from(pageViews)
      .where(dateFilter);

    // Get page views by day
    const pageViewsByDay = await db
      .select({
        date: sql<string>`DATE(${pageViews.createdAt})`.as('date'),
        views: count(),
        uniqueVisitors: sql<number>`COUNT(DISTINCT ${pageViews.sessionId})`,
      })
      .from(pageViews)
      .where(dateFilter)
      .groupBy(sql`DATE(${pageViews.createdAt})`)
      .orderBy(sql`DATE(${pageViews.createdAt})`);

    // Get top pages
    const topPages = await db
      .select({
        path: pageViews.path,
        views: count(),
        uniqueVisitors: sql<number>`COUNT(DISTINCT ${pageViews.sessionId})`,
      })
      .from(pageViews)
      .where(dateFilter)
      .groupBy(pageViews.path)
      .orderBy(desc(count()))
      .limit(10);

    // Get player page views
    const playerPageViews = await db
      .select({
        playerId: pageViews.playerId,
        playerName: players.name,
        views: count(),
        uniqueVisitors: sql<number>`COUNT(DISTINCT ${pageViews.sessionId})`,
      })
      .from(pageViews)
      .innerJoin(players, eq(pageViews.playerId, players.id))
      .where(dateFilter)
      .groupBy(pageViews.playerId, players.name)
      .orderBy(desc(count()))
      .limit(10);

    // Get device breakdown
    const deviceBreakdown = await db
      .select({
        deviceType: pageViews.deviceType,
        count: count(),
      })
      .from(pageViews)
      .where(dateFilter)
      .groupBy(pageViews.deviceType)
      .orderBy(desc(count()));

    // Get browser breakdown
    const browserBreakdown = await db
      .select({
        browser: pageViews.browser,
        count: count(),
      })
      .from(pageViews)
      .where(dateFilter)
      .groupBy(pageViews.browser)
      .orderBy(desc(count()))
      .limit(5);

    // Get OS breakdown
    const osBreakdown = await db
      .select({
        os: pageViews.os,
        count: count(),
      })
      .from(pageViews)
      .where(dateFilter)
      .groupBy(pageViews.os)
      .orderBy(desc(count()))
      .limit(5);

    // Get country breakdown
    const countryBreakdown = await db
      .select({
        country: pageViews.country,
        count: count(),
      })
      .from(pageViews)
      .where(and(dateFilter, sql`${pageViews.country} IS NOT NULL`))
      .groupBy(pageViews.country)
      .orderBy(desc(count()))
      .limit(10);

    // Get donation events
    const donationEvents = await db
      .select({
        eventType: analyticsEvents.eventType,
        count: count(),
        totalValue: sql<number>`COALESCE(SUM(${analyticsEvents.value}::numeric), 0)`,
      })
      .from(analyticsEvents)
      .where(and(
        eventDateFilter,
        sql`${analyticsEvents.eventType} IN ('donation_started', 'donation_completed', 'donation_failed', 'donation_cancelled')`
      ))
      .groupBy(analyticsEvents.eventType);

    // Get square interactions
    const [squareClicks] = await db
      .select({ count: count() })
      .from(analyticsEvents)
      .where(and(eventDateFilter, eq(analyticsEvents.eventType, 'square_click')));

    // Get actual donation stats from donations table
    const [successfulDonations] = await db
      .select({
        count: count(),
        total: sql<number>`COALESCE(SUM(${donations.amount}::numeric), 0)`,
      })
      .from(donations)
      .where(and(donationDateFilter, eq(donations.status, 'succeeded')));

    const [failedDonations] = await db
      .select({ count: count() })
      .from(donations)
      .where(and(donationDateFilter, eq(donations.status, 'failed')));

    const [pendingDonations] = await db
      .select({ count: count() })
      .from(donations)
      .where(and(donationDateFilter, eq(donations.status, 'pending')));

    // Get donations by day
    const donationsByDay = await db
      .select({
        date: sql<string>`DATE(${donations.createdAt})`.as('date'),
        count: count(),
        total: sql<number>`COALESCE(SUM(${donations.amount}::numeric), 0)`,
      })
      .from(donations)
      .where(and(donationDateFilter, eq(donations.status, 'succeeded')))
      .groupBy(sql`DATE(${donations.createdAt})`)
      .orderBy(sql`DATE(${donations.createdAt})`);

    // Calculate conversion rate
    const totalDonationAttempts = donationEvents.find(e => e.eventType === 'donation_started')?.count || 0;
    const successfulDonationEvents = donationEvents.find(e => e.eventType === 'donation_completed')?.count || 0;
    const conversionRate = totalDonationAttempts > 0
      ? ((successfulDonationEvents / totalDonationAttempts) * 100).toFixed(1)
      : '0';

    // Get referrer breakdown
    const referrerBreakdown = await db
      .select({
        referrer: sql<string>`
          CASE
            WHEN ${pageViews.referrer} IS NULL OR ${pageViews.referrer} = '' THEN 'Direct'
            WHEN ${pageViews.referrer} LIKE '%google.%' THEN 'Google'
            WHEN ${pageViews.referrer} LIKE '%facebook.%' OR ${pageViews.referrer} LIKE '%fb.%' THEN 'Facebook'
            WHEN ${pageViews.referrer} LIKE '%twitter.%' OR ${pageViews.referrer} LIKE '%t.co%' THEN 'Twitter/X'
            WHEN ${pageViews.referrer} LIKE '%instagram.%' THEN 'Instagram'
            WHEN ${pageViews.referrer} LIKE '%linkedin.%' THEN 'LinkedIn'
            ELSE 'Other'
          END
        `.as('referrer'),
        count: count(),
      })
      .from(pageViews)
      .where(dateFilter)
      .groupBy(sql`
        CASE
          WHEN ${pageViews.referrer} IS NULL OR ${pageViews.referrer} = '' THEN 'Direct'
          WHEN ${pageViews.referrer} LIKE '%google.%' THEN 'Google'
          WHEN ${pageViews.referrer} LIKE '%facebook.%' OR ${pageViews.referrer} LIKE '%fb.%' THEN 'Facebook'
          WHEN ${pageViews.referrer} LIKE '%twitter.%' OR ${pageViews.referrer} LIKE '%t.co%' THEN 'Twitter/X'
          WHEN ${pageViews.referrer} LIKE '%instagram.%' THEN 'Instagram'
          WHEN ${pageViews.referrer} LIKE '%linkedin.%' THEN 'LinkedIn'
          ELSE 'Other'
        END
      `)
      .orderBy(desc(count()));

    return NextResponse.json({
      period,
      overview: {
        totalPageViews: totalPageViews?.count || 0,
        uniqueVisitors: uniqueVisitors?.count || 0,
        squareClicks: squareClicks?.count || 0,
        conversionRate: parseFloat(conversionRate),
      },
      donations: {
        successful: {
          count: successfulDonations?.count || 0,
          total: parseFloat(String(successfulDonations?.total || 0)),
        },
        failed: failedDonations?.count || 0,
        pending: pendingDonations?.count || 0,
        events: donationEvents,
      },
      charts: {
        pageViewsByDay,
        donationsByDay,
      },
      topPages,
      playerPageViews,
      demographics: {
        devices: deviceBreakdown,
        browsers: browserBreakdown,
        operatingSystems: osBreakdown,
        countries: countryBreakdown,
        referrers: referrerBreakdown,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
