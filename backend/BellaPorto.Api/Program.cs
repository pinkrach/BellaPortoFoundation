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
            .WithOrigins(allowedCorsOrigins)
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
        return Results.Ok(supporters);
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
    var settings = new SupabaseSettings
    {
        Url = configuration["Supabase:Url"] ?? Environment.GetEnvironmentVariable("SUPABASE_URL"),
        Key =
            configuration["Supabase:ServiceRoleKey"]
            ?? Environment.GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY")
            ?? configuration["Supabase:AnonKey"]
            ?? Environment.GetEnvironmentVariable("SUPABASE_ANON_KEY"),
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
        }
    }

    return settings;
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
