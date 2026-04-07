using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddHttpClient();
builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:8080", "http://127.0.0.1:8080")
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
