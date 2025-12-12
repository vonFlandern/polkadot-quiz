<?php
/**
 * API Endpoint: Get Categories
 *
 * Lädt alle verfügbaren Kategorien aus categories.json
 *
 * Method: GET
 * Response: JSON mit Categories-Array
 */

require_once '../config.php';

// Lade Categories aus JSON-Datei
$categoriesData = loadJSON('categories.json');

// Validierung
if (!$categoriesData || !isset($categoriesData['categories'])) {
    errorResponse('Categories not found');
}

// Erfolgreiche Response mit success-Flag
jsonResponse([
    'success' => true,
    'categories' => $categoriesData['categories']
]);
