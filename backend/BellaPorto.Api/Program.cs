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
        if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
        {
            return Results.Problem(
                "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
            );
        }

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
        if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
        {
            return Results.Problem(
                "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
            );
        }

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
        if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
        {
            return Results.Problem(
                "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
            );
        }

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
        if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
        {
            return Results.Problem(
                "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
            );
        }

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
        if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
        {
            return Results.Problem(
                "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
            );
        }

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
        if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
        {
            return Results.Problem(
                "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
            );
        }

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
        if (string.IsNullOrWhiteSpace(settings.Url) || string.IsNullOrWhiteSpace(settings.Key))
        {
            return Results.Problem(
                "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or keep frontend/.env available for local development."
            );
        }

        var safehouses = await FetchAllSafehousesAsync(httpClientFactory.CreateClient(), settings.Url!, settings.Key!);
        return Results.Ok(safehouses);
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
            // Risk table may not exist yet in lower environments; return empty and keep API available.
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

        // Keep recency/frequency diagnostics visible in admin detail.
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
            // Fallback when nightly scorer has not populated this supporter yet.
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

sealed class SupabaseSettings
{
    public string? Url { get; set; }
    public string? Key { get; set; }
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
