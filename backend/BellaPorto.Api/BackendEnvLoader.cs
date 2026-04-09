namespace BellaPorto.Api;

/// <summary>
/// Loads <c>.env</c> from the API project directory so local secrets work with
/// <see cref="Environment.GetEnvironmentVariable"/> (used by <c>Program.cs</c>).
/// Does not override variables already set in the process environment.
/// </summary>
internal static class BackendEnvLoader
{
    public static void Load()
    {
        foreach (var path in CandidateEnvPaths())
        {
            if (!File.Exists(path))
            {
                continue;
            }

            foreach (var rawLine in File.ReadAllLines(path))
            {
                var line = rawLine.Trim();
                if (line.Length == 0 || line.StartsWith("#", StringComparison.Ordinal))
                {
                    continue;
                }

                var eq = line.IndexOf('=');
                if (eq <= 0)
                {
                    continue;
                }

                var key = line[..eq].Trim();
                if (key.Length == 0)
                {
                    continue;
                }

                var value = line[(eq + 1)..].Trim();
                if (value.Length >= 2
                    && ((value[0] == '"' && value[^1] == '"') || (value[0] == '\'' && value[^1] == '\'')))
                {
                    value = value[1..^1];
                }

                if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                {
                    Environment.SetEnvironmentVariable(key, value);
                }
            }

            return;
        }
    }

    private static IEnumerable<string> CandidateEnvPaths()
    {
        var fileName = ".env";
        yield return Path.Combine(Directory.GetCurrentDirectory(), fileName);
        yield return Path.Combine(AppContext.BaseDirectory, fileName);

        string? asmDir = null;
        try
        {
            var asm = typeof(BackendEnvLoader).Assembly.Location;
            if (!string.IsNullOrWhiteSpace(asm))
            {
                asmDir = Path.GetDirectoryName(asm);
            }
        }
        catch
        {
            // ignore
        }

        if (!string.IsNullOrWhiteSpace(asmDir))
        {
            yield return Path.Combine(asmDir, fileName);
        }
    }
}
