export interface Env {
  AMADEUS_CLIENT_ID: string;
  AMADEUS_CLIENT_SECRET: string;
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0; // Unix timestamp in ms

// CORS Headers helper
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

// Retrieve cached token or fetch a new one
async function getAmadeusToken(env: Env): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = env.AMADEUS_CLIENT_ID;
  const clientSecret = env.AMADEUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing AMADEUS_CLIENT_ID or AMADEUS_CLIENT_SECRET in worker environment");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString(),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Amadeus Auth Error (${response.status}): ${text}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    cachedToken = data.access_token;
    // Cache token, subtracting 30 seconds buffer for safety
    tokenExpiresAt = Date.now() + (data.expires_in - 30) * 1000;
    return cachedToken;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Fetch with a 10-second timeout
async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      return new Response(
        JSON.stringify({
          error: "Gateway Timeout",
          message: "The request to the Amadeus upstream API timed out after 10 seconds."
        }),
        {
          status: 504,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    throw error;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight options
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      // 1. Get Amadeus access token
      let token: string;
      try {
        token = await getAmadeusToken(env);
      } catch (authErr: any) {
        return new Response(
          JSON.stringify({
            error: "Amadeus Authentication Failure",
            message: authErr.message || "Unable to retrieve token."
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }

      const requestHeaders = {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      };

      // 2. Route matching and proxying
      if (pathname === "/api/airports") {
        const keyword = url.searchParams.get("keyword") || "";
        const amadeusUrl = `https://test.api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(
          keyword
        )}&subType=AIRPORT,CITY&page[limit]=7`;

        const response = await fetchWithTimeout(amadeusUrl, { headers: requestHeaders });
        const body = await response.text();
        return new Response(body, {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": response.headers.get("Content-Type") || "application/json"
          }
        });
      }

      if (pathname === "/api/flights") {
        const origin = url.searchParams.get("origin") || "";
        const destination = url.searchParams.get("destination") || "";
        const departureDate = url.searchParams.get("departureDate") || "";
        const returnDate = url.searchParams.get("returnDate") || "";
        const adults = url.searchParams.get("adults") || "1";
        const travelClass = url.searchParams.get("travelClass") || "ECONOMY";
        const nonStop = url.searchParams.get("nonStop") || "false";

        const amadeusParams = new URLSearchParams({
          originLocationCode: origin,
          destinationLocationCode: destination,
          departureDate: departureDate,
          adults: adults,
          travelClass: travelClass,
          nonStop: nonStop
        });

        if (returnDate && returnDate.trim() !== "") {
          amadeusParams.set("returnDate", returnDate);
        }

        const amadeusUrl = `https://test.api.amadeus.com/v2/shopping/flight-offers?${amadeusParams.toString()}`;

        const response = await fetchWithTimeout(amadeusUrl, { headers: requestHeaders });
        const body = await response.text();
        return new Response(body, {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": response.headers.get("Content-Type") || "application/json"
          }
        });
      }

      if (pathname === "/api/flight-dates") {
        const origin = url.searchParams.get("origin") || "";
        const destination = url.searchParams.get("destination") || "";

        const amadeusUrl = `https://test.api.amadeus.com/v1/shopping/flight-dates?origin=${encodeURIComponent(
          origin
        )}&destination=${encodeURIComponent(destination)}`;

        const response = await fetchWithTimeout(amadeusUrl, { headers: requestHeaders });
        const body = await response.text();
        return new Response(body, {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": response.headers.get("Content-Type") || "application/json"
          }
        });
      }

      if (pathname === "/api/inspiration") {
        const origin = url.searchParams.get("origin") || "";

        const amadeusUrl = `https://test.api.amadeus.com/v1/shopping/flight-destinations?origin=${encodeURIComponent(
          origin
        )}`;

        const response = await fetchWithTimeout(amadeusUrl, { headers: requestHeaders });
        const body = await response.text();
        return new Response(body, {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": response.headers.get("Content-Type") || "application/json"
          }
        });
      }

      // Route not found
      return new Response(
        JSON.stringify({ error: "Not Found", message: `Route ${pathname} not found on this proxy` }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: err.message || "An unexpected error occurred."
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
};
