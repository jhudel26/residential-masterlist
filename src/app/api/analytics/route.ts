import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const vercelToken = process.env.VERCEL_ANALYTICS_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID;

    console.log("Analytics API - Environment check:", {
      hasToken: !!vercelToken,
      hasProjectId: !!projectId,
      hasTeamId: !!teamId,
      projectId: projectId?.substring(0, 10) + "...",
    });

    if (!vercelToken) {
      console.error("Missing credentials:", { hasToken: !!vercelToken });
      return NextResponse.json(
        { error: "Missing Vercel Analytics credentials" },
        { status: 500 }
      );
    }

    // Get date range (last 7 days - user's data timeframe)
    const until = new Date().toISOString();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const commonParams = new URLSearchParams({
      since,
      until,
      limit: "10",
    });

    // Use only projectId - project-scoped token should handle team automatically
    if (projectId) {
      commonParams.append("projectId", projectId);
    }

    // Fetch page views and visitors count
    const countUrl = new URL("https://api.vercel.com/v1/query/web-analytics/visits/count");
    countUrl.search = commonParams.toString();
    console.log("Count API URL:", countUrl.toString());

    const countResponse = await fetch(countUrl.toString(), {
      headers: { Authorization: `Bearer ${vercelToken}` },
    });

    if (!countResponse.ok) {
      const errorText = await countResponse.text();
      console.error("Vercel count API error:", countResponse.status, errorText);
      throw new Error(`Vercel count API error: ${countResponse.statusText}`);
    }

    const countData = await countResponse.json();
    console.log("Count data:", countData);

    // Fetch top routes
    const routesUrl = new URL("https://api.vercel.com/v1/query/web-analytics/visits/aggregate");
    routesUrl.search = commonParams.toString();
    routesUrl.searchParams.append("groupBy", "route");

    const routesResponse = await fetch(routesUrl.toString(), {
      headers: { Authorization: `Bearer ${vercelToken}` },
    });

    const routesData = routesResponse.ok ? await routesResponse.json() : { data: [] };
    console.log("Routes data:", routesData);

    // Fetch top countries
    const countriesUrl = new URL("https://api.vercel.com/v1/query/web-analytics/visits/aggregate");
    countriesUrl.search = commonParams.toString();
    countriesUrl.searchParams.append("groupBy", "country");

    const countriesResponse = await fetch(countriesUrl.toString(), {
      headers: { Authorization: `Bearer ${vercelToken}` },
    });

    const countriesData = countriesResponse.ok ? await countriesResponse.json() : { data: [] };

    // Fetch top devices
    const devicesUrl = new URL("https://api.vercel.com/v1/query/web-analytics/visits/aggregate");
    devicesUrl.search = commonParams.toString();
    devicesUrl.searchParams.append("groupBy", "deviceType");

    const devicesResponse = await fetch(devicesUrl.toString(), {
      headers: { Authorization: `Bearer ${vercelToken}` },
    });

    const devicesData = devicesResponse.ok ? await devicesResponse.json() : { data: [] };

    // Fetch top browsers
    const browsersUrl = new URL("https://api.vercel.com/v1/query/web-analytics/visits/aggregate");
    browsersUrl.search = commonParams.toString();
    browsersUrl.searchParams.append("groupBy", "browserName");

    const browsersResponse = await fetch(browsersUrl.toString(), {
      headers: { Authorization: `Bearer ${vercelToken}` },
    });

    const browsersData = browsersResponse.ok ? await browsersResponse.json() : { data: [] };

    return NextResponse.json({
      pageViews: countData.count || 0,
      uniqueVisitors: countData.visitors || 0,
      topRoutes: routesData.data || [],
      topCountries: countriesData.data || [],
      topDevices: devicesData.data || [],
      topBrowsers: browsersData.data || [],
      since,
      until,
    });
  } catch (error) {
    console.error("Error fetching Vercel Analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
