<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

// Nenhum catálogo real, login público ou rota de concessão de acesso no C-00.
Route::fallback(static function () {
    return response()->json(['error' => 'not_found'], 404);
});
