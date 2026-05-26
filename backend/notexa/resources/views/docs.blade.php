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
            --purple: #6d28d9;
            --danger: #b91c1c;
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
            grid-template-columns: repeat(4, minmax(0, 1fr));
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

        .quick-start {
            display: grid;
            grid-template-columns: 1.15fr .85fr;
            gap: 14px;
            margin: 24px 0;
        }

        .doc-card {
            border: 1px solid var(--line);
            border-radius: 8px;
            background: var(--panel);
            padding: 18px;
        }

        .doc-card h2,
        .doc-card h3 {
            margin: 0 0 10px;
            font-size: 18px;
        }

        .doc-card p {
            margin: 0;
            color: var(--muted);
            font-size: 14px;
        }

        .code-block {
            margin-top: 12px;
            border-radius: 8px;
            background: #101828;
            color: #f8fafc;
            overflow-x: auto;
            padding: 14px;
            font-size: 13px;
        }

        .code-block code {
            color: inherit;
        }

        .filter-grid {
            display: grid;
            grid-template-columns: 1fr auto auto;
            gap: 10px;
            align-items: end;
            margin-top: 14px;
        }

        .select {
            border: 1px solid var(--line);
            border-radius: 8px;
            background: var(--panel);
            color: var(--ink);
            font: inherit;
            padding: 13px 14px;
            outline: none;
            min-width: 150px;
        }

        .group-nav {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 16px;
        }

        .group-nav a {
            color: var(--brand);
            background: var(--brand-soft);
            border-radius: 999px;
            font-size: 13px;
            font-weight: 800;
            padding: 7px 10px;
            text-decoration: none;
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
            min-width: 1080px;
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

        .method-post {
            background: #ecfdf5;
            color: #047857;
        }

        .method-put,
        .method-patch {
            background: #fff7ed;
            color: #9a3412;
        }

        .method-delete {
            background: #fef2f2;
            color: var(--danger);
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
            color: var(--purple);
        }

        .route-path {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
        }

        .route-copy {
            border: 1px solid var(--line);
            border-radius: 8px;
            background: #f8fafc;
            color: var(--muted);
            cursor: pointer;
            font: inherit;
            font-size: 12px;
            font-weight: 800;
            padding: 6px 9px;
            white-space: nowrap;
        }

        .route-copy:hover {
            color: var(--brand);
            border-color: var(--brand);
        }

        .description {
            margin-top: 7px;
            color: var(--muted);
            font-size: 13px;
            max-width: 520px;
        }

        .request-hint {
            display: inline-block;
            max-width: 320px;
            border-radius: 8px;
            background: #f8fafc;
            padding: 8px 10px;
            white-space: normal;
        }

        .empty-results {
            display: none;
            margin-top: 18px;
            border: 1px dashed var(--line);
            border-radius: 8px;
            background: var(--panel);
            color: var(--muted);
            padding: 18px;
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

            .quick-start,
            .filter-grid {
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
            This page is generated from the registered Laravel API routes, so it stays aligned with the backend. Use Bearer token endpoints with the token returned from login.
        </p>
    </header>

    <section class="quick-start" aria-label="Quick start">
        <div class="doc-card">
            <h2>Quick Start</h2>
            <p>Authenticate first, then send the returned token as an Authorization header for protected routes.</p>
            <pre class="code-block"><code>POST {{ $baseUrl }}/login
Content-Type: application/json

{
  "login": "admin@example.com",
  "password": "your-password"
}

Authorization: Bearer &lt;token&gt;</code></pre>
        </div>
        <div class="doc-card">
            <h3>Response Shape</h3>
            <p>Most endpoints return a JSON object with <code>status</code>, optional <code>message</code>, and a <code>data</code> or resource payload. Validation errors return HTTP 422 with an <code>errors</code> object.</p>
            <div class="group-nav" aria-label="Route groups">
                @foreach ($groupedRoutes as $group => $routes)
                    <a href="#group-{{ \Illuminate\Support\Str::slug($group) }}">{{ $group }} · {{ $routes->count() }}</a>
                @endforeach
            </div>
        </div>
    </section>

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
        <div class="meta-card">
            <span class="meta-label">Methods</span>
            <span class="meta-value">
                @foreach ($methodTotals as $method => $count)
                    <span class="pill method method-{{ strtolower($method) }}">{{ $method }} {{ $count }}</span>
                @endforeach
            </span>
        </div>
    </section>

    <section class="filter-grid" aria-label="Route filters">
        <div>
            <label for="route-search" class="meta-label">Search routes</label>
            <input id="route-search" class="search" type="search" placeholder="Search by method, path, action, access, request body, or middleware">
        </div>
        <div>
            <label for="method-filter" class="meta-label">Method</label>
            <select id="method-filter" class="select">
                <option value="">All methods</option>
                @foreach ($methodTotals as $method => $count)
                    <option value="{{ strtolower($method) }}">{{ $method }}</option>
                @endforeach
            </select>
        </div>
        <div>
            <label for="access-filter" class="meta-label">Access</label>
            <select id="access-filter" class="select">
                <option value="">All access</option>
                <option value="public">Public</option>
                <option value="bearer token">Bearer token</option>
                <option value="signed url">Signed URL</option>
                <option value="admin">Admin</option>
            </select>
        </div>
    </section>
    <div id="empty-results" class="empty-results">No routes match the current filters.</div>

    @forelse ($groupedRoutes as $group => $routes)
        <section id="group-{{ \Illuminate\Support\Str::slug($group) }}" class="section route-section">
            <div class="section-header">
                <h2>{{ $group }}</h2>
                <span class="count">{{ $routes->count() }} routes</span>
            </div>
            <div class="table-wrap">
                <table>
                    <thead>
                    <tr>
                        <th>Method</th>
                        <th>Endpoint</th>
                        <th>Access</th>
                        <th>Request</th>
                        <th>Action</th>
                        <th>Name</th>
                        <th>Middleware</th>
                    </tr>
                    </thead>
                    <tbody>
                    @foreach ($routes as $route)
                        @php
                            $accessClass = 'access-'.strtolower(str_replace(' ', '-', $route['access']));
                            $methodClass = strtolower($route['methods'][0] ?? 'get');
                            $searchText = strtolower(implode(' ', $route['methods']).' '.$route['uri'].' '.$route['description'].' '.$route['request'].' '.$route['access'].' '.$route['action'].' '.$route['name'].' '.implode(' ', $route['middleware']));
                        @endphp
                        <tr class="route-row" data-route="{{ $searchText }}" data-methods="{{ strtolower(implode(' ', $route['methods'])) }}" data-access="{{ strtolower($route['access']) }}">
                            <td>
                                <div class="method-list">
                                    @foreach ($route['methods'] as $method)
                                        <span class="pill method method-{{ strtolower($method) }}">{{ $method }}</span>
                                    @endforeach
                                </div>
                            </td>
                            <td>
                                <div class="route-path">
                                    <div>
                                        <code>/{{ $route['uri'] }}</code>
                                        <div class="description">{{ $route['description'] }}</div>
                                    </div>
                                    <button type="button" class="route-copy" data-copy="{{ $route['url'] }}">Copy URL</button>
                                </div>
                            </td>
                            <td><span class="pill {{ $accessClass }}">{{ $route['access'] }}</span></td>
                            <td><code class="request-hint">{{ $route['request'] }}</code></td>
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
    const methodFilter = document.getElementById('method-filter');
    const accessFilter = document.getElementById('access-filter');
    const emptyResults = document.getElementById('empty-results');
    const rows = Array.from(document.querySelectorAll('.route-row'));

    const applyFilters = () => {
        const query = searchInput.value.trim().toLowerCase();
        const method = methodFilter.value;
        const access = accessFilter.value;
        let visibleTotal = 0;

        rows.forEach((row) => {
            const matchesQuery = query.length === 0 || row.dataset.route.includes(query);
            const matchesMethod = method.length === 0 || row.dataset.methods.includes(method);
            const matchesAccess = access.length === 0 || row.dataset.access === access;
            const isVisible = matchesQuery && matchesMethod && matchesAccess;

            row.hidden = !isVisible;
            if (isVisible) visibleTotal += 1;
        });

        document.querySelectorAll('.route-section').forEach((section) => {
            const visibleRows = section.querySelectorAll('.route-row:not([hidden])').length;
            section.hidden = visibleRows === 0;
        });

        emptyResults.style.display = visibleTotal === 0 ? 'block' : 'none';
    };

    searchInput.addEventListener('input', applyFilters);
    methodFilter.addEventListener('change', applyFilters);
    accessFilter.addEventListener('change', applyFilters);

    document.querySelectorAll('.route-copy').forEach((button) => {
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(button.dataset.copy);
                const original = button.textContent;
                button.textContent = 'Copied';
                window.setTimeout(() => { button.textContent = original; }, 1200);
            } catch {
                button.textContent = 'Copy failed';
                window.setTimeout(() => { button.textContent = 'Copy URL'; }, 1200);
            }
        });
    });
</script>
</body>
</html>
