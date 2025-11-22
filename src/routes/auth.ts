import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { authService } from "../services/auth";
import { github as githubConfig } from "../config";

const auth = new Hono();

// GitHub OAuth endpoints
auth.post("/openid/github", (c) => {
  if (!githubConfig.clientId) {
    return c.json({ error: "GitHub OAuth not configured" }, 500);
  }

  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", githubConfig.clientId);

  return c.redirect(githubAuthUrl.toString());
});

auth.get("/callback/github", async (c) => {
  const code = c.req.query("code");

  if (!code) {
    return c.json({ error: "Missing code parameter" }, 400);
  }

  if (!githubConfig.clientId || !githubConfig.clientSecret) {
    return c.json({ error: "GitHub OAuth not configured" }, 500);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: githubConfig.clientId,
          client_secret: githubConfig.clientSecret,
          code,
        }),
      }
    );

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
    };

    if (!tokenData.access_token) {
      return c.json(
        {
          error: "Failed to get GitHub access token",
          details: tokenData.error,
        },
        401
      );
    }

    // Get user profile from GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    });

    const githubUser = (await userResponse.json()) as {
      id: number;
      login: string;
      avatar_url: string;
    };

    console.log("GitHub user:", githubUser);

    // Find or create user in our DB
    const user = await authService.findOrCreateGitHubUser(githubUser);

    // Create JWT tokens
    const { accessToken, refreshToken } = await authService.createTokens(user);

    // Set access_token cookie (only access token, not refresh)
    setCookie(c, "access_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    });

    // Return both tokens in response body
    return c.json({
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    return c.json(
      {
        error: "Authentication failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Refresh token endpoint
auth.post("/refresh", async (c) => {
  const body = await c.req.json();
  const refreshToken = body.refreshToken;

  if (!refreshToken) {
    return c.json({ error: "Missing refresh token" }, 400);
  }

  try {
    // TODO: Verify refresh token and extract userId
    // For now, simple implementation
    const payload = JSON.parse(atob(refreshToken.split(".")[1]));

    const { accessToken, refreshToken: newRefreshToken } =
      await authService.refreshTokens(payload.userId);

    return c.json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return c.json({ error: "Invalid refresh token" }, 401);
  }
});

export default auth;
