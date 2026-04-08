using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddHttpClient();

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

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("frontend");
app.UseHttpsRedirection();

app.MapGet("/api/health", () => Results.Ok(new { ok = true }));

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

        var supporters = await FetchAllSupportersAsync(httpClientFactory.CreateClient(), settings.Url!, settings.Key!);
        var donations = await FetchAllDonationsAsync(httpClientFactory.CreateClient(), settings.Url!, settings.Key!);
        var riskScores = await FetchAllSupporterRiskScoresAsync(httpClientFactory.CreateClient(), settings.Url!, settings.Key!);
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
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);

        payload.Remove("supporter_id");
        if (payload.Count == 0)
        {
            return Results.BadRequest(new { message = "No supporter fields were provided." });
        }

        var created = await CreateSupporterAsync(httpClientFactory.CreateClient(), settings.Url!, settings.Key!, payload);
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

        // supporter_id is route-owned and cannot be changed.
        updates.Remove("supporter_id");
        if (updates.Count == 0)
        {
            return Results.BadRequest(new { message = "No update fields were provided." });
        }

        var updated = await UpdateSupporterAsync(
            httpClientFactory.CreateClient(),
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

        await DeleteSupporterAsync(httpClientFactory.CreateClient(), settings.Url!, settings.Key!, supporterId);
        return Results.NoContent();
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/donations", async (
    int? supporterId,
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

        var donations = await FetchAllDonationsAsync(httpClientFactory.CreateClient(), settings.Url!, settings.Key!, supporterId);
        return Results.Ok(donations);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPost("/api/donations", async (
    Dictionary<string, object?> payload,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);

        payload.Remove("donation_id");
        payload.Remove("supporters");
        if (payload.Count == 0)
        {
            return Results.BadRequest(new { message = "No donation fields were provided." });
        }

        var created = await CreateDonationAsync(httpClientFactory.CreateClient(), settings.Url!, settings.Key!, payload);
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

        // donation_id is route-owned and cannot be changed.
        updates.Remove("donation_id");
        updates.Remove("supporters");
        if (updates.Count == 0)
        {
            return Results.BadRequest(new { message = "No update fields were provided." });
        }

        var updated = await UpdateDonationAsync(
            httpClientFactory.CreateClient(),
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

        await DeleteDonationAsync(httpClientFactory.CreateClient(), settings.Url!, settings.Key!, donationId);
        return Results.NoContent();
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/donation-allocations", async (
    int? donationId,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var allocations = await FetchAllDonationAllocationsAsync(httpClientFactory.CreateClient(), settings.Url!, settings.Key!, donationId);
        return Results.Ok(allocations);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPost("/api/donation-allocations", async (
    Dictionary<string, object?> payload,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);

        payload.Remove("allocation_id");
        payload.Remove("donations");
        payload.Remove("safehouses");
        if (payload.Count == 0)
        {
            return Results.BadRequest(new { message = "No donation allocation fields were provided." });
        }

        var created = await CreateDonationAllocationAsync(httpClientFactory.CreateClient(), settings.Url!, settings.Key!, payload);
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
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);

        updates.Remove("allocation_id");
        updates.Remove("donations");
        updates.Remove("safehouses");
        if (updates.Count == 0)
        {
            return Results.BadRequest(new { message = "No update fields were provided." });
        }

        var updated = await UpdateDonationAllocationAsync(
            httpClientFactory.CreateClient(),
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
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        await DeleteDonationAllocationAsync(httpClientFactory.CreateClient(), settings.Url!, settings.Key!, allocationId);
        return Results.NoContent();
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/safehouses", async (
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var safehouses = await FetchAllSafehousesAsync(httpClientFactory.CreateClient(), settings.Url!, settings.Key!);
        return Results.Ok(safehouses);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/residents", async (
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var residents = await FetchResidentsAsync(httpClientFactory.CreateClient(), settings.Url!, settings.Key!);
        return Results.Ok(residents);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/residents/{residentId:int}/profile-bundle", async (
    int residentId,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var bundle = await FetchResidentProfileBundleAsync(httpClientFactory.CreateClient(), settings.Url!, settings.Key!, residentId);
        return bundle is null
            ? Results.NotFound(new { message = $"Resident #{residentId} was not found." })
            : Results.Ok(bundle);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapGet("/api/public-impact", async (
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
        var rows = await FetchPagedTableAsync(
            httpClientFactory.CreateClient(),
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

app.MapGet("/api/monthly-metrics", async (
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var rows = await FetchPagedTableAsync(
            httpClientFactory.CreateClient(),
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
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var config = GetTableConfig(table);
        var rows = await FetchPagedTableAsync(
            httpClientFactory.CreateClient(),
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
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var config = GetTableConfig(table);
        var rows = await FetchPagedTableAsync(
            httpClientFactory.CreateClient(),
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
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var config = GetTableConfig(table);
        var row = await FetchSingleByIdAsync(
            httpClientFactory.CreateClient(),
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
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var config = GetTableConfig(table);
        var inserted = await InsertTableRowAsync(
            httpClientFactory.CreateClient(),
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
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var config = GetTableConfig(table);
        updates.Remove(config.PrimaryKey);
        if (updates.Count == 0)
        {
            return Results.BadRequest(new { message = "No update fields were provided." });
        }

        var updated = await UpdateTableRowAsync(
            httpClientFactory.CreateClient(),
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
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
        var settings = ResolveSupabaseSettings(configuration, repoRoot);
        EnsureSupabaseConfigured(settings);
        var config = GetTableConfig(table);
        await DeleteTableRowAsync(
            httpClientFactory.CreateClient(),
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

app.MapGet("/api/ml/social/latest", () =>
{
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
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment,
    ILogger<Program> logger) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
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

app.MapPost("/api/ml/supporter-risk/refresh", async (
    SupporterRiskRefreshRequest? request,
    IWebHostEnvironment environment,
    ILogger<Program> logger) =>
{
    try
    {
        var repoRoot = GetRepoRoot(environment);
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

        if (string.IsNullOrWhiteSpace(settings.Url) && key == "VITE_SUPABASE_URL")
        {
            settings.Url = value;
        }
        else if (string.IsNullOrWhiteSpace(settings.Key) && key == "VITE_SUPABASE_ANON_KEY")
        {
            settings.Key = value;
            settings.UsingServiceRoleKey = false;
        }
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
    response.EnsureSuccessStatusCode();

    var body = await response.Content.ReadAsStringAsync();
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
            $"{baseUrl}/rest/v1/donations?select=donation_id,supporter_id,donation_type,donation_date,is_recurring,campaign_name,channel_source,currency_code,amount,estimated_value,impact_unit,notes,referral_post_id,supporters(display_name,organization_name,first_name,last_name){supporterFilter}&order=donation_date.desc"
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
        $"{baseUrl}/rest/v1/donations?donation_id=eq.{donationId}&select=donation_id,supporter_id,donation_type,donation_date,is_recurring,campaign_name,channel_source,currency_code,amount,estimated_value,impact_unit,notes,referral_post_id,supporters(display_name,organization_name,first_name,last_name)"
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
        $"{baseUrl}/rest/v1/donations?select=donation_id,supporter_id,donation_type,donation_date,is_recurring,campaign_name,channel_source,currency_code,amount,estimated_value,impact_unit,notes,referral_post_id,supporters(display_name,organization_name,first_name,last_name)"
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

sealed class SupabaseAuthUser
{
    public string? Id { get; set; }
    public string? Email { get; set; }
}
