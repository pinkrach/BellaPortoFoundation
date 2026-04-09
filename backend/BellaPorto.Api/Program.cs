using System.Diagnostics;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using BellaPorto.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddHttpClient();

// ASP.NET Identity: password policy for lab (UserManager / validators). Interactive sign-in uses
// Supabase + JWT; [Authorize] on API routes uses JwtBearer via FallbackPolicy, not cookie defaults.
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseInMemoryDatabase("IdentityPasswordPolicy"));

builder.Services.AddIdentity<IdentityUser, IdentityRole>(options =>
    {
        // Length-only policy; overrides Identity default complexity rules.
        options.Password.RequiredLength = 14;
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequiredUniqueChars = 0;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

var defaultCorsOrigins = new[]
{
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://bella-porto-foundation.vercel.app",
    "https://www.bella-porto-foundation.vercel.app",
};
var configuredCorsOrigins =
    builder.Configuration["Cors:AllowedOrigins"]
    ?? Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS")
    ?? string.Empty;
var allowedCorsOrigins = defaultCorsOrigins
    .Concat(
        configuredCorsOrigins
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    )
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
            {
                if (allowedCorsOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
                {
                    return true;
                }

                if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    var isLocalHost =
                        uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
                        || uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase);

                    if (isLocalHost)
                    {
                        return true;
                    }
                }

                return false;
            })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Maximally restrictive API: validate Supabase-issued JWTs when Supabase:JwtSecret (or SUPABASE_JWT_SECRET) is set.
var jwtSecret =
    builder.Configuration["Supabase:JwtSecret"]
    ?? Environment.GetEnvironmentVariable("SUPABASE_JWT_SECRET");
var supabaseUrlForJwt =
    builder.Configuration["Supabase:Url"]
    ?? Environment.GetEnvironmentVariable("SUPABASE_URL");
var jwtAuthEnabled =
    !string.IsNullOrWhiteSpace(jwtSecret) && !string.IsNullOrWhiteSpace(supabaseUrlForJwt);

if (jwtAuthEnabled)
{
    var jwtSecretValue = jwtSecret!;
    var supabaseJwtUrl = supabaseUrlForJwt!;
    var issuer = $"{supabaseJwtUrl.TrimEnd('/')}/auth/v1";
    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretValue)),
                ValidIssuer = issuer,
                ValidAudience = "authenticated",
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(2),
            };
        });
    builder.Services.AddAuthorization(options =>
    {
        options.FallbackPolicy = new AuthorizationPolicyBuilder()
            .AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme)
            .RequireAuthenticatedUser()
            .Build();
    });
}

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    var openApiEndpoint = app.MapOpenApi();
    if (jwtAuthEnabled)
    {
        openApiEndpoint.AllowAnonymous();
    }
}

app.UseCors("frontend");
// Local dev often runs on plain HTTP (or an untrusted dev cert). Redirecting here can break
// frontend calls to `http://localhost:*` (e.g. role/profile lookups after Supabase auth).
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

if (jwtAuthEnabled)
{
    app.UseAuthentication();
    app.UseAuthorization();
}

var healthEndpoint = app.MapGet("/api/health", () => Results.Ok(new { ok = true }));
if (jwtAuthEnabled)
{
    healthEndpoint.AllowAnonymous();
}

var registerEndpoint = app.MapPost("/api/register", async (
    RegisterRequest? body,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration) =>
{
    var captchaToken = body?.CaptchaToken?.Trim();
    if (string.IsNullOrWhiteSpace(captchaToken))
    {
        return Results.BadRequest(new { message = "CAPTCHA verification failed." });
    }

    var secret =
        configuration["Recaptcha:SecretKey"]
        ?? Environment.GetEnvironmentVariable("RECAPTCHA_SECRET_KEY");
    if (string.IsNullOrWhiteSpace(secret))
    {
        return Results.Json(
            new { message = "Registration is temporarily unavailable." },
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    var verified = await VerifyRecaptchaAsync(httpClientFactory.CreateClient(), secret, captchaToken);
    if (!verified)
    {
        return Results.BadRequest(new { message = "CAPTCHA verification failed." });
    }

    return Results.Ok(new { ok = true });
});
if (jwtAuthEnabled)
{
    registerEndpoint.AllowAnonymous();
}

app.MapGet("/api/profiles", async (
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseServiceRoleConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var profiles = await FetchProfilesAsync(client, settings.Url!, settings.Key!);
        return Results.Ok(profiles);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/profiles/me", async (
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var token = ExtractBearerToken(request);
        if (string.IsNullOrWhiteSpace(token))
        {
            return Results.Unauthorized();
        }

        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var knownAdminEmails = ResolveKnownAdminEmails(configuration);
        var profile = await FetchCurrentUserProfileAsync(
            httpClientFactory.CreateClient(),
            settings.Url!,
            settings.Key!,
            token,
            knownAdminEmails,
            settings.UsingServiceRoleKey);
        if (jwtAuthEnabled)
        {
            var subject =
                request.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? request.HttpContext.User.FindFirstValue("sub");
            if (string.IsNullOrWhiteSpace(subject))
            {
                return Results.Unauthorized();
            }
            if (profile is not null
                && profile.TryGetValue("id", out var profileId)
                && !string.Equals(profileId?.ToString(), subject, StringComparison.Ordinal))
            {
                return Results.Unauthorized();
            }
        }
        return profile is null
            ? Results.NotFound(new { message = "The signed-in user's profile was not found." })
            : Results.Ok(profile);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/profiles/{userId}", async (
    string userId,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseServiceRoleConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var profile = await FetchProfileByUserIdAsync(client, settings.Url!, settings.Key!, userId);
        return profile is null
            ? Results.NotFound(new { message = $"Profile {userId} was not found." })
            : Results.Ok(profile);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPut("/api/profiles/{userId}/role", async (
    string userId,
    ProfileRoleUpdateRequest requestBody,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        if (string.IsNullOrWhiteSpace(requestBody.Role))
        {
            return Results.BadRequest(new { message = "A role is required." });
        }

        var normalizedRole = requestBody.Role.Trim().ToLowerInvariant();
        if (normalizedRole is not ("admin" or "donor"))
        {
            return Results.BadRequest(new { message = "Role must be either admin or donor." });
        }

        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseServiceRoleConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var updated = await UpdateProfileRoleAsync(
            client,
            settings.Url!,
            settings.Key!,
            userId,
            normalizedRole);

        return updated is null
            ? Results.NotFound(new { message = $"Profile {userId} was not found." })
            : Results.Ok(updated);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/supporters", async (
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
        {
            return Results.Problem(
                "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
            );
        }

        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var supporters = await FetchAllSupportersAsync(client, settings.Url!, settings.Key!);
        var donations = await FetchAllDonationsAsync(client, settings.Url!, settings.Key!);
        var riskScores = await FetchAllSupporterRiskScoresAsync(client, settings.Url!, settings.Key!);
        ApplySupporterRiskData(supporters, donations, riskScores);
        return Results.Ok(supporters);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPost("/api/supporters", async (
    Dictionary<string, object?> payload,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        payload.Remove("supporter_id");
        if (payload.Count == 0)
        {
            return Results.BadRequest(new { message = "No supporter fields were provided." });
        }

        var created = await CreateSupporterAsync(client, settings.Url!, settings.Key!, payload);
        return created is null
            ? Results.Problem("Unable to create supporter.")
            : Results.Created($"/api/supporters/{created.GetValueOrDefault("supporter_id")}", created);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPut("/api/supporters/{supporterId:int}", async (
    int supporterId,
    Dictionary<string, object?> updates,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
        {
            return Results.Problem(
                "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
            );
        }

        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        // supporter_id is route-owned and cannot be changed.
        updates.Remove("supporter_id");
        if (updates.Count == 0)
        {
            return Results.BadRequest(new { message = "No update fields were provided." });
        }

        var updated = await UpdateSupporterAsync(
            client,
            settings.Url!,
            settings.Key!,
            supporterId,
            updates
        );

        return Results.Ok(updated);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapDelete("/api/supporters/{supporterId:int}", async (
    int supporterId,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
        {
            return Results.Problem(
                "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
            );
        }

        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        await DeleteSupporterAsync(client, settings.Url!, settings.Key!, supporterId);
        return Results.NoContent();
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/donations", async (
    int? supporterId,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
        {
            return Results.Problem(
                "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
            );
        }

        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var donations = await FetchAllDonationsAsync(client, settings.Url!, settings.Key!, supporterId);
        return Results.Ok(donations);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPost("/api/donations", async (
    Dictionary<string, object?> payload,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        payload.Remove("donation_id");
        payload.Remove("supporters");
        if (payload.Count == 0)
        {
            return Results.BadRequest(new { message = "No donation fields were provided." });
        }

        var created = await CreateDonationAsync(client, settings.Url!, settings.Key!, payload);
        return created is null
            ? Results.Problem("Unable to create donation.")
            : Results.Created($"/api/donations/{created.GetValueOrDefault("donation_id")}", created);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPut("/api/donations/{donationId:int}", async (
    int donationId,
    Dictionary<string, object?> updates,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
        {
            return Results.Problem(
                "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
            );
        }

        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        // donation_id is route-owned and cannot be changed.
        updates.Remove("donation_id");
        updates.Remove("supporters");
        if (updates.Count == 0)
        {
            return Results.BadRequest(new { message = "No update fields were provided." });
        }

        var updated = await UpdateDonationAsync(
            client,
            settings.Url!,
            settings.Key!,
            donationId,
            updates
        );

        return updated is null
            ? Results.NotFound(new { message = $"Donation #{donationId} was not found." })
            : Results.Ok(updated);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapDelete("/api/donations/{donationId:int}", async (
    int donationId,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
        {
            return Results.Problem(
                "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
            );
        }

        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        await DeleteDonationAsync(client, settings.Url!, settings.Key!, donationId);
        return Results.NoContent();
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/donation-allocations", async (
    int? donationId,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var allocations = await FetchAllDonationAllocationsAsync(client, settings.Url!, settings.Key!, donationId);
        return Results.Ok(allocations);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPost("/api/donation-allocations", async (
    Dictionary<string, object?> payload,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        payload.Remove("allocation_id");
        payload.Remove("donations");
        payload.Remove("safehouses");
        if (payload.Count == 0)
        {
            return Results.BadRequest(new { message = "No donation allocation fields were provided." });
        }

        var created = await CreateDonationAllocationAsync(client, settings.Url!, settings.Key!, payload);
        return created is null
            ? Results.Problem("Unable to create donation allocation.")
            : Results.Created($"/api/donation-allocations/{created.GetValueOrDefault("allocation_id")}", created);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPut("/api/donation-allocations/{allocationId:int}", async (
    int allocationId,
    Dictionary<string, object?> updates,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        updates.Remove("allocation_id");
        updates.Remove("donations");
        updates.Remove("safehouses");
        if (updates.Count == 0)
        {
            return Results.BadRequest(new { message = "No update fields were provided." });
        }

        var updated = await UpdateDonationAllocationAsync(
            client,
            settings.Url!,
            settings.Key!,
            allocationId,
            updates
        );

        return updated is null
            ? Results.NotFound(new { message = $"Donation allocation #{allocationId} was not found." })
            : Results.Ok(updated);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapDelete("/api/donation-allocations/{allocationId:int}", async (
    int allocationId,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        await DeleteDonationAllocationAsync(client, settings.Url!, settings.Key!, allocationId);
        return Results.NoContent();
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/safehouses", async (
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var safehouses = await FetchAllSafehousesAsync(client, settings.Url!, settings.Key!);
        return Results.Ok(safehouses);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/residents", async (
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var residents = await FetchResidentsAsync(client, settings.Url!, settings.Key!);
        return Results.Ok(residents);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/residents/{residentId:int}/profile-bundle", async (
    int residentId,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var bundle = await FetchResidentProfileBundleAsync(client, settings.Url!, settings.Key!, residentId);
        return bundle is null
            ? Results.NotFound(new { message = $"Resident #{residentId} was not found." })
            : Results.Ok(bundle);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

var publicImpactEndpoint = app.MapGet("/api/public-impact", async (
    bool? publishedOnly,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();

        var rows = await FetchPagedTableAsync(
            client,
            settings.Url!,
            settings.Key!,
            "public_impact_snapshots",
            select: "snapshot_id,snapshot_date,headline,summary_text,metric_payload_json,is_published,published_at",
            filters: publishedOnly == true ? [$"is_published=eq.true"] : null,
            orderBy: "snapshot_date.desc");
        return Results.Ok(rows);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});
if (jwtAuthEnabled)
{
    publicImpactEndpoint.AllowAnonymous();
}

app.MapGet("/api/monthly-metrics", async (
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var rows = await FetchPagedTableAsync(
            client,
            settings.Url!,
            settings.Key!,
            "safehouse_monthly_metrics",
            select: "metric_id,safehouse_id,month_start,month_end,active_residents,avg_education_progress,avg_health_score,process_recording_count,home_visitation_count,incident_count,notes",
            orderBy: "month_start.desc");
        return Results.Ok(rows);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/db/{table}", async (
    string table,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var config = GetTableConfig(table);
        var rows = await FetchPagedTableAsync(
            client,
            settings.Url!,
            settings.Key!,
            table,
            select: config.Select,
            orderBy: config.OrderBy);
        return Results.Ok(rows);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/db/{table}/resident/{residentId:int}", async (
    string table,
    int residentId,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var config = GetTableConfig(table);
        var rows = await FetchPagedTableAsync(
            client,
            settings.Url!,
            settings.Key!,
            table,
            select: config.Select,
            filters: [$"resident_id=eq.{residentId}"],
            orderBy: config.OrderBy);
        return Results.Ok(rows);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/db/{table}/{id:int}", async (
    string table,
    int id,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var config = GetTableConfig(table);
        var row = await FetchSingleByIdAsync(
            client,
            settings.Url!,
            settings.Key!,
            table,
            config.PrimaryKey,
            id,
            config.Select);
        return row is null
            ? Results.NotFound(new { message = $"{table} row #{id} was not found." })
            : Results.Ok(row);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPost("/api/db/{table}", async (
    string table,
    Dictionary<string, object?> row,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var config = GetTableConfig(table);
        if (row.TryGetValue(config.PrimaryKey, out var pkOnInsert))
        {
            var omitPk =
                pkOnInsert is null
                || (pkOnInsert is JsonElement jsonPk && jsonPk.ValueKind == JsonValueKind.Null);
            if (omitPk)
            {
                row.Remove(config.PrimaryKey);
            }
        }

        var inserted = await InsertTableRowAsync(
            client,
            settings.Url!,
            settings.Key!,
            table,
            row,
            config.Select);
        return Results.Ok(inserted);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPatch("/api/db/{table}/{id:int}", async (
    string table,
    int id,
    Dictionary<string, object?> updates,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var config = GetTableConfig(table);
        updates.Remove(config.PrimaryKey);
        if (updates.Count == 0)
        {
            return Results.BadRequest(new { message = "No update fields were provided." });
        }

        var updated = await UpdateTableRowAsync(
            client,
            settings.Url!,
            settings.Key!,
            table,
            config.PrimaryKey,
            id,
            updates,
            config.Select);

        return updated is null
            ? Results.NotFound(new { message = $"{table} row #{id} was not found." })
            : Results.Ok(updated);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapDelete("/api/db/{table}/{id:int}", async (
    string table,
    int id,
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var config = GetTableConfig(table);
        await DeleteTableRowAsync(
            client,
            settings.Url!,
            settings.Key!,
            table,
            config.PrimaryKey,
            id);
        return Results.NoContent();
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/ml/social/latest", async (
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    var repoRootForAuth = GetRepoRoot(environment);
    var settings = ResolveSupabaseSettings(configuration, repoRootForAuth);
    EnsureSupabaseConfigured(settings);
    var client = httpClientFactory.CreateClient();
    var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
    if (guard is not null)
    {
        return guard;
    }

    var repoRoot = GetRepoRoot(app.Environment);
    var summaryPath = Path.Combine(repoRoot, "ml-pipelines", "artifacts", "social_dashboard_summary.json");

    if (!File.Exists(summaryPath))
    {
        return Results.NotFound(new { message = "No social analytics summary has been generated yet." });
    }

    var node = JsonNode.Parse(File.ReadAllText(summaryPath));
    return Results.Json(node);
});

app.MapPost("/api/ml/social/refresh", async (
    SocialAnalyticsRefreshRequest? request,
    HttpRequest httpRequest,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment,
    ILogger<Program> logger) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(httpRequest, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var rows = await ResolveSocialPostsAsync(request, configuration, httpClientFactory, repoRoot, logger);
        if (rows.Count == 0)
        {
            return Results.BadRequest(new { message = "No social media posts were available to analyze." });
        }

        var tempDir = Path.Combine(Path.GetTempPath(), "bella-porto-social-analytics");
        Directory.CreateDirectory(tempDir);

        var inputPath = Path.Combine(tempDir, $"social-input-{Guid.NewGuid():N}.json");
        var outputPath = Path.Combine(tempDir, $"social-output-{Guid.NewGuid():N}.json");
        var artifactDir = Path.Combine(repoRoot, "ml-pipelines", "artifacts");
        var scriptPath = Path.Combine(repoRoot, "ml-pipelines", "social_media_analytics_pipeline.py");

        await File.WriteAllTextAsync(inputPath, JsonSerializer.Serialize(rows));

        var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "python3",
                WorkingDirectory = repoRoot,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
            },
        };
        process.StartInfo.ArgumentList.Add(scriptPath);
        process.StartInfo.ArgumentList.Add("--input");
        process.StartInfo.ArgumentList.Add(inputPath);
        process.StartInfo.ArgumentList.Add("--output");
        process.StartInfo.ArgumentList.Add(outputPath);
        process.StartInfo.ArgumentList.Add("--artifact-dir");
        process.StartInfo.ArgumentList.Add(artifactDir);

        process.Start();
        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        if (process.ExitCode != 0)
        {
            logger.LogError("Social analytics pipeline failed. stdout: {Stdout} stderr: {Stderr}", stdout, stderr);
            return Results.Problem("The social analytics pipeline failed to run.");
        }

        if (!File.Exists(outputPath))
        {
            logger.LogError("Social analytics pipeline finished without producing an output file. stdout: {Stdout}", stdout);
            return Results.Problem("The social analytics pipeline did not produce output.");
        }

        var node = JsonNode.Parse(await File.ReadAllTextAsync(outputPath));
        return Results.Json(node);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Unable to refresh social analytics.");
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/ml/social/community/latest", async (
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    var repoRootForAuth = GetRepoRoot(environment);
    var settings = ResolveSupabaseSettings(configuration, repoRootForAuth);
    EnsureSupabaseConfigured(settings);
    var client = httpClientFactory.CreateClient();
    var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
    if (guard is not null)
    {
        return guard;
    }

    var repoRoot = GetRepoRoot(app.Environment);
    var summaryPath = Path.Combine(repoRoot, "ml-pipelines", "artifacts", "social_community_summary.json");

    if (!File.Exists(summaryPath))
    {
        return Results.NotFound(new { message = "No community outreach analytics summary has been generated yet." });
    }

    var node = JsonNode.Parse(File.ReadAllText(summaryPath));
    return Results.Json(node);
});

app.MapPost("/api/ml/social/community/refresh", async (
    SocialAnalyticsRefreshRequest? request,
    HttpRequest httpRequest,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment,
    ILogger<Program> logger) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(httpRequest, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var rows = await ResolveSocialPostsAsync(request, configuration, httpClientFactory, repoRoot, logger);
        if (rows.Count == 0)
        {
            return Results.BadRequest(new { message = "No social media posts were available to analyze." });
        }

        var tempDir = Path.Combine(Path.GetTempPath(), "bella-porto-community-analytics");
        Directory.CreateDirectory(tempDir);

        var inputPath = Path.Combine(tempDir, $"community-input-{Guid.NewGuid():N}.json");
        var outputPath = Path.Combine(tempDir, $"community-output-{Guid.NewGuid():N}.json");
        var artifactDir = Path.Combine(repoRoot, "ml-pipelines", "artifacts");
        var scriptPath = Path.Combine(repoRoot, "ml-pipelines", "community_outreach_analytics_pipeline.py");

        await File.WriteAllTextAsync(inputPath, JsonSerializer.Serialize(rows));

        var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "python3",
                WorkingDirectory = repoRoot,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
            },
        };
        process.StartInfo.ArgumentList.Add(scriptPath);
        process.StartInfo.ArgumentList.Add("--input");
        process.StartInfo.ArgumentList.Add(inputPath);
        process.StartInfo.ArgumentList.Add("--output");
        process.StartInfo.ArgumentList.Add(outputPath);
        process.StartInfo.ArgumentList.Add("--artifact-dir");
        process.StartInfo.ArgumentList.Add(artifactDir);

        process.Start();
        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        if (process.ExitCode != 0)
        {
            logger.LogError("Community outreach analytics pipeline failed. stdout: {Stdout} stderr: {Stderr}", stdout, stderr);
            return Results.Problem("The community outreach analytics pipeline failed to run.");
        }

        if (!File.Exists(outputPath))
        {
            logger.LogError("Community outreach analytics pipeline finished without producing an output file. stdout: {Stdout}", stdout);
            return Results.Problem("The community outreach analytics pipeline did not produce output.");
        }

        var node = JsonNode.Parse(await File.ReadAllTextAsync(outputPath));
        return Results.Json(node);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Unable to refresh community outreach analytics.");
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/ml/public-impact/latest", async (
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    var repoRootForAuth = GetRepoRoot(environment);
    var settings = ResolveSupabaseSettings(configuration, repoRootForAuth);
    EnsureSupabaseConfigured(settings);
    var client = httpClientFactory.CreateClient();
    var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
    if (guard is not null)
    {
        return guard;
    }

    var repoRoot = GetRepoRoot(app.Environment);
    var summaryPath = Path.Combine(repoRoot, "ml-pipelines", "artifacts", "public_impact_summary.json");

    if (!File.Exists(summaryPath))
    {
        return Results.NotFound(new { message = "No public impact analytics summary has been generated yet." });
    }

    var node = JsonNode.Parse(File.ReadAllText(summaryPath));
    return Results.Json(node);
});

app.MapPost("/api/ml/public-impact/refresh", async (
    HttpRequest httpRequest,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment,
    ILogger<Program> logger) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(httpRequest, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var payload = await ResolvePublicImpactPayloadAsync(configuration, httpClientFactory, repoRoot, logger);
        var tempDir = Path.Combine(Path.GetTempPath(), "bella-porto-public-impact");
        Directory.CreateDirectory(tempDir);

        var inputPath = Path.Combine(tempDir, $"public-impact-input-{Guid.NewGuid():N}.json");
        var outputPath = Path.Combine(tempDir, $"public-impact-output-{Guid.NewGuid():N}.json");
        var artifactDir = Path.Combine(repoRoot, "ml-pipelines", "artifacts");
        var scriptPath = Path.Combine(repoRoot, "ml-pipelines", "public_impact_analytics_pipeline.py");

        await File.WriteAllTextAsync(inputPath, JsonSerializer.Serialize(payload));

        var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "python3",
                WorkingDirectory = repoRoot,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
            },
        };
        process.StartInfo.ArgumentList.Add(scriptPath);
        process.StartInfo.ArgumentList.Add("--input");
        process.StartInfo.ArgumentList.Add(inputPath);
        process.StartInfo.ArgumentList.Add("--output");
        process.StartInfo.ArgumentList.Add(outputPath);
        process.StartInfo.ArgumentList.Add("--artifact-dir");
        process.StartInfo.ArgumentList.Add(artifactDir);

        process.Start();
        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        if (process.ExitCode != 0)
        {
            logger.LogError("Public impact analytics pipeline failed. stdout: {Stdout} stderr: {Stderr}", stdout, stderr);
            return Results.Problem("The public impact analytics pipeline failed to run.");
        }

        if (!File.Exists(outputPath))
        {
            logger.LogError("Public impact analytics pipeline finished without producing an output file. stdout: {Stdout}", stdout);
            return Results.Problem("The public impact analytics pipeline did not produce output.");
        }

        var node = JsonNode.Parse(await File.ReadAllTextAsync(outputPath));
        return Results.Json(node);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Unable to refresh public impact analytics.");
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/ml/risk/latest", async (
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    var repoRootForAuth = GetRepoRoot(environment);
    var settings = ResolveSupabaseSettings(configuration, repoRootForAuth);
    EnsureSupabaseConfigured(settings);
    var client = httpClientFactory.CreateClient();
    var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
    if (guard is not null)
    {
        return guard;
    }

    var repoRoot = GetRepoRoot(app.Environment);
    var summaryPath = Path.Combine(repoRoot, "ml-pipelines", "artifacts", "resident_risk_summary.json");

    if (!File.Exists(summaryPath))
    {
        return Results.NotFound(new { message = "No resident risk summary has been generated yet." });
    }

    var node = JsonNode.Parse(File.ReadAllText(summaryPath));
    return Results.Json(node);
});

app.MapPost("/api/ml/risk/refresh", async (
    HttpRequest request,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment,
    ILogger<Program> logger) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
        {
            throw new InvalidOperationException(
                "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
            );
        }

        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(request, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        logger.LogInformation("Fetching live residents / incident_reports / process_recordings rows from Supabase.");
        var residents = await FetchAllSupabaseRowsAsync(client, settings.Url!, settings.Key!, "residents");
        var incidents = await FetchAllSupabaseRowsAsync(client, settings.Url!, settings.Key!, "incident_reports");
        var recordings = await FetchAllSupabaseRowsAsync(client, settings.Url!, settings.Key!, "process_recordings");

        var payload = new Dictionary<string, object?>
        {
            ["residents"] = residents,
            ["incident_reports"] = incidents,
            ["process_recordings"] = recordings,
        };

        var tempDir = Path.Combine(Path.GetTempPath(), "bella-porto-resident-risk");
        Directory.CreateDirectory(tempDir);

        var inputPath = Path.Combine(tempDir, $"risk-input-{Guid.NewGuid():N}.json");
        var outputPath = Path.Combine(tempDir, $"risk-output-{Guid.NewGuid():N}.json");
        var artifactDir = Path.Combine(repoRoot, "ml-pipelines", "artifacts");
        var scriptPath = Path.Combine(repoRoot, "ml-pipelines", "resident_at_risk_pipeline.py");

        await File.WriteAllTextAsync(inputPath, JsonSerializer.Serialize(payload));

        var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "python3",
                WorkingDirectory = repoRoot,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
            },
        };

        process.StartInfo.ArgumentList.Add(scriptPath);
        process.StartInfo.ArgumentList.Add("--input");
        process.StartInfo.ArgumentList.Add(inputPath);
        process.StartInfo.ArgumentList.Add("--output");
        process.StartInfo.ArgumentList.Add(outputPath);
        process.StartInfo.ArgumentList.Add("--artifact-dir");
        process.StartInfo.ArgumentList.Add(artifactDir);

        process.Start();
        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        if (process.ExitCode != 0)
        {
            logger.LogError("Resident risk pipeline failed. stdout: {Stdout} stderr: {Stderr}", stdout, stderr);
            return Results.Problem("The resident risk pipeline failed to run.");
        }

        if (!File.Exists(outputPath))
        {
            logger.LogError("Resident risk pipeline finished without producing an output file. stdout: {Stdout}", stdout);
            return Results.Problem("The resident risk pipeline did not produce output.");
        }

        var node = JsonNode.Parse(await File.ReadAllTextAsync(outputPath));

        // Persist latest copy for GET /latest.
        Directory.CreateDirectory(Path.Combine(repoRoot, "ml-pipelines", "artifacts"));
        var persistPath = Path.Combine(repoRoot, "ml-pipelines", "artifacts", "resident_risk_summary.json");
        await File.WriteAllTextAsync(persistPath, node?.ToJsonString(new JsonSerializerOptions { WriteIndented = true }) ?? "{}");

        return Results.Json(node);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Unable to refresh resident risk report.");
        return Results.Problem(ex.Message);
    }
});

app.MapPost("/api/ml/supporter-risk/refresh", async (
    SupporterRiskRefreshRequest? request,
    HttpRequest httpRequest,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment,
    ILogger<Program> logger) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var client = httpClientFactory.CreateClient();
        var guard = await EnsureAdminRequestAsync(httpRequest, client, settings, ResolveKnownAdminEmails(configuration));
        if (guard is not null)
        {
            return guard;
        }

        var result = await RunSupporterRiskScoringAsync(repoRoot, request, logger);
        return Results.Json(result);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Unable to refresh supporter risk scores.");
        return Results.Problem(ex.Message);
    }
});

app.Run();

static string GetRepoRoot(IWebHostEnvironment environment)
{
    return Path.GetFullPath(Path.Combine(environment.ContentRootPath, "..", ".."));
}

static void EnsureSupabaseConfigured(SupabaseSettings settings)
{
    if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
    {
        throw new InvalidOperationException(
            "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
        );
    }
}

static void EnsureSupabaseServiceRoleConfigured(SupabaseSettings settings)
{
    EnsureSupabaseConfigured(settings);
    if (!settings.UsingServiceRoleKey)
    {
        throw new InvalidOperationException(
            "This endpoint requires SUPABASE_SERVICE_ROLE_KEY in the backend environment so admin profile access can be managed securely."
        );
    }
}

static string? ExtractBearerToken(HttpRequest request)
{
    var header = request.Headers.Authorization.ToString();
    if (string.IsNullOrWhiteSpace(header)) return null;
    const string prefix = "Bearer ";
    return header.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
        ? header[prefix.Length..].Trim()
        : null;
}

static async Task<bool> VerifyRecaptchaAsync(HttpClient client, string secret, string responseToken)
{
    using var content = new FormUrlEncodedContent(
        new Dictionary<string, string>
        {
            ["secret"] = secret,
            ["response"] = responseToken,
        });

    using var response = await client.PostAsync(
        "https://www.google.com/recaptcha/api/siteverify",
        content);

    response.EnsureSuccessStatusCode();

    await using var stream = await response.Content.ReadAsStreamAsync();
    using var doc = await JsonDocument.ParseAsync(stream);
    return doc.RootElement.TryGetProperty("success", out var success) && success.GetBoolean();
}

static async Task<IResult?> EnsureAdminRequestAsync(
    HttpRequest request,
    HttpClient client,
    SupabaseSettings settings,
    HashSet<string> knownAdminEmails)
{
    var token = ExtractBearerToken(request);
    if (string.IsNullOrWhiteSpace(token))
    {
        return Results.Unauthorized();
    }

    var profile = await FetchCurrentUserProfileAsync(
        client,
        settings.Url!,
        settings.Key!,
        token,
        knownAdminEmails,
        settings.UsingServiceRoleKey);

    var normalizedRole =
        profile is not null
        && profile.TryGetValue("role", out var roleValue)
        && roleValue is not null
            ? roleValue.ToString()?.Trim().ToLowerInvariant()
            : null;

    if (normalizedRole != "admin")
    {
        return Results.Json(
            new { message = "Admin access is required for this endpoint." },
            statusCode: StatusCodes.Status403Forbidden);
    }

    return null;
}

static async Task<List<Dictionary<string, object?>>> ResolveSocialPostsAsync(
    SocialAnalyticsRefreshRequest? request,
    IConfiguration configuration,
    IHttpClientFactory httpClientFactory,
    string repoRoot,
    ILogger logger)
{
    if (request?.Posts is { Count: > 0 })
    {
        return request.Posts;
    }

    var settings = ResolveSupabaseSettings(configuration, repoRoot);
    if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
    {
        throw new InvalidOperationException(
            "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
        );
    }

    logger.LogInformation("Fetching live social_media_posts rows from Supabase.");
    return await FetchAllSocialPostsAsync(httpClientFactory.CreateClient(), settings.Url!, settings.Key!);
}

static async Task<Dictionary<string, List<Dictionary<string, object?>>>> ResolvePublicImpactPayloadAsync(
    IConfiguration configuration,
    IHttpClientFactory httpClientFactory,
    string repoRoot,
    ILogger logger)
{
    var settings = ResolveSupabaseSettings(configuration, repoRoot);
    if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
    {
        throw new InvalidOperationException(
            "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
        );
    }

    logger.LogInformation("Fetching live public impact rows from Supabase.");
    var client = httpClientFactory.CreateClient();
    var snapshots = await FetchAllSupabaseRowsAsync(client, settings.Url!, settings.Key!, "public_impact_snapshots");
    var safehouseMetrics = await FetchAllSupabaseRowsAsync(client, settings.Url!, settings.Key!, "safehouse_monthly_metrics");
    var allocations = await FetchAllSupabaseRowsAsync(client, settings.Url!, settings.Key!, "donation_allocations");
    var donations = await FetchAllSupabaseRowsAsync(client, settings.Url!, settings.Key!, "donations");

    return new Dictionary<string, List<Dictionary<string, object?>>>
    {
        ["public_impact_snapshots"] = snapshots,
        ["safehouse_monthly_metrics"] = safehouseMetrics,
        ["donation_allocations"] = allocations,
        ["donations"] = donations,
    };
}

static SupabaseSettings ResolveSupabaseSettings(IConfiguration configuration, string repoRoot)
{
    var serviceRoleKey =
        configuration["Supabase:ServiceRoleKey"]
        ?? Environment.GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY");
    var anonKey =
        configuration["Supabase:AnonKey"]
        ?? Environment.GetEnvironmentVariable("SUPABASE_ANON_KEY");

    var settings = new SupabaseSettings
    {
        Url = configuration["Supabase:Url"] ?? Environment.GetEnvironmentVariable("SUPABASE_URL"),
        Key = serviceRoleKey ?? anonKey,
        UsingServiceRoleKey = !string.IsNullOrWhiteSpace(serviceRoleKey),
    };

    if (!string.IsNullOrWhiteSpace(settings.Url) && !string.IsNullOrWhiteSpace(settings.Key))
    {
        return settings;
    }

    var envPath = Path.Combine(repoRoot, "frontend", ".env");
    if (!File.Exists(envPath))
    {
        return settings;
    }

    string? fileUrl = null;
    string? fileServiceRole = null;
    string? fileAnon = null;

    foreach (var rawLine in File.ReadAllLines(envPath))
    {
        var line = rawLine.Trim();
        if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#') || !line.Contains('='))
        {
            continue;
        }

        var splitIndex = line.IndexOf('=');
        var key = line[..splitIndex].Trim();
        var value = line[(splitIndex + 1)..].Trim();

        switch (key)
        {
            case "VITE_SUPABASE_URL":
                fileUrl = value;
                break;
            case "SUPABASE_SERVICE_ROLE_KEY":
                fileServiceRole = value;
                break;
            case "VITE_SUPABASE_ANON_KEY":
                fileAnon = value;
                break;
        }
    }

    if (string.IsNullOrWhiteSpace(settings.Url) && !string.IsNullOrWhiteSpace(fileUrl))
    {
        settings.Url = fileUrl;
    }

    if (!string.IsNullOrWhiteSpace(fileServiceRole))
    {
        settings.Key = fileServiceRole;
        settings.UsingServiceRoleKey = true;
    }
    else if (string.IsNullOrWhiteSpace(settings.Key) && !string.IsNullOrWhiteSpace(fileAnon))
    {
        settings.Key = fileAnon;
        settings.UsingServiceRoleKey = false;
    }

    return settings;
}

static HashSet<string> ResolveKnownAdminEmails(IConfiguration configuration)
{
    var configured =
        configuration["Auth:KnownAdminEmails"]
        ?? Environment.GetEnvironmentVariable("KNOWN_ADMIN_EMAILS")
        ?? "admin@bellaporto.org";

    return configured
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Select(value => value.Trim().ToLowerInvariant())
        .Where(value => !string.IsNullOrWhiteSpace(value))
        .ToHashSet(StringComparer.OrdinalIgnoreCase);
}

static async Task<List<Dictionary<string, object?>>> FetchAllSocialPostsAsync(HttpClient client, string supabaseUrl, string apiKey)
{
    var results = new List<Dictionary<string, object?>>();
    var baseUrl = supabaseUrl.TrimEnd('/');
    const int pageSize = 1000;

    for (var start = 0; ; start += pageSize)
    {
        var end = start + pageSize - 1;
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{baseUrl}/rest/v1/social_media_posts?select=*"
        );
        request.Headers.TryAddWithoutValidation("apikey", apiKey);
        request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
        request.Headers.TryAddWithoutValidation("Range-Unit", "items");
        request.Headers.TryAddWithoutValidation("Range", $"{start}-{end}");

        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync();
        var page = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
        results.AddRange(page);

        if (page.Count < pageSize)
        {
            break;
        }
    }

    return results;
}

static async Task<List<Dictionary<string, object?>>> FetchResidentsAsync(HttpClient client, string supabaseUrl, string apiKey)
{
    var rows = await FetchPagedTableAsync(
        client,
        supabaseUrl,
        apiKey,
        "residents",
        select: "*,safehouses(safehouse_id,name)",
        orderBy: "resident_id.asc");

    return rows.Select(row =>
    {
        if (row.TryGetValue("safehouses", out var safehouse) && safehouse is JsonElement json && json.ValueKind == JsonValueKind.Object)
        {
            row["safehouse_name"] = json.TryGetProperty("name", out var nameValue) ? nameValue.GetString() : null;
        }
        else
        {
            row["safehouse_name"] = null;
        }

        row.Remove("safehouses");
        return row;
    }).ToList();
}

static async Task<List<Dictionary<string, object?>>> FetchAllSupabaseRowsAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    string table)
{
    return await FetchPagedTableAsync(
        client,
        supabaseUrl,
        apiKey,
        table,
        select: "*",
        orderBy: null);
}

static async Task<List<Dictionary<string, object?>>> FetchProfilesAsync(HttpClient client, string supabaseUrl, string apiKey)
{
    return await FetchPagedTableAsync(
        client,
        supabaseUrl,
        apiKey,
        "profiles",
        select: "id,email,first_name,last_name,role",
        orderBy: "first_name.asc");
}

static async Task<Dictionary<string, object?>?> FetchProfileByUserIdAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    string userId)
{
    var rows = await FetchPagedTableAsync(
        client,
        supabaseUrl,
        apiKey,
        "profiles",
        select: "id,email,first_name,last_name,role",
        filters: [$"id=eq.{Uri.EscapeDataString(userId)}"]);

    return rows.FirstOrDefault();
}

static async Task<Dictionary<string, object?>?> FetchCurrentUserProfileAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    string accessToken,
    HashSet<string> knownAdminEmails,
    bool useBackendKeyForProfileRead)
{
    var user = await FetchSupabaseAuthUserAsync(client, supabaseUrl, apiKey, accessToken);
    if (string.IsNullOrWhiteSpace(user?.Id))
    {
        return null;
    }

    Dictionary<string, object?>? profile;
    if (useBackendKeyForProfileRead)
    {
        profile = await FetchProfileByUserIdAsync(client, supabaseUrl, apiKey, user.Id);
    }
    else
    {
        var rows = await FetchPagedTableWithAuthorizationAsync(
            client,
            supabaseUrl,
            apiKey,
            accessToken,
            "profiles",
            select: "id,email,first_name,last_name,role",
            filters: [$"id=eq.{Uri.EscapeDataString(user.Id)}"]);
        profile = rows.FirstOrDefault();
    }

    var email = user.Email?.Trim();
    var normalizedEmail = email?.ToLowerInvariant();

    if (profile is not null)
    {
        if (!profile.TryGetValue("email", out var existingEmail) || existingEmail is null)
        {
            profile["email"] = email;
        }

        if ((!profile.TryGetValue("role", out var existingRole) || existingRole is null || string.IsNullOrWhiteSpace(existingRole.ToString()))
            && normalizedEmail is not null
            && knownAdminEmails.Contains(normalizedEmail))
        {
            profile["role"] = "admin";
        }

        return profile;
    }

    if (normalizedEmail is not null && knownAdminEmails.Contains(normalizedEmail))
    {
        return new Dictionary<string, object?>
        {
            ["id"] = user.Id,
            ["email"] = email,
            ["first_name"] = null,
            ["last_name"] = null,
            ["role"] = "admin",
        };
    }

    return null;
}

static async Task<SupabaseAuthUser?> FetchSupabaseAuthUserAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    string accessToken)
{
    var baseUrl = supabaseUrl.TrimEnd('/');

    using var userRequest = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/auth/v1/user");
    userRequest.Headers.TryAddWithoutValidation("apikey", apiKey);
    userRequest.Headers.TryAddWithoutValidation("Authorization", $"Bearer {accessToken}");

    using var userResponse = await client.SendAsync(userRequest);
    userResponse.EnsureSuccessStatusCode();

    var userBody = await userResponse.Content.ReadAsStringAsync();
    return JsonSerializer.Deserialize<SupabaseAuthUser>(userBody, JsonOptions());
}

static async Task<Dictionary<string, object?>?> UpdateProfileRoleAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    string userId,
    string role)
{
    var baseUrl = supabaseUrl.TrimEnd('/');
    using var request = new HttpRequestMessage(
        HttpMethod.Patch,
        $"{baseUrl}/rest/v1/profiles?id=eq.{Uri.EscapeDataString(userId)}&select=id,email,first_name,last_name,role");
    request.Headers.TryAddWithoutValidation("apikey", apiKey);
    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
    request.Headers.TryAddWithoutValidation("Prefer", "return=representation");
    request.Content = new StringContent(
        JsonSerializer.Serialize(new Dictionary<string, object?> { ["role"] = role }),
        Encoding.UTF8,
        "application/json");

    using var response = await client.SendAsync(request);
    response.EnsureSuccessStatusCode();

    var body = await response.Content.ReadAsStringAsync();
    var rows = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
    return rows.FirstOrDefault();
}

static async Task<Dictionary<string, object?>?> FetchResidentProfileBundleAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    int residentId)
{
    var resident = await FetchSingleByIdAsync(
        client,
        supabaseUrl,
        apiKey,
        "residents",
        "resident_id",
        residentId,
        "*,safehouses(safehouse_id,name)");

    if (resident is null)
    {
        return null;
    }

    if (resident.TryGetValue("safehouses", out var safehouse) && safehouse is JsonElement json && json.ValueKind == JsonValueKind.Object)
    {
        resident["safehouse_name"] = json.TryGetProperty("name", out var nameValue) ? nameValue.GetString() : null;
    }
    else
    {
        resident["safehouse_name"] = null;
    }
    resident.Remove("safehouses");

    var educationRecords = FetchPagedTableAsync(client, supabaseUrl, apiKey, "education_records", filters: [$"resident_id=eq.{residentId}"], orderBy: "record_date.desc");
    var healthRecords = FetchPagedTableAsync(client, supabaseUrl, apiKey, "health_wellbeing_records", filters: [$"resident_id=eq.{residentId}"], orderBy: "record_date.desc");
    var homeVisitations = FetchPagedTableAsync(client, supabaseUrl, apiKey, "home_visitations", filters: [$"resident_id=eq.{residentId}"], orderBy: "visit_date.desc");
    var incidentReports = FetchPagedTableAsync(client, supabaseUrl, apiKey, "incident_reports", filters: [$"resident_id=eq.{residentId}"], orderBy: "incident_date.desc");
    var interventionPlans = FetchPagedTableAsync(client, supabaseUrl, apiKey, "intervention_plans", filters: [$"resident_id=eq.{residentId}"], orderBy: "created_at.desc");
    var processRecordings = FetchPagedTableAsync(client, supabaseUrl, apiKey, "process_recordings", filters: [$"resident_id=eq.{residentId}"], orderBy: "recording_id.desc");

    await Task.WhenAll(educationRecords, healthRecords, homeVisitations, incidentReports, interventionPlans, processRecordings);

    return new Dictionary<string, object?>
    {
        ["resident"] = resident,
        ["educationRecords"] = educationRecords.Result,
        ["healthRecords"] = healthRecords.Result,
        ["homeVisitations"] = homeVisitations.Result,
        ["incidentReports"] = incidentReports.Result,
        ["interventionPlans"] = interventionPlans.Result,
        ["processRecordings"] = processRecordings.Result,
    };
}

static async Task<List<Dictionary<string, object?>>> FetchPagedTableAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    string table,
    string select = "*",
    IEnumerable<string>? filters = null,
    string? orderBy = null)
{
    var results = new List<Dictionary<string, object?>>();
    var baseUrl = supabaseUrl.TrimEnd('/');
    const int pageSize = 1000;
    var queryParts = new List<string> { $"select={Uri.EscapeDataString(select)}" };

    if (!string.IsNullOrWhiteSpace(orderBy))
    {
        queryParts.Add($"order={Uri.EscapeDataString(orderBy)}");
    }

    if (filters is not null)
    {
        queryParts.AddRange(filters);
    }

    var query = string.Join("&", queryParts);

    for (var start = 0; ; start += pageSize)
    {
        var end = start + pageSize - 1;
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{baseUrl}/rest/v1/{table}?{query}");
        request.Headers.TryAddWithoutValidation("apikey", apiKey);
        request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
        request.Headers.TryAddWithoutValidation("Range-Unit", "items");
        request.Headers.TryAddWithoutValidation("Range", $"{start}-{end}");

        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync();
        var page = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
        results.AddRange(page);

        if (page.Count < pageSize)
        {
            break;
        }
    }

    return results;
}

static async Task<List<Dictionary<string, object?>>> FetchPagedTableWithAuthorizationAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    string authorizationToken,
    string table,
    string select = "*",
    IEnumerable<string>? filters = null,
    string? orderBy = null)
{
    var results = new List<Dictionary<string, object?>>();
    var baseUrl = supabaseUrl.TrimEnd('/');
    const int pageSize = 1000;
    var queryParts = new List<string> { $"select={Uri.EscapeDataString(select)}" };

    if (!string.IsNullOrWhiteSpace(orderBy))
    {
        queryParts.Add($"order={Uri.EscapeDataString(orderBy)}");
    }

    if (filters is not null)
    {
        queryParts.AddRange(filters);
    }

    var query = string.Join("&", queryParts);

    for (var start = 0; ; start += pageSize)
    {
        var end = start + pageSize - 1;
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{baseUrl}/rest/v1/{table}?{query}");
        request.Headers.TryAddWithoutValidation("apikey", apiKey);
        request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {authorizationToken}");
        request.Headers.TryAddWithoutValidation("Range-Unit", "items");
        request.Headers.TryAddWithoutValidation("Range", $"{start}-{end}");

        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync();
        var page = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
        results.AddRange(page);

        if (page.Count < pageSize)
        {
            break;
        }
    }

    return results;
}

static async Task<Dictionary<string, object?>?> FetchSingleByIdAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    string table,
    string primaryKey,
    int id,
    string select = "*")
{
    var rows = await FetchPagedTableAsync(
        client,
        supabaseUrl,
        apiKey,
        table,
        select: select,
        filters: [$"{primaryKey}=eq.{id}"]);

    return rows.FirstOrDefault();
}

static async Task<List<Dictionary<string, object?>>> InsertTableRowAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    string table,
    Dictionary<string, object?> row,
    string select = "*")
{
    var baseUrl = supabaseUrl.TrimEnd('/');
    using var request = new HttpRequestMessage(
        HttpMethod.Post,
        $"{baseUrl}/rest/v1/{table}?select={Uri.EscapeDataString(select)}");
    request.Headers.TryAddWithoutValidation("apikey", apiKey);
    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
    request.Headers.TryAddWithoutValidation("Prefer", "return=representation");
    request.Content = new StringContent(JsonSerializer.Serialize(row), Encoding.UTF8, "application/json");

    using var response = await client.SendAsync(request);
    var body = await response.Content.ReadAsStringAsync();
    if (!response.IsSuccessStatusCode)
    {
        throw new InvalidOperationException(
            $"Supabase insert into \"{table}\" failed: {(int)response.StatusCode} {response.ReasonPhrase}. {body}");
    }

    return JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
}

static async Task<Dictionary<string, object?>?> UpdateTableRowAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    string table,
    string primaryKey,
    int id,
    Dictionary<string, object?> updates,
    string select = "*")
{
    var baseUrl = supabaseUrl.TrimEnd('/');
    using var request = new HttpRequestMessage(
        HttpMethod.Patch,
        $"{baseUrl}/rest/v1/{table}?{primaryKey}=eq.{id}&select={Uri.EscapeDataString(select)}");
    request.Headers.TryAddWithoutValidation("apikey", apiKey);
    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
    request.Headers.TryAddWithoutValidation("Prefer", "return=representation");
    request.Content = new StringContent(JsonSerializer.Serialize(updates), Encoding.UTF8, "application/json");

    using var response = await client.SendAsync(request);
    response.EnsureSuccessStatusCode();

    var body = await response.Content.ReadAsStringAsync();
    var rows = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
    return rows.FirstOrDefault();
}

static async Task DeleteTableRowAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    string table,
    string primaryKey,
    int id)
{
    var baseUrl = supabaseUrl.TrimEnd('/');
    using var request = new HttpRequestMessage(
        HttpMethod.Delete,
        $"{baseUrl}/rest/v1/{table}?{primaryKey}=eq.{id}");
    request.Headers.TryAddWithoutValidation("apikey", apiKey);
    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");

    using var response = await client.SendAsync(request);
    response.EnsureSuccessStatusCode();
}

static async Task<List<Dictionary<string, object?>>> FetchAllSupportersAsync(HttpClient client, string supabaseUrl, string apiKey)
{
    var results = new List<Dictionary<string, object?>>();
    var baseUrl = supabaseUrl.TrimEnd('/');
    const int pageSize = 1000;

    for (var start = 0; ; start += pageSize)
    {
        var end = start + pageSize - 1;
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{baseUrl}/rest/v1/supporters?select=*&order=supporter_id.asc"
        );
        request.Headers.TryAddWithoutValidation("apikey", apiKey);
        request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
        request.Headers.TryAddWithoutValidation("Range-Unit", "items");
        request.Headers.TryAddWithoutValidation("Range", $"{start}-{end}");

        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync();
        var page = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
        results.AddRange(page);

        if (page.Count < pageSize)
        {
            break;
        }
    }

    return results;
}

static async Task<List<Dictionary<string, object?>>> FetchAllDonationsAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    int? supporterId = null)
{
    var results = new List<Dictionary<string, object?>>();
    var baseUrl = supabaseUrl.TrimEnd('/');
    const int pageSize = 1000;
    var supporterFilter = supporterId is int id ? $"&supporter_id=eq.{id}" : string.Empty;

    for (var start = 0; ; start += pageSize)
    {
        var end = start + pageSize - 1;
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            // select=* avoids hard-coding columns that may not exist until optional migrations are applied.
            $"{baseUrl}/rest/v1/donations?select=*,supporters(display_name,organization_name,first_name,last_name){supporterFilter}&order=donation_date.desc"
        );
        request.Headers.TryAddWithoutValidation("apikey", apiKey);
        request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
        request.Headers.TryAddWithoutValidation("Range-Unit", "items");
        request.Headers.TryAddWithoutValidation("Range", $"{start}-{end}");

        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync();
        var page = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
        results.AddRange(page);

        if (page.Count < pageSize)
        {
            break;
        }
    }

    return results;
}

static async Task<Dictionary<string, object?>?> UpdateSupporterAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    int supporterId,
    Dictionary<string, object?> updates)
{
    var baseUrl = supabaseUrl.TrimEnd('/');
    using var request = new HttpRequestMessage(
        HttpMethod.Patch,
        $"{baseUrl}/rest/v1/supporters?supporter_id=eq.{supporterId}&select=*"
    );
    request.Headers.TryAddWithoutValidation("apikey", apiKey);
    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
    request.Headers.TryAddWithoutValidation("Prefer", "return=representation");
    request.Content = new StringContent(JsonSerializer.Serialize(updates), Encoding.UTF8, "application/json");

    using var response = await client.SendAsync(request);
    response.EnsureSuccessStatusCode();

    var body = await response.Content.ReadAsStringAsync();
    var rows = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
    return rows.FirstOrDefault();
}

static async Task DeleteSupporterAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    int supporterId)
{
    var baseUrl = supabaseUrl.TrimEnd('/');
    using var request = new HttpRequestMessage(
        HttpMethod.Delete,
        $"{baseUrl}/rest/v1/supporters?supporter_id=eq.{supporterId}"
    );
    request.Headers.TryAddWithoutValidation("apikey", apiKey);
    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");

    using var response = await client.SendAsync(request);
    response.EnsureSuccessStatusCode();
}

static async Task<Dictionary<string, object?>?> UpdateDonationAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    int donationId,
    Dictionary<string, object?> updates)
{
    var baseUrl = supabaseUrl.TrimEnd('/');
    using var request = new HttpRequestMessage(
        HttpMethod.Patch,
        $"{baseUrl}/rest/v1/donations?donation_id=eq.{donationId}&select=*,supporters(display_name,organization_name,first_name,last_name)"
    );
    request.Headers.TryAddWithoutValidation("apikey", apiKey);
    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
    request.Headers.TryAddWithoutValidation("Prefer", "return=representation");
    request.Content = new StringContent(JsonSerializer.Serialize(updates), Encoding.UTF8, "application/json");

    using var response = await client.SendAsync(request);
    response.EnsureSuccessStatusCode();

    var body = await response.Content.ReadAsStringAsync();
    var rows = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
    return rows.FirstOrDefault();
}

static async Task DeleteDonationAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    int donationId)
{
    var baseUrl = supabaseUrl.TrimEnd('/');
    using var request = new HttpRequestMessage(
        HttpMethod.Delete,
        $"{baseUrl}/rest/v1/donations?donation_id=eq.{donationId}"
    );
    request.Headers.TryAddWithoutValidation("apikey", apiKey);
    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");

    using var response = await client.SendAsync(request);
    response.EnsureSuccessStatusCode();
}

static async Task<JsonNode> RunSupporterRiskScoringAsync(
    string repoRoot,
    SupporterRiskRefreshRequest? request,
    ILogger logger)
{
    var scriptPath = Path.Combine(repoRoot, "ml-pipelines", "supporter_risk_scoring.py");
    if (!File.Exists(scriptPath))
    {
        throw new FileNotFoundException("Supporter risk scoring script was not found.", scriptPath);
    }

    var artifactDir = request?.ModelDir;
    if (string.IsNullOrWhiteSpace(artifactDir))
    {
        artifactDir = Environment.GetEnvironmentVariable("RISK_MODEL_ARTIFACT_DIR")
            ?? Path.Combine(repoRoot, "ml-pipelines", "model_artifacts");
    }

    var process = new Process
    {
        StartInfo = new ProcessStartInfo
        {
            FileName = "python3",
            WorkingDirectory = repoRoot,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        },
    };
    process.StartInfo.ArgumentList.Add(scriptPath);
    process.StartInfo.ArgumentList.Add("--model-dir");
    process.StartInfo.ArgumentList.Add(artifactDir);

    if (!string.IsNullOrWhiteSpace(request?.CutoffDate))
    {
        process.StartInfo.ArgumentList.Add("--cutoff-date");
        process.StartInfo.ArgumentList.Add(request.CutoffDate!);
    }

    logger.LogInformation("Running supporter risk scoring script.");
    process.Start();
    var stdoutTask = process.StandardOutput.ReadToEndAsync();
    var stderrTask = process.StandardError.ReadToEndAsync();
    await process.WaitForExitAsync();

    var stdout = await stdoutTask;
    var stderr = await stderrTask;

    if (process.ExitCode != 0)
    {
        logger.LogError("Supporter risk scoring failed. stdout: {Stdout} stderr: {Stderr}", stdout, stderr);
        throw new InvalidOperationException("The supporter risk scoring pipeline failed to run.");
    }

    if (string.IsNullOrWhiteSpace(stdout))
    {
        return JsonSerializer.SerializeToNode(new { status = "ok", message = "Supporter risk scoring completed." })!;
    }

    var parsed = JsonNode.Parse(stdout.Trim());
    return parsed ?? JsonSerializer.SerializeToNode(new { status = "ok", output = stdout.Trim() })!;
}

static async Task<List<Dictionary<string, object?>>> FetchAllSupporterRiskScoresAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey)
{
    var results = new List<Dictionary<string, object?>>();
    var baseUrl = supabaseUrl.TrimEnd('/');
    const int pageSize = 1000;

    for (var start = 0; ; start += pageSize)
    {
        var end = start + pageSize - 1;
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{baseUrl}/rest/v1/supporter_risk_scores?select=supporter_id,risk_probability,is_at_risk,risk_threshold,risk_reason,model_name,model_version,scored_at,feature_cutoff_date&order=supporter_id.asc"
        );
        request.Headers.TryAddWithoutValidation("apikey", apiKey);
        request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
        request.Headers.TryAddWithoutValidation("Range-Unit", "items");
        request.Headers.TryAddWithoutValidation("Range", $"{start}-{end}");

        using var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            return [];
        }

        var body = await response.Content.ReadAsStringAsync();
        var page = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
        results.AddRange(page);

        if (page.Count < pageSize)
        {
            break;
        }
    }

    return results;
}

static void ApplySupporterRiskData(
    List<Dictionary<string, object?>> supporters,
    List<Dictionary<string, object?>> donations,
    List<Dictionary<string, object?>> riskScores)
{
    var utcToday = DateTime.UtcNow.Date;
    var datesBySupporter = new Dictionary<long, List<DateTime>>();
    foreach (var row in donations)
    {
        if (!TryGetLong(row, "supporter_id", out var supporterId))
        {
            continue;
        }
        if (!TryGetDate(row, "donation_date", out var donationDate))
        {
            continue;
        }
        if (!datesBySupporter.TryGetValue(supporterId, out var dates))
        {
            dates = [];
            datesBySupporter[supporterId] = dates;
        }
        dates.Add(donationDate.Date);
    }

    var scoresBySupporter = new Dictionary<long, Dictionary<string, object?>>();
    foreach (var score in riskScores)
    {
        if (!TryGetLong(score, "supporter_id", out var supporterId))
        {
            continue;
        }
        scoresBySupporter[supporterId] = score;
    }

    foreach (var supporter in supporters)
    {
        if (!TryGetLong(supporter, "supporter_id", out var supporterId))
        {
            supporter["likely_to_stop_donating"] = false;
            supporter["donation_risk_reason"] = "missing_supporter_id";
            continue;
        }

        if (datesBySupporter.TryGetValue(supporterId, out var donationDates) && donationDates.Count > 0)
        {
            donationDates.Sort();
            var lastDonation = donationDates[^1];
            var daysSinceLast = (utcToday - lastDonation).TotalDays;
            var giftsLast365 = donationDates.Count(d => (utcToday - d).TotalDays <= 365);
            supporter["days_since_last_donation"] = (int)Math.Round(daysSinceLast);
            supporter["gifts_last_365_days"] = giftsLast365;
        }
        else
        {
            supporter["days_since_last_donation"] = null;
            supporter["gifts_last_365_days"] = 0;
        }

        if (!scoresBySupporter.TryGetValue(supporterId, out var modelScore))
        {
            var fallbackAtRisk = !datesBySupporter.TryGetValue(supporterId, out var dates) || dates.Count == 0;
            supporter["likely_to_stop_donating"] = fallbackAtRisk;
            supporter["donation_risk_reason"] = fallbackAtRisk
                ? "no_model_score_no_donation_history"
                : "no_model_score";
            supporter["donation_risk_probability"] = fallbackAtRisk ? 1.0 : (double?)null;
            supporter["donation_risk_threshold"] = null;
            supporter["donation_risk_scored_at"] = null;
            supporter["donation_risk_model_name"] = null;
            supporter["donation_risk_model_version"] = null;
            continue;
        }

        var riskProbability = TryGetDouble(modelScore, "risk_probability", out var prob) ? prob : 0.0;
        var hasIsAtRisk = TryGetBool(modelScore, "is_at_risk", out var isAtRisk);
        var threshold = TryGetDouble(modelScore, "risk_threshold", out var thresholdVal) ? thresholdVal : 0.5;
        var likelyToStop = hasIsAtRisk ? isAtRisk : riskProbability >= threshold;

        supporter["likely_to_stop_donating"] = likelyToStop;
        supporter["donation_risk_reason"] = modelScore.GetValueOrDefault("risk_reason")?.ToString() ?? "model_score";
        supporter["donation_risk_probability"] = Math.Round(riskProbability, 6);
        supporter["donation_risk_threshold"] = threshold;
        supporter["donation_risk_scored_at"] = modelScore.GetValueOrDefault("scored_at");
        supporter["donation_risk_model_name"] = modelScore.GetValueOrDefault("model_name");
        supporter["donation_risk_model_version"] = modelScore.GetValueOrDefault("model_version");
    }
}

static bool TryGetLong(Dictionary<string, object?> row, string key, out long value)
{
    value = 0;
    if (!row.TryGetValue(key, out var raw) || raw is null)
    {
        return false;
    }

    if (raw is JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Number && element.TryGetInt64(out var n))
        {
            value = n;
            return true;
        }
        if (element.ValueKind == JsonValueKind.String && long.TryParse(element.GetString(), out var fromString))
        {
            value = fromString;
            return true;
        }
        return false;
    }

    return long.TryParse(raw.ToString(), out value);
}

static bool TryGetDouble(Dictionary<string, object?> row, string key, out double value)
{
    value = 0;
    if (!row.TryGetValue(key, out var raw) || raw is null)
    {
        return false;
    }

    if (raw is JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Number && element.TryGetDouble(out var n))
        {
            value = n;
            return true;
        }
        if (element.ValueKind == JsonValueKind.String && double.TryParse(element.GetString(), out var fromString))
        {
            value = fromString;
            return true;
        }
        return false;
    }

    return double.TryParse(raw.ToString(), out value);
}

static bool TryGetBool(Dictionary<string, object?> row, string key, out bool value)
{
    value = false;
    if (!row.TryGetValue(key, out var raw) || raw is null)
    {
        return false;
    }

    if (raw is JsonElement element)
    {
        if (element.ValueKind is JsonValueKind.True or JsonValueKind.False)
        {
            value = element.GetBoolean();
            return true;
        }
        if (element.ValueKind == JsonValueKind.String && bool.TryParse(element.GetString(), out var fromString))
        {
            value = fromString;
            return true;
        }
        return false;
    }

    return bool.TryParse(raw.ToString(), out value);
}

static bool TryGetDate(Dictionary<string, object?> row, string key, out DateTime value)
{
    value = default;
    if (!row.TryGetValue(key, out var raw) || raw is null)
    {
        return false;
    }

    if (raw is JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.String)
        {
            return DateTime.TryParse(element.GetString(), out value);
        }
        return false;
    }

    return DateTime.TryParse(raw.ToString(), out value);
}

static async Task<List<Dictionary<string, object?>>> FetchAllDonationAllocationsAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    int? donationId = null)
{
    var results = new List<Dictionary<string, object?>>();
    var baseUrl = supabaseUrl.TrimEnd('/');
    const int pageSize = 1000;
    var donationFilter = donationId is int id ? $"&donation_id=eq.{id}" : string.Empty;

    for (var start = 0; ; start += pageSize)
    {
        var end = start + pageSize - 1;
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{baseUrl}/rest/v1/donation_allocations?select=allocation_id,donation_id,safehouse_id,program_area,amount_allocated,allocation_date,allocation_notes,safehouses(name),donations(donation_id,supporter_id,donation_type,donation_date,supporters(display_name,organization_name,first_name,last_name)){donationFilter}&order=allocation_date.desc"
        );
        request.Headers.TryAddWithoutValidation("apikey", apiKey);
        request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
        request.Headers.TryAddWithoutValidation("Range-Unit", "items");
        request.Headers.TryAddWithoutValidation("Range", $"{start}-{end}");

        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync();
        var page = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
        results.AddRange(page);

        if (page.Count < pageSize)
        {
            break;
        }
    }

    return results;
}

static async Task<List<Dictionary<string, object?>>> FetchAllSafehousesAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey)
{
    var results = new List<Dictionary<string, object?>>();
    var baseUrl = supabaseUrl.TrimEnd('/');
    const int pageSize = 1000;

    for (var start = 0; ; start += pageSize)
    {
        var end = start + pageSize - 1;
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{baseUrl}/rest/v1/safehouses?select=safehouse_id,name,safehouse_code,region,city,status&order=name.asc"
        );
        request.Headers.TryAddWithoutValidation("apikey", apiKey);
        request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
        request.Headers.TryAddWithoutValidation("Range-Unit", "items");
        request.Headers.TryAddWithoutValidation("Range", $"{start}-{end}");

        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync();
        var page = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
        results.AddRange(page);

        if (page.Count < pageSize)
        {
            break;
        }
    }

    return results;
}

static async Task<Dictionary<string, object?>?> CreateSupporterAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    Dictionary<string, object?> payload)
{
    var baseUrl = supabaseUrl.TrimEnd('/');
    using var request = new HttpRequestMessage(
        HttpMethod.Post,
        $"{baseUrl}/rest/v1/supporters?select=*"
    );
    request.Headers.TryAddWithoutValidation("apikey", apiKey);
    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
    request.Headers.TryAddWithoutValidation("Prefer", "return=representation");
    request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

    using var response = await client.SendAsync(request);
    response.EnsureSuccessStatusCode();

    var body = await response.Content.ReadAsStringAsync();
    var rows = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
    return rows.FirstOrDefault();
}

static async Task<Dictionary<string, object?>?> CreateDonationAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    Dictionary<string, object?> payload)
{
    var baseUrl = supabaseUrl.TrimEnd('/');
    using var request = new HttpRequestMessage(
        HttpMethod.Post,
        $"{baseUrl}/rest/v1/donations?select=*,supporters(display_name,organization_name,first_name,last_name)"
    );
    request.Headers.TryAddWithoutValidation("apikey", apiKey);
    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
    request.Headers.TryAddWithoutValidation("Prefer", "return=representation");
    request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

    using var response = await client.SendAsync(request);
    response.EnsureSuccessStatusCode();

    var body = await response.Content.ReadAsStringAsync();
    var rows = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
    return rows.FirstOrDefault();
}

static async Task<Dictionary<string, object?>?> CreateDonationAllocationAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    Dictionary<string, object?> payload)
{
    var baseUrl = supabaseUrl.TrimEnd('/');
    using var request = new HttpRequestMessage(
        HttpMethod.Post,
        $"{baseUrl}/rest/v1/donation_allocations?select=allocation_id,donation_id,safehouse_id,program_area,amount_allocated,allocation_date,allocation_notes,safehouses(name),donations(donation_id,supporter_id,donation_type,donation_date,supporters(display_name,organization_name,first_name,last_name))"
    );
    request.Headers.TryAddWithoutValidation("apikey", apiKey);
    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
    request.Headers.TryAddWithoutValidation("Prefer", "return=representation");
    request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

    using var response = await client.SendAsync(request);
    response.EnsureSuccessStatusCode();

    var body = await response.Content.ReadAsStringAsync();
    var rows = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
    return rows.FirstOrDefault();
}

static async Task<Dictionary<string, object?>?> UpdateDonationAllocationAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    int allocationId,
    Dictionary<string, object?> updates)
{
    var baseUrl = supabaseUrl.TrimEnd('/');
    using var request = new HttpRequestMessage(
        HttpMethod.Patch,
        $"{baseUrl}/rest/v1/donation_allocations?allocation_id=eq.{allocationId}&select=allocation_id,donation_id,safehouse_id,program_area,amount_allocated,allocation_date,allocation_notes,safehouses(name),donations(donation_id,supporter_id,donation_type,donation_date,supporters(display_name,organization_name,first_name,last_name))"
    );
    request.Headers.TryAddWithoutValidation("apikey", apiKey);
    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
    request.Headers.TryAddWithoutValidation("Prefer", "return=representation");
    request.Content = new StringContent(JsonSerializer.Serialize(updates), Encoding.UTF8, "application/json");

    using var response = await client.SendAsync(request);
    response.EnsureSuccessStatusCode();

    var body = await response.Content.ReadAsStringAsync();
    var rows = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(body, JsonOptions()) ?? [];
    return rows.FirstOrDefault();
}

static async Task DeleteDonationAllocationAsync(
    HttpClient client,
    string supabaseUrl,
    string apiKey,
    int allocationId)
{
    var baseUrl = supabaseUrl.TrimEnd('/');
    using var request = new HttpRequestMessage(
        HttpMethod.Delete,
        $"{baseUrl}/rest/v1/donation_allocations?allocation_id=eq.{allocationId}"
    );
    request.Headers.TryAddWithoutValidation("apikey", apiKey);
    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");

    using var response = await client.SendAsync(request);
    response.EnsureSuccessStatusCode();
}

static JsonSerializerOptions JsonOptions()
{
    return new JsonSerializerOptions
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString,
    };
}

static TableConfig GetTableConfig(string table)
{
    return table switch
    {
        "donation_allocations" => new TableConfig { PrimaryKey = "allocation_id", OrderBy = "allocation_id.asc" },
        "donations" => new TableConfig { PrimaryKey = "donation_id", OrderBy = "donation_date.desc" },
        "education_records" => new TableConfig { PrimaryKey = "education_record_id", OrderBy = "record_date.desc" },
        "health_wellbeing_records" => new TableConfig { PrimaryKey = "health_record_id", OrderBy = "record_date.desc" },
        "home_visitations" => new TableConfig { PrimaryKey = "visitation_id", OrderBy = "visit_date.desc" },
        "in_kind_donation_items" => new TableConfig { PrimaryKey = "item_id", OrderBy = "item_id.asc" },
        "incident_reports" => new TableConfig { PrimaryKey = "incident_id", OrderBy = "incident_date.desc" },
        "intervention_plans" => new TableConfig { PrimaryKey = "plan_id", OrderBy = "created_at.desc" },
        "partner_assignments" => new TableConfig { PrimaryKey = "assignment_id", OrderBy = "assignment_id.asc" },
        "partners" => new TableConfig { PrimaryKey = "partner_id", OrderBy = "partner_id.asc" },
        "process_recordings" => new TableConfig { PrimaryKey = "recording_id", OrderBy = "recording_id.desc" },
        "public_impact_snapshots" => new TableConfig { PrimaryKey = "snapshot_id", OrderBy = "snapshot_date.desc" },
        "residents" => new TableConfig { PrimaryKey = "resident_id", OrderBy = "resident_id.asc" },
        "safehouse_monthly_metrics" => new TableConfig { PrimaryKey = "metric_id", OrderBy = "month_start.desc" },
        "safehouses" => new TableConfig { PrimaryKey = "safehouse_id", OrderBy = "safehouse_id.asc" },
        "social_media_posts" => new TableConfig { PrimaryKey = "post_id", OrderBy = "post_id.asc" },
        "supporters" => new TableConfig { PrimaryKey = "supporter_id", OrderBy = "supporter_id.asc" },
        _ => throw new InvalidOperationException($"Unknown table \"{table}\"."),
    };
}

sealed class SupabaseSettings
{
    public string? Url { get; set; }
    public string? Key { get; set; }
    public bool UsingServiceRoleKey { get; set; }
}

sealed class TableConfig
{
    public required string PrimaryKey { get; init; }
    public string Select { get; init; } = "*";
    public string? OrderBy { get; init; }
}

sealed class SocialAnalyticsRefreshRequest
{
    public List<Dictionary<string, object?>> Posts { get; set; } = [];
}

sealed class SupporterRiskRefreshRequest
{
    public string? CutoffDate { get; set; }
    public string? ModelDir { get; set; }
}

sealed class ProfileRoleUpdateRequest
{
    public string Role { get; set; } = string.Empty;
}

/// <summary>Pre-registration CAPTCHA check (includes optional profile fields for auditing).</summary>
sealed class RegisterRequest
{
    public string? CaptchaToken { get; set; }
    public string? Email { get; set; }
    [JsonPropertyName("first_name")]
    public string? FirstName { get; set; }
    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }
}

sealed class SupabaseAuthUser
{
    public string? Id { get; set; }
    public string? Email { get; set; }
}
