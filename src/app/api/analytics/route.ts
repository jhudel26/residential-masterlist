import { NextRequest, NextResponse } from "next/server";

const VERCEL_API_URL = "https://api.vercel.com";

type AggregateRow = Record<string, unknown>;

type DailyAnalytics = {
  date: string;
  label: string;
  pageviews: number;
  visitors: number;
};

function getNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sortByPageviews(rows: AggregateRow[]): AggregateRow[] {
  return [...rows].sort(
    (a, b) => getNumber(b.pageviews) - getNumber(a.pageviews)
  );
}

function sortByVisitors(rows: AggregateRow[]): AggregateRow[] {
  return [...rows].sort(
    (a, b) => getNumber(b.visitors) - getNumber(a.visitors)
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

export async function GET(request: NextRequest) {
  try {
    const token = process.env.VERCEL_ANALYTICS_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing VERCEL_ANALYTICS_TOKEN",
        },
        { status: 500 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing VERCEL_PROJECT_ID",
        },
        { status: 500 }
      );
    }

    const daysParam =
      request.nextUrl.searchParams.get("days") || "7";

    let days = Number.parseInt(daysParam, 10);

    if (!Number.isFinite(days)) {
      days = 7;
    }

    days = Math.min(Math.max(days, 1), 30);

    const until = new Date();

    const since = new Date(
      until.getTime() -
        days * 24 * 60 * 60 * 1000
    );

    const sinceIso = since.toISOString();
    const untilIso = until.toISOString();

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };

    function buildParams(
      rangeSince: string,
      rangeUntil: string
    ) {
      const params = new URLSearchParams();

      params.set("projectId", projectId!);
      params.set("since", rangeSince);
      params.set("until", rangeUntil);
      params.set("limit", "100");

      if (teamId) {
        params.set("teamId", teamId);
      }

      return params;
    }

    async function getAnalytics(
      endpoint: string,
      rangeSince: string,
      rangeUntil: string,
      extraParams: Record<string, string> = {}
    ) {
      const params = buildParams(
        rangeSince,
        rangeUntil
      );

      Object.entries(extraParams).forEach(
        ([key, value]) => {
          params.set(key, value);
        }
      );

      const url =
        `${VERCEL_API_URL}${endpoint}?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const text = await response.text();

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
        };
      }

      try {
        return {
          ok: true,
          status: response.status,
          data: JSON.parse(text),
          error: null,
        };
      } catch {
        return {
          ok: false,
          status: response.status,
          data: null,
          error:
            "Invalid JSON response from Vercel",
        };
      }
    }

    /*
     * ============================================================
     * OVERALL
     * ============================================================
     */

    const countResult = await getAnalytics(
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

    const countData = countResult.data;

    const routeRows: AggregateRow[] =
      Array.isArray(routesResult.data?.data)
        ? routesResult.data.data
        : [];

    const countryRows: AggregateRow[] =
      Array.isArray(countriesResult.data?.data)
        ? countriesResult.data.data
        : [];

    const deviceRows: AggregateRow[] =
      Array.isArray(devicesResult.data?.data)
        ? devicesResult.data.data
        : [];

    const browserRows: AggregateRow[] =
      Array.isArray(browsersResult.data?.data)
        ? browsersResult.data.data
        : [];

    const operatingSystemRows: AggregateRow[] =
      Array.isArray(
        operatingSystemsResult.data?.data
      )
        ? operatingSystemsResult.data.data
        : [];

    const referrerRows: AggregateRow[] =
      Array.isArray(referrersResult.data?.data)
        ? referrersResult.data.data
        : [];

    const environmentRows: AggregateRow[] =
      Array.isArray(
        environmentsResult.data?.data
      )
        ? environmentsResult.data.data
        : [];

    /*
     * ============================================================
     * TOTALS
     * ============================================================
     */

    const apiPageViews = getNumber(
      countData?.data?.pageviews
    );

    const aggregatePageViews =
      routeRows.reduce(
        (total, row) =>
          total + getNumber(row.pageviews),
        0
      );

    const pageViews =
      apiPageViews > 0
        ? apiPageViews
        : aggregatePageViews;

    const apiVisitors = getNumber(
      countData?.data?.visitors
    );

    const aggregateVisitors =
      countryRows.reduce(
        (total, row) =>
          total + getNumber(row.visitors),
        0
      );

    const visitors =
      apiVisitors > 0
        ? apiVisitors
        : aggregateVisitors;

    /*
     * ============================================================
     * DAILY TIME SERIES
     *
     * IMPORTANT:
     * Both series are returned:
     *
     * pageviews
     * visitors
     * ============================================================
     */

    const dailyDates: Date[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();

      date.setUTCDate(
        date.getUTCDate() - i
      );

      dailyDates.push(date);
    }

    const dailyResults: DailyAnalytics[] =
      await Promise.all(
        dailyDates.map(async (date) => {
          const {
            start,
            end,
          } = getUtcDayRange(date);

          const daySince =
            start.toISOString();

          const dayUntil =
            end.toISOString();

          const [
            dayRoutesResult,
            dayCountriesResult,
          ] = await Promise.all([
            getAnalytics(
              "/v1/query/web-analytics/visits/aggregate",
              daySince,
              dayUntil,
              {
                by: "route",
              }
            ),

            getAnalytics(
              "/v1/query/web-analytics/visits/aggregate",
              daySince,
              dayUntil,
              {
                by: "country",
              }
            ),
          ]);

          const dayRouteRows: AggregateRow[] =
            Array.isArray(
              dayRoutesResult.data?.data
            )
              ? dayRoutesResult.data.data
              : [];

          const dayCountryRows: AggregateRow[] =
            Array.isArray(
              dayCountriesResult.data?.data
            )
              ? dayCountriesResult.data.data
              : [];

          const dayPageViews =
            dayRouteRows.reduce(
              (total, row) =>
                total +
                getNumber(
                  row.pageviews
                ),
              0
            );

          const dayVisitors =
            dayCountryRows.reduce(
              (total, row) =>
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
              formatDateLabel(start),

            pageviews:
              dayPageViews,

            visitors:
              dayVisitors,
          };
        })
      );

    /*
     * ============================================================
     * NORMALIZED DATA
     * ============================================================
     */

    const topRoutes =
      sortByPageviews(
        routeRows
      ).map((row) => ({
        route: String(
          row.route || "/"
        ),
        pageviews: getNumber(
          row.pageviews
        ),
        visitors: getNumber(
          row.visitors
        ),
      }));

    const topCountries =
      sortByVisitors(
        countryRows
      ).map((row) => ({
        country: String(
          row.country || "Unknown"
        ),
        pageviews: getNumber(
          row.pageviews
        ),
        visitors: getNumber(
          row.visitors
        ),
      }));

    const topDevices =
      sortByVisitors(
        deviceRows
      ).map((row) => ({
        deviceType: String(
          row.deviceType ||
            "Unknown"
        ),
        pageviews: getNumber(
          row.pageviews
        ),
        visitors: getNumber(
          row.visitors
        ),
      }));

    const topBrowsers =
      sortByVisitors(
        browserRows
      ).map((row) => ({
        browserName: String(
          row.browserName ||
            "Unknown"
        ),
        pageviews: getNumber(
          row.pageviews
        ),
        visitors: getNumber(
          row.visitors
        ),
      }));

    const topOperatingSystems =
      sortByVisitors(
        operatingSystemRows
      ).map((row) => ({
        osName: String(
          row.osName ||
            "Unknown"
        ),
        pageviews: getNumber(
          row.pageviews
        ),
        visitors: getNumber(
          row.visitors
        ),
      }));

    const topReferrers =
      sortByPageviews(
        referrerRows
      ).map((row) => ({
        referrerHostname:
          String(
            row.referrerHostname ||
              ""
          ).trim() ||
          "Direct",

        pageviews: getNumber(
          row.pageviews
        ),

        visitors: getNumber(
          row.visitors
        ),
      }));

    const environments =
      sortByVisitors(
        environmentRows
      ).map((row) => ({
        environment: String(
          row.environment ||
            "Unknown"
        ),

        pageviews: getNumber(
          row.pageviews
        ),

        visitors: getNumber(
          row.visitors
        ),
      }));

    return NextResponse.json(
      {
        success: true,

        period: {
          days,
          since: sinceIso,
          until: untilIso,
        },

        pageViews,
        visitors,

        /*
         * BOTH Page Views and Visitors
         */
        daily: dailyResults,

        topRoutes,
        topCountries,
        topDevices,
        topBrowsers,
        topOperatingSystems,
        topReferrers,
        environments,

        debug: {
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

          dailyPoints:
            dailyResults.length,

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
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, max-age=60",
        },
      }
    );
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