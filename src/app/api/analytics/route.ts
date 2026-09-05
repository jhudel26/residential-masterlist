
import { NextRequest, NextResponse } from "next/server";

const VERCEL_API_URL = "https://api.vercel.com";

/*
 * ============================================================
 * CACHE SETTINGS
 * ============================================================
 *
 * We intentionally cache analytics data for 5 minutes.
 *
 * This is important because the Vercel Web Analytics API has
 * a request limit. Refreshing your dashboard should NOT cause
 * another complete set of upstream requests every time.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type AggregateRow = Record<string, unknown>;

type DailyAnalytics = {
  date: string;
  label: string;
  pageviews: number;
  visitors: number;
};

type AnalyticsPayload = {
  success: true;

  period: {
    days: number;
    since: string;
    until: string;
  };

  pageViews: number;
  visitors: number;

  daily: DailyAnalytics[];

  topRoutes: Array<{
    route: string;
    pageviews: number;
    visitors: number;
  }>;

  topCountries: Array<{
    country: string;
    pageviews: number;
    visitors: number;
  }>;

  topDevices: Array<{
    deviceType: string;
    pageviews: number;
    visitors: number;
  }>;

  topBrowsers: Array<{
    browserName: string;
    pageviews: number;
    visitors: number;
  }>;

  topOperatingSystems: Array<{
    osName: string;
    pageviews: number;
    visitors: number;
  }>;

  topReferrers: Array<{
    referrerHostname: string;
    pageviews: number;
    visitors: number;
  }>;

  environments: Array<{
    environment: string;
    pageviews: number;
    visitors: number;
  }>;

  debug: Record<string, unknown>;
};

type CacheEntry = {
  timestamp: number;
  data: AnalyticsPayload;
};

/*
 * ============================================================
 * SERVER MEMORY CACHE
 * ============================================================
 *
 * This protects a warm Next.js/Vercel function from repeatedly
 * requesting the same analytics data.
 *
 * The upstream fetches ALSO use Next.js/Vercel Data Cache below,
 * so we have two layers of protection.
 */

const analyticsCache = new Map<string, CacheEntry>();

/*
 * Prevent multiple simultaneous requests for the same cache key.
 *
 * Example:
 *
 * 10 browser requests arrive at exactly the same time.
 *
 * WITHOUT this:
 *
 * 10 × all Vercel Analytics requests
 *
 * WITH this:
 *
 * 1 request to Vercel Analytics
 * 9 requests wait for the same promise
 */

const inFlightRequests = new Map<
  string,
  Promise<AnalyticsPayload>
>();

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getNumber(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function sortByPageviews(
  rows: AggregateRow[]
): AggregateRow[] {
  return [...rows].sort(
    (a, b) =>
      getNumber(b.pageviews) -
      getNumber(a.pageviews)
  );
}

function sortByVisitors(
  rows: AggregateRow[]
): AggregateRow[] {
  return [...rows].sort(
    (a, b) =>
      getNumber(b.visitors) -
      getNumber(a.visitors)
  );
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function getUtcDayRange(date: Date) {
  const start = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );

  const end = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );

  return {
    start,
    end,
  };
}

/*
 * ============================================================
 * MAIN GET HANDLER
 * ============================================================
 */

export async function GET(
  request: NextRequest
) {
  try {
    /*
     * ========================================================
     * ENVIRONMENT VARIABLES
     * ========================================================
     */

    const token =
      process.env.VERCEL_ANALYTICS_TOKEN;

    const projectId =
      process.env.VERCEL_PROJECT_ID;

    const teamId =
      process.env.VERCEL_TEAM_ID;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing VERCEL_ANALYTICS_TOKEN",
        },
        { status: 500 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing VERCEL_PROJECT_ID",
        },
        { status: 500 }
      );
    }

    /*
     * ========================================================
     * DAYS
     * ========================================================
     */

    const daysParam =
      request.nextUrl.searchParams.get(
        "days"
      ) || "7";

    let days = Number.parseInt(
      daysParam,
      10
    );

    if (!Number.isFinite(days)) {
      days = 7;
    }

    /*
     * Keep the maximum at 30 days.
     */

    days = Math.min(
      Math.max(days, 1),
      30
    );

    /*
     * ========================================================
     * CACHE KEY
     * ========================================================
     *
     * Different projects must never share cached data.
     */

    const cacheKey =
      `${projectId}:${teamId || "personal"}:${days}`;

    /*
     * ========================================================
     * CHECK SERVER MEMORY CACHE
     * ========================================================
     */

    const cached =
      analyticsCache.get(cacheKey);

    if (
      cached &&
      Date.now() - cached.timestamp <
        CACHE_TTL_MS
    ) {
      console.log(
        `[Analytics] Memory cache HIT: ${days} days`
      );

      return NextResponse.json(
        cached.data,
        {
          status: 200,
          headers: {
            "Cache-Control":
              "private, max-age=300, stale-while-revalidate=600",
          },
        }
      );
    }

    /*
     * ========================================================
     * CHECK FOR AN ALREADY RUNNING REQUEST
     * ========================================================
     */

    const existingRequest =
      inFlightRequests.get(cacheKey);

    if (existingRequest) {
      console.log(
        `[Analytics] Waiting for existing request: ${days} days`
      );

      try {
        const data =
          await existingRequest;

        return NextResponse.json(
          data,
          {
            status: 200,
            headers: {
              "Cache-Control":
                "private, max-age=300, stale-while-revalidate=600",
            },
          }
        );
      } catch (error) {
        console.error(
          "[Analytics] Existing request failed:",
          error
        );
      }
    }

    /*
     * ========================================================
     * CREATE ONE SHARED ANALYTICS REQUEST
     * ========================================================
     */

    const analyticsPromise =
      buildAnalyticsData({
        token,
        projectId,
        teamId,
        days,
      });

    inFlightRequests.set(
      cacheKey,
      analyticsPromise
    );

    try {
      const data =
        await analyticsPromise;

      /*
       * Save result in memory cache.
       */

      analyticsCache.set(
        cacheKey,
        {
          timestamp: Date.now(),
          data,
        }
      );

      /*
       * Keep memory cache from growing forever.
       */

      if (
        analyticsCache.size > 20
      ) {
        const oldestKey =
          analyticsCache.keys().next()
            .value;

        if (oldestKey) {
          analyticsCache.delete(
            oldestKey
          );
        }
      }

      return NextResponse.json(
        data,
        {
          status: 200,

          headers: {
            /*
             * Browser can use the response for
             * 5 minutes.
             *
             * This is PRIVATE because this endpoint
             * contains your project's analytics.
             */

            "Cache-Control":
              "private, max-age=300, stale-while-revalidate=600",
          },
        }
      );
    } finally {
      /*
       * Always remove the in-flight promise.
       */

      inFlightRequests.delete(
        cacheKey
      );
    }
  } catch (error) {
    console.error(
      "Analytics API unexpected error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unexpected analytics error",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ============================================================
 * BUILD ANALYTICS DATA
 * ============================================================
 */

async function buildAnalyticsData({
  token,
  projectId,
  teamId,
  days,
}: {
  token: string;
  projectId: string;
  teamId?: string;
  days: number;
}): Promise<AnalyticsPayload> {
  /*
   * ========================================================
   * DATE RANGE
   * ========================================================
   */

  const until = new Date();

  const since = new Date(
    until.getTime() -
      days *
        24 *
        60 *
        60 *
        1000
  );

  const sinceIso =
    since.toISOString();

  const untilIso =
    until.toISOString();

  /*
   * ========================================================
   * HEADERS
   * ========================================================
   */

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  /*
   * ========================================================
   * PARAM BUILDER
   * ========================================================
   */

  function buildParams(
    rangeSince: string,
    rangeUntil: string
  ) {
    const params =
      new URLSearchParams();

    params.set(
      "projectId",
      projectId
    );

    params.set(
      "since",
      rangeSince
    );

    params.set(
      "until",
      rangeUntil
    );

    params.set(
      "limit",
      "100"
    );

    if (teamId) {
      params.set(
        "teamId",
        teamId
      );
    }

    return params;
  }

  /*
   * ========================================================
   * VERCEL API REQUEST
   * ========================================================
   *
   * IMPORTANT:
   *
   * We no longer use:
   *
   *   cache: "no-store"
   *
   * Instead we allow Next.js/Vercel to cache the upstream
   * GET request for 5 minutes.
   *
   * This is a major protection against repeated dashboard
   * refreshes.
   */

  async function getAnalytics(
    endpoint: string,
    rangeSince: string,
    rangeUntil: string,
    extraParams: Record<
      string,
      string
    > = {}
  ) {
    const params =
      buildParams(
        rangeSince,
        rangeUntil
      );

    Object.entries(
      extraParams
    ).forEach(
      ([key, value]) => {
        params.set(
          key,
          value
        );
      }
    );

    const url =
      `${VERCEL_API_URL}${endpoint}?${params.toString()}`;

    /*
     * Cache duration:
     *
     * 300 seconds = 5 minutes
     */

    const response =
      await fetch(url, {
        method: "GET",

        headers,

        next: {
          revalidate: 300,
        },
      });

    const text =
      await response.text();

    /*
     * ======================================================
     * RATE LIMIT
     * ======================================================
     */

    if (
      response.status === 429
    ) {
      const retryAfter =
        response.headers.get(
          "retry-after"
        );

      console.error(
        `[Analytics] Vercel rate limit hit (${endpoint}). Retry-After: ${retryAfter || "unknown"}`
      );

      return {
        ok: false,
        status: 429,
        data: null,
        error: text,
        retryAfter,
      };
    }

    /*
     * ======================================================
     * OTHER ERRORS
     * ======================================================
     */

    if (!response.ok) {
      console.error(
        `Vercel Analytics API error (${endpoint}):`,
        response.status,
        text
      );

      return {
        ok: false,
        status: response.status,
        data: null,
        error: text,
        retryAfter: null,
      };
    }

    /*
     * ======================================================
     * JSON
     * ======================================================
     */

    try {
      return {
        ok: true,
        status: response.status,
        data: JSON.parse(text),
        error: null,
        retryAfter: null,
      };
    } catch {
      return {
        ok: false,
        status: response.status,
        data: null,
        error:
          "Invalid JSON response from Vercel",
        retryAfter: null,
      };
    }
  }

  /*
   * ========================================================
   * OVERALL REQUESTS
   * ========================================================
   *
   * There are 8 requests here:
   *
   * 1 count
   * 1 route
   * 1 country
   * 1 device
   * 1 browser
   * 1 OS
   * 1 referrer
   * 1 environment
   *
   * These are executed in parallel.
   */

  const countResult =
    await getAnalytics(
      "/v1/query/web-analytics/visits/count",
      sinceIso,
      untilIso
    );

  const [
    routesResult,
    countriesResult,
    devicesResult,
    browsersResult,
    operatingSystemsResult,
    referrersResult,
    environmentsResult,
  ] = await Promise.all([
    getAnalytics(
      "/v1/query/web-analytics/visits/aggregate",
      sinceIso,
      untilIso,
      {
        by: "route",
      }
    ),

    getAnalytics(
      "/v1/query/web-analytics/visits/aggregate",
      sinceIso,
      untilIso,
      {
        by: "country",
      }
    ),

    getAnalytics(
      "/v1/query/web-analytics/visits/aggregate",
      sinceIso,
      untilIso,
      {
        by: "deviceType",
      }
    ),

    getAnalytics(
      "/v1/query/web-analytics/visits/aggregate",
      sinceIso,
      untilIso,
      {
        by: "browserName",
      }
    ),

    getAnalytics(
      "/v1/query/web-analytics/visits/aggregate",
      sinceIso,
      untilIso,
      {
        by: "osName",
      }
    ),

    getAnalytics(
      "/v1/query/web-analytics/visits/aggregate",
      sinceIso,
      untilIso,
      {
        by: "referrerHostname",
      }
    ),

    getAnalytics(
      "/v1/query/web-analytics/visits/aggregate",
      sinceIso,
      untilIso,
      {
        by: "environment",
      }
    ),
  ]);

  /*
   * ========================================================
   * EXTRACT ROWS
   * ========================================================
   */

  const countData =
    countResult.data;

  const routeRows: AggregateRow[] =
    Array.isArray(
      routesResult.data?.data
    )
      ? routesResult.data.data
      : [];

  const countryRows: AggregateRow[] =
    Array.isArray(
      countriesResult.data?.data
    )
      ? countriesResult.data.data
      : [];

  const deviceRows: AggregateRow[] =
    Array.isArray(
      devicesResult.data?.data
    )
      ? devicesResult.data.data
      : [];

  const browserRows: AggregateRow[] =
    Array.isArray(
      browsersResult.data?.data
    )
      ? browsersResult.data.data
      : [];

  const operatingSystemRows: AggregateRow[] =
    Array.isArray(
      operatingSystemsResult.data?.data
    )
      ? operatingSystemsResult.data.data
      : [];

  const referrerRows: AggregateRow[] =
    Array.isArray(
      referrersResult.data?.data
    )
      ? referrersResult.data.data
      : [];

  const environmentRows: AggregateRow[] =
    Array.isArray(
      environmentsResult.data?.data
    )
      ? environmentsResult.data.data
      : [];

  /*
   * ========================================================
   * TOTAL PAGE VIEWS
   * ========================================================
   */

  const apiPageViews =
    getNumber(
      countData?.data?.pageviews
    );

  const aggregatePageViews =
    routeRows.reduce(
      (total, row) =>
        total +
        getNumber(
          row.pageviews
        ),
      0
    );

  const pageViews =
    apiPageViews > 0
      ? apiPageViews
      : aggregatePageViews;

  /*
   * ========================================================
   * TOTAL VISITORS
   * ========================================================
   */

  const apiVisitors =
    getNumber(
      countData?.data?.visitors
    );

  const aggregateVisitors =
    countryRows.reduce(
      (total, row) =>
        total +
        getNumber(
          row.visitors
        ),
      0
    );

  const visitors =
    apiVisitors > 0
      ? apiVisitors
      : aggregateVisitors;

  /*
   * ========================================================
   * DAILY TIME SERIES
   * ========================================================
   *
   * IMPORTANT CHANGE:
   *
   * BEFORE:
   *
   *   2 requests per day
   *
   *   route aggregate
   *   country aggregate
   *
   * NOW:
   *
   *   1 request per day
   *
   *   country aggregate
   *
   * The country aggregate contains BOTH:
   *
   *   pageviews
   *   visitors
   *
   * Therefore we can calculate both graph lines from
   * the SAME request.
   *
   * For 7 days:
   *
   *   7 requests
   *
   * instead of:
   *
   *   14 requests
   */

  const dailyDates: Date[] = [];

  for (
    let i = days - 1;
    i >= 0;
    i--
  ) {
    const date =
      new Date();

    date.setUTCDate(
      date.getUTCDate() - i
    );

    dailyDates.push(date);
  }

  /*
   * Execute daily requests in parallel.
   *
   * Each request is cached for 5 minutes.
   */

  const dailyResults =
    await Promise.all(
      dailyDates.map(
        async (date) => {
          const {
            start,
            end,
          } =
            getUtcDayRange(
              date
            );

          const daySince =
            start.toISOString();

          const dayUntil =
            end.toISOString();

          /*
           * ONE request for the day.
           *
           * Country rows contain both pageviews
           * and visitors.
           */

          const dayCountryResult =
            await getAnalytics(
              "/v1/query/web-analytics/visits/aggregate",
              daySince,
              dayUntil,
              {
                by: "country",
              }
            );

          const dayCountryRows: AggregateRow[] =
            Array.isArray(
              dayCountryResult
                .data?.data
            )
              ? dayCountryResult
                  .data.data
              : [];

          /*
           * Page views:
           *
           * Sum pageviews across countries.
           */

          const dayPageViews =
            dayCountryRows.reduce(
              (
                total,
                row
              ) =>
                total +
                getNumber(
                  row.pageviews
                ),
              0
            );

          /*
           * Visitors:
           *
           * Sum visitors across countries.
           *
           * This matches the same approach your
           * previous route used for visitor aggregation.
           */

          const dayVisitors =
            dayCountryRows.reduce(
              (
                total,
                row
              ) =>
                total +
                getNumber(
                  row.visitors
                ),
              0
            );

          return {
            date: start
              .toISOString()
              .slice(0, 10),

            label:
              formatDateLabel(
                start
              ),

            pageviews:
              dayPageViews,

            visitors:
              dayVisitors,
          };
        }
      )
    );

  /*
   * ========================================================
   * NORMALIZED DATA
   * ========================================================
   */

  const topRoutes =
    sortByPageviews(
      routeRows
    ).map(
      (row) => ({
        route: String(
          row.route || "/"
        ),

        pageviews:
          getNumber(
            row.pageviews
          ),

        visitors:
          getNumber(
            row.visitors
          ),
      })
    );

  const topCountries =
    sortByVisitors(
      countryRows
    ).map(
      (row) => ({
        country: String(
          row.country ||
            "Unknown"
        ),

        pageviews:
          getNumber(
            row.pageviews
          ),

        visitors:
          getNumber(
            row.visitors
          ),
      })
    );

  const topDevices =
    sortByVisitors(
      deviceRows
    ).map(
      (row) => ({
        deviceType: String(
          row.deviceType ||
            "Unknown"
        ),

        pageviews:
          getNumber(
            row.pageviews
          ),

        visitors:
          getNumber(
            row.visitors
          ),
      })
    );

  const topBrowsers =
    sortByVisitors(
      browserRows
    ).map(
      (row) => ({
        browserName: String(
          row.browserName ||
            "Unknown"
        ),

        pageviews:
          getNumber(
            row.pageviews
          ),

        visitors:
          getNumber(
            row.visitors
          ),
      })
    );

  const topOperatingSystems =
    sortByVisitors(
      operatingSystemRows
    ).map(
      (row) => ({
        osName: String(
          row.osName ||
            "Unknown"
        ),

        pageviews:
          getNumber(
            row.pageviews
          ),

        visitors:
          getNumber(
            row.visitors
          ),
      })
    );

  const topReferrers =
    sortByPageviews(
      referrerRows
    ).map(
      (row) => ({
        referrerHostname:
          String(
            row.referrerHostname ||
              ""
          ).trim() ||
          "Direct",

        pageviews:
          getNumber(
            row.pageviews
          ),

        visitors:
          getNumber(
            row.visitors
          ),
      })
    );

  const environments =
    sortByVisitors(
      environmentRows
    ).map(
      (row) => ({
        environment:
          String(
            row.environment ||
              "Unknown"
          ),

        pageviews:
          getNumber(
            row.pageviews
          ),

        visitors:
          getNumber(
            row.visitors
          ),
      })
    );

  /*
   * ========================================================
   * FINAL RESPONSE
   * ========================================================
   */

  return {
    success: true,

    period: {
      days,
      since: sinceIso,
      until: untilIso,
    },

    /*
     * TOTALS
     */

    pageViews,

    visitors,

    /*
     * BOTH GRAPH SERIES
     *
     * pageviews
     * visitors
     */

    daily: dailyResults,

    /*
     * BREAKDOWNS
     */

    topRoutes,

    topCountries,

    topDevices,

    topBrowsers,

    topOperatingSystems,

    topReferrers,

    environments,

    /*
     * ======================================================
     * DEBUG
     * ======================================================
     */

    debug: {
      /*
       * Overall totals
       */

      countPageViews:
        apiPageViews,

      countVisitors:
        apiVisitors,

      aggregatePageViews,

      aggregateVisitors,

      pageViewsSource:
        apiPageViews > 0
          ? "count"
          : "route aggregate",

      visitorsSource:
        apiVisitors > 0
          ? "count"
          : "country aggregate",

      /*
       * Daily graph
       */

      dailyPoints:
        dailyResults.length,

      dailyRequestStrategy:
        "one country aggregate per day",

      /*
       * Endpoint status
       */

      countEndpointOk:
        countResult.ok,

      routeEndpointOk:
        routesResult.ok,

      countryEndpointOk:
        countriesResult.ok,

      deviceEndpointOk:
        devicesResult.ok,

      browserEndpointOk:
        browsersResult.ok,

      operatingSystemEndpointOk:
        operatingSystemsResult.ok,

      referrerEndpointOk:
        referrersResult.ok,

      environmentEndpointOk:
        environmentsResult.ok,

      /*
       * Rate-limit protection
       */

      upstreamCacheSeconds:
        CACHE_TTL_MS / 1000,

      memoryCacheSeconds:
        CACHE_TTL_MS / 1000,

      /*
       * Approximate number of upstream requests
       *
       * 8 overall requests
       * + 1 request per day
       */

      estimatedUpstreamRequests:
        8 + days,
    },
  };
}
