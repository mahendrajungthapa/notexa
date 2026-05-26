<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiDocsTest extends TestCase
{
    public function test_api_docs_page_lists_registered_routes(): void
    {
        $response = $this->get('/docs');

        $response->assertOk()
            ->assertSee('Notexa API Routes')
            ->assertSee('/api/login')
            ->assertSee('/api/notes')
            ->assertSee('/api/admin/settings');
    }
}
