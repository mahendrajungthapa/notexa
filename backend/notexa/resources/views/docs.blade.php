<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Notexa API Docs</title>
    <style>
        :root {
            color-scheme: light;
            --bg: #f7f8fb;
            --panel: #ffffff;
            --ink: #111827;
            --muted: #5f6877;
            --line: #dde3ed;
            --brand: #2563eb;
            --brand-soft: #e8f0ff;
            --code: #101828;
            --success: #047857;
            --warn: #9a3412;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            background: var(--bg);
            color: var(--ink);
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            line-height: 1.5;
        }

        main {
            width: min(1180px, calc(100% - 32px));
            margin: 0 auto;
            padding: 40px 0 56px;
        }

        .hero {
            display: grid;
            gap: 18px;
            margin-bottom: 24px;
        }

        .eyebrow {
            color: var(--brand);
            font-size: 12px;
            font-weight: 800;
            letter-spacing: .08em;
            text-transform: uppercase;
        }

        h1 {
            margin: 0;
            font-size: clamp(32px, 5vw, 56px);
            line-height: 1.03;
            letter-spacing: 0;
        }

        .intro {
            max-width: 760px;
            margin: 0;
            color: var(--muted);
            font-size: 16px;
        }

        .meta-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin: 26px 0;
        }

        .meta-card {
            min-width: 0;
            border: 1px solid var(--line);
            border-radius: 8px;
            background: var(--panel);
            padding: 16px;
        }

        .meta-label {
            display: block;
            color: var(--muted);
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .06em;
        }

        .meta-value {
            display: block;
            margin-top: 7px;
            overflow-wrap: anywhere;
            font-weight: 800;
        }

        .search {
            width: 100%;
            border: 1px solid var(--line);
            border-radius: 8px;
            background: var(--panel);
            color: var(--ink);
            font: inherit;
            padding: 14px 16px;
            outline: none;
        }

        .search:focus {
            border-color: var(--brand);
            box-shadow: 0 0 0 3px var(--brand-soft);
        }

        .section {
            margin-top: 24px;
            border: 1px solid var(--line);
            border-radius: 8px;
            background: var(--panel);
            overflow: hidden;
        }

        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 18px 20px;
            border-bottom: 1px solid var(--line);
        }

        h2 {
            margin: 0;
            font-size: 20px;
            letter-spacing: 0;
        }

        .count {
            color: var(--muted);
            font-size: 13px;
            font-weight: 700;
        }

        .table-wrap {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            min-width: 980px;
        }

        th,
        td {
            padding: 13px 16px;
            border-bottom: 1px solid var(--line);
            text-align: left;
            vertical-align: top;
            font-size: 14px;
        }

        th {
            color: var(--muted);
            background: #fbfcfe;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: .06em;
            text-transform: uppercase;
        }

        tr:last-child td {
            border-bottom: 0;
        }

        code,
        .mono {
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
        }

        code {
            color: var(--code);
            font-size: 13px;
            overflow-wrap: anywhere;
        }

        .method-list,
        .middleware-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .pill {
            display: inline-flex;
            align-items: center;
            min-height: 26px;
            border-radius: 999px;
            padding: 4px 9px;
            background: #eef2f7;
            color: #263244;
            font-size: 12px;
            font-weight: 800;
            white-space: nowrap;
        }

        .method {
            background: var(--brand-soft);
            color: #1d4ed8;
        }

        .access-public {
            background: #ecfdf5;
            color: var(--success);
        }

        .access-admin {
            background: #fff7ed;
            color: var(--warn);
        }

        .access-bearer-token,
        .access-signed-url {
            background: #f5f3ff;
            color: #5b21b6;
        }

        .empty {
            padding: 24px;
            color: var(--muted);
        }

        @media (max-width: 760px) {
            main {
                width: min(100% - 20px, 1180px);
                padding-top: 24px;
            }

            .meta-grid {
                grid-template-columns: 1fr;
            }

            .section-header {
                align-items: flex-start;
                flex-direction: column;
                gap: 6px;
            }
        }
    </style>
</head>
<body>
<main>
    <header class="hero">
        <span class="eyebrow">Backend documentation</span>
        <h1>Notexa API Routes</h1>
        <p class="intro">
            This page is generated from the registered Laravel API routes. Use Bearer token endpoints with the token returned from login.
        </p>
    </header>

    <section class="meta-grid" aria-label="API metadata">
        <div class="meta-card">
            <span class="meta-label">Base URL</span>
            <span class="meta-value mono">{{ $baseUrl }}</span>
        </div>
        <div class="meta-card">
            <span class="meta-label">Routes</span>
            <span class="meta-value">{{ $totalRoutes }}</span>
        </div>
        <div class="meta-card">
            <span class="meta-label">Generated</span>
            <span class="meta-value">{{ $generatedAt }}</span>
        </div>
    </section>

    <label for="route-search" class="meta-label">Search routes</label>
    <input id="route-search" class="search" type="search" placeholder="Search by method, path, action, access, or middleware">

    @forelse ($groupedRoutes as $group => $routes)
        <section class="section route-section">
            <div class="section-header">
                <h2>{{ $group }}</h2>
                <span class="count">{{ $routes->count() }} routes</span>
            </div>
            <div class="table-wrap">
                <table>
                    <thead>
                    <tr>
                        <th>Method</th>
                        <th>Path</th>
                        <th>Access</th>
                        <th>Action</th>
                        <th>Name</th>
                        <th>Middleware</th>
                    </tr>
                    </thead>
                    <tbody>
                    @foreach ($routes as $route)
                        @php
                            $accessClass = 'access-'.strtolower(str_replace(' ', '-', $route['access']));
                        @endphp
                        <tr class="route-row" data-route="{{ strtolower(implode(' ', $route['methods']).' '.$route['uri'].' '.$route['access'].' '.$route['action'].' '.$route['name'].' '.implode(' ', $route['middleware'])) }}">
                            <td>
                                <div class="method-list">
                                    @foreach ($route['methods'] as $method)
                                        <span class="pill method">{{ $method }}</span>
                                    @endforeach
                                </div>
                            </td>
                            <td><code>/{{ $route['uri'] }}</code></td>
                            <td><span class="pill {{ $accessClass }}">{{ $route['access'] }}</span></td>
                            <td><code>{{ $route['action'] }}</code></td>
                            <td><code>{{ $route['name'] }}</code></td>
                            <td>
                                <div class="middleware-list">
                                    @forelse ($route['middleware'] as $middleware)
                                        <span class="pill">{{ $middleware }}</span>
                                    @empty
                                        <span class="pill">none</span>
                                    @endforelse
                                </div>
                            </td>
                        </tr>
                    @endforeach
                    </tbody>
                </table>
            </div>
        </section>
    @empty
        <section class="section empty">
            No API routes are currently registered.
        </section>
    @endforelse
</main>

<script>
    const searchInput = document.getElementById('route-search');
    const rows = Array.from(document.querySelectorAll('.route-row'));

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();

        rows.forEach((row) => {
            row.hidden = query.length > 0 && !row.dataset.route.includes(query);
        });

        document.querySelectorAll('.route-section').forEach((section) => {
            const visibleRows = section.querySelectorAll('.route-row:not([hidden])').length;
            section.hidden = visibleRows === 0;
        });
    });
</script>
</body>
</html>
