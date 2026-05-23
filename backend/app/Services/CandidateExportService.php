<?php

namespace App\Services;

use App\Support\ExportLocale;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CandidateExportService
{
    public function export(Collection $rows, string $format, array $filters = [], string $lang = 'en'): StreamedResponse
    {
        $locale = new ExportLocale(ExportLocale::normalize($lang));

        return match ($format) {
            'json' => $this->exportJson($rows, $filters, $locale),
            'html' => $this->exportHtml($rows, $filters, $locale),
            default => $this->exportCsv($rows, $locale),
        };
    }

    private function exportCsv(Collection $rows, ExportLocale $locale): StreamedResponse
    {
        $headers = $locale->csvHeaders();

        return response()->streamDownload(function () use ($rows, $headers, $locale) {
            echo "\xEF\xBB\xBF";
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $headers);

            foreach ($this->groupRowsByPromotion($rows, $locale) as $group) {
                fputcsv($handle, [$locale->promoHeaderRow($group['name'], $group['count'])]);

                foreach ($group['rows'] as $row) {
                    fputcsv($handle, [
                        $row['firstName'],
                        $row['lastName'],
                        $row['email'],
                        $row['phone'],
                        $locale->genderLabel((string) $row['gender']),
                        $row['age'],
                        $row['educationLevel'],
                        $row['diplomaName'],
                        $row['diplomaAverage'],
                        $row['promotionName'],
                        $locale->statusLabel((string) $row['status']),
                        number_format($row['avgScore'], 2, '.', ''),
                        $locale->categoryLabel((string) $row['category']),
                        $row['recruitmentDate'],
                    ]);
                }

                fputcsv($handle, []);
            }

            fclose($handle);
        }, 'candidates.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function exportJson(Collection $rows, array $filters, ExportLocale $locale): StreamedResponse
    {
        return response()->streamDownload(function () use ($rows, $filters, $locale) {
            $breakdown = $this->statusBreakdown($rows);
            $localizedBreakdown = [];
            foreach ($breakdown as $status => $count) {
                $localizedBreakdown[$locale->statusLabel($status)] = $count;
            }

            $candidates = $rows->map(function (array $row) use ($locale) {
                return array_merge($row, [
                    'genderLabel' => $locale->genderLabel((string) $row['gender']),
                    'statusLabel' => $locale->statusLabel((string) $row['status']),
                    'categoryLabel' => $locale->categoryLabel((string) $row['category']),
                ]);
            })->values()->all();

            echo json_encode([
                'locale' => $locale->code(),
                'exportedAt' => now()->toISOString(),
                'scope' => $locale->t('scope'),
                'total' => $rows->count(),
                'statusBreakdown' => $localizedBreakdown,
                'filters' => $this->localizedFilters($filters, $locale),
                'promotions' => $this->groupRowsByPromotion($rows, $locale),
                'candidates' => $candidates,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }, 'candidates.json', [
            'Content-Type' => 'application/json',
        ]);
    }

    private function exportHtml(Collection $rows, array $filters, ExportLocale $locale): StreamedResponse
    {
        return response()->streamDownload(function () use ($rows, $filters, $locale) {
            $count = $rows->count();
            $date = now()->format('d/m/Y H:i');
            $filterSummary = $this->filterSummaryHtml($filters, $locale);
            $breakdown = $this->statusBreakdown($rows);
            $statCards = $this->statCardsHtml($breakdown, $count, $locale);
            $groups = $this->groupRowsByPromotion($rows, $locale);
            $sectionsHtml = '';

            foreach ($groups as $group) {
                $sectionsHtml .= $this->promotionSectionHtml($group, $locale);
            }

            $htmlLang = htmlspecialchars($locale->t('htmlLang'), ENT_QUOTES, 'UTF-8');
            $pageTitle = htmlspecialchars($locale->t('pageTitle'), ENT_QUOTES, 'UTF-8');
            $brand = htmlspecialchars($locale->t('brand'), ENT_QUOTES, 'UTF-8');
            $title = htmlspecialchars("{$locale->t('allCandidates')} ({$count})", ENT_QUOTES, 'UTF-8');
            $subtitle = htmlspecialchars($locale->t('subtitle'), ENT_QUOTES, 'UTF-8');
            $exportedOn = htmlspecialchars($locale->t('exportedOn'), ENT_QUOTES, 'UTF-8');
            $footer = htmlspecialchars($locale->t('footer'), ENT_QUOTES, 'UTF-8');

            echo <<<HTML
<!DOCTYPE html>
<html lang="{$htmlLang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{$pageTitle}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      background: linear-gradient(180deg, #f0f4ff 0%, #f8fafc 220px, #f8fafc 100%);
      color: #1e293b;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 45%, #3b82f6 100%);
      color: #fff;
      padding: 28px 32px 32px;
      box-shadow: 0 8px 24px rgba(79, 70, 229, 0.22);
    }
    .header-inner { max-width: 1200px; margin: 0 auto; }
    .brand { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.85; margin-bottom: 8px; }
    .header h1 { margin: 0 0 8px; font-size: 28px; font-weight: 700; }
    .header p { margin: 0; opacity: 0.92; font-size: 14px; line-height: 1.5; }
    .container { max-width: 1200px; margin: -18px auto 32px; padding: 0 24px; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px 16px;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
    }
    .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 6px; }
    .stat-value { font-size: 24px; font-weight: 700; color: #0f172a; }
    .stat-value.active { color: #2563eb; }
    .stat-value.graduated { color: #059669; }
    .stat-value.dismissed { color: #d97706; }
    .stat-value.terminated { color: #dc2626; }
    .meta {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 13px;
      color: #64748b;
    }
    .promo-section {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06);
      margin-bottom: 18px;
    }
    .promo-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 14px 16px;
      background: linear-gradient(90deg, #eef2ff 0%, #f8fafc 100%);
      border-bottom: 1px solid #e2e8f0;
    }
    .promo-title { margin: 0; font-size: 16px; font-weight: 700; color: #312e81; }
    .promo-count { font-size: 12px; color: #64748b; font-weight: 600; }
    .desktop-table { display: block; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 720px; }
    thead th {
      background: #f8fafc;
      text-align: left;
      padding: 12px 14px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }
    tbody td {
      padding: 11px 14px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) { background: #fafbff; }
    tbody tr:hover { background: #f1f5ff; }
    tbody tr:last-child td { border-bottom: none; }
    .mobile-cards { display: none; }
    .candidate-card {
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
      background: #fff;
    }
    .candidate-card:last-child { border-bottom: none; }
    .card-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .name { font-weight: 600; color: #0f172a; }
    .muted { color: #64748b; font-size: 12px; word-break: break-word; }
    .avg { font-weight: 700; color: #4f46e5; font-variant-numeric: tabular-nums; font-size: 18px; }
    .card-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
    .card-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 12px;
      color: #64748b;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }
    .footer {
      max-width: 1200px;
      margin: 0 auto 28px;
      padding: 0 24px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
    @media (max-width: 768px) {
      .header { padding: 20px 16px 24px; }
      .header h1 { font-size: 22px; }
      .header p { font-size: 13px; }
      .container { padding: 0 12px; margin-top: -12px; }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .stat-value { font-size: 20px; }
      .meta { font-size: 12px; padding: 10px 12px; }
      .promo-title { font-size: 15px; }
      .desktop-table { display: none; }
      .mobile-cards { display: block; }
      .footer { padding: 0 12px 20px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-inner">
      <div class="brand">{$brand}</div>
      <h1>{$title}</h1>
      <p>{$subtitle}</p>
    </div>
  </div>

  <div class="container">
    {$statCards}
    <div class="meta">{$exportedOn} {$date}{$filterSummary}</div>
    {$sectionsHtml}
  </div>
  <div class="footer">{$footer}</div>
</body>
</html>
HTML;
        }, 'candidates.html', [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    private function groupRowsByPromotion(Collection $rows, ExportLocale $locale): array
    {
        return $rows
            ->groupBy(fn (array $row) => $row['promotionId'] ?: 'unassigned')
            ->map(function (Collection $groupRows, string $promotionId) use ($locale) {
                $first = $groupRows->first();
                $name = $first['promotionName'] ?: $locale->t('unassigned');

                return [
                    'id' => $promotionId,
                    'name' => $name,
                    'count' => $groupRows->count(),
                    'rows' => $groupRows->values()->all(),
                ];
            })
            ->sortBy('name')
            ->values()
            ->all();
    }

    private function promotionSectionHtml(array $group, ExportLocale $locale): string
    {
        $title = htmlspecialchars($group['name'], ENT_QUOTES, 'UTF-8');
        $countLabel = htmlspecialchars($locale->promoCountLabel($group['count']), ENT_QUOTES, 'UTF-8');
        $headers = $locale->tableHeaders();
        $headerCells = implode('', array_map(
            fn (string $header) => '<th>' . htmlspecialchars($header, ENT_QUOTES, 'UTF-8') . '</th>',
            $headers,
        ));

        $desktopRows = '';
        $mobileCards = '';

        foreach ($group['rows'] as $row) {
            $desktopRows .= $this->candidateTableRowHtml($row, $locale);
            $mobileCards .= $this->candidateCardHtml($row, $locale);
        }

        return <<<HTML
<section class="promo-section">
  <div class="promo-header">
    <h2 class="promo-title">{$title}</h2>
    <span class="promo-count">{$countLabel}</span>
  </div>
  <div class="desktop-table">
    <table>
      <thead><tr>{$headerCells}</tr></thead>
      <tbody>{$desktopRows}</tbody>
    </table>
  </div>
  <div class="mobile-cards">{$mobileCards}</div>
</section>
HTML;
    }

    private function candidateTableRowHtml(array $row, ExportLocale $locale): string
    {
        $name = htmlspecialchars("{$row['firstName']} {$row['lastName']}", ENT_QUOTES, 'UTF-8');
        $email = htmlspecialchars($row['email'], ENT_QUOTES, 'UTF-8');
        $phone = htmlspecialchars((string) $row['phone'], ENT_QUOTES, 'UTF-8');
        $gender = htmlspecialchars($locale->genderLabel((string) $row['gender']), ENT_QUOTES, 'UTF-8');
        $age = htmlspecialchars((string) $row['age'], ENT_QUOTES, 'UTF-8');
        $education = htmlspecialchars((string) $row['educationLevel'], ENT_QUOTES, 'UTF-8');
        $diploma = htmlspecialchars(trim("{$row['diplomaName']} ({$row['diplomaAverage']}/20)"), ENT_QUOTES, 'UTF-8');
        $statusBadge = $this->statusBadgeHtml((string) $row['status'], $locale);
        $avg = number_format($row['avgScore'], 2, '.', '');
        $categoryBadge = $this->categoryBadgeHtml((string) $row['category'], $locale);
        $dateValue = htmlspecialchars((string) $row['recruitmentDate'], ENT_QUOTES, 'UTF-8');

        return "<tr>
          <td class=\"name\">{$name}</td>
          <td class=\"muted\">{$email}</td>
          <td class=\"muted\">{$phone}</td>
          <td>{$gender}</td>
          <td>{$age}</td>
          <td>{$education}</td>
          <td class=\"muted\">{$diploma}</td>
          <td>{$statusBadge}</td>
          <td class=\"avg\">{$avg}</td>
          <td>{$categoryBadge}</td>
          <td class=\"muted\">{$dateValue}</td>
        </tr>";
    }

    private function candidateCardHtml(array $row, ExportLocale $locale): string
    {
        $name = htmlspecialchars("{$row['firstName']} {$row['lastName']}", ENT_QUOTES, 'UTF-8');
        $email = htmlspecialchars($row['email'], ENT_QUOTES, 'UTF-8');
        $phone = htmlspecialchars((string) $row['phone'], ENT_QUOTES, 'UTF-8');
        $gender = htmlspecialchars($locale->genderLabel((string) $row['gender']), ENT_QUOTES, 'UTF-8');
        $age = htmlspecialchars((string) $row['age'], ENT_QUOTES, 'UTF-8');
        $education = htmlspecialchars((string) $row['educationLevel'], ENT_QUOTES, 'UTF-8');
        $diploma = htmlspecialchars(trim("{$row['diplomaName']} ({$row['diplomaAverage']}/20)"), ENT_QUOTES, 'UTF-8');
        $statusBadge = $this->statusBadgeHtml((string) $row['status'], $locale);
        $avg = number_format($row['avgScore'], 2, '.', '');
        $categoryBadge = $this->categoryBadgeHtml((string) $row['category'], $locale);
        $dateValue = htmlspecialchars((string) $row['recruitmentDate'], ENT_QUOTES, 'UTF-8');
        $yrs = htmlspecialchars($locale->t('yrs'), ENT_QUOTES, 'UTF-8');
        $recruited = htmlspecialchars($locale->t('recruited'), ENT_QUOTES, 'UTF-8');

        return <<<HTML
<article class="candidate-card">
  <div class="card-top">
    <div>
      <div class="name">{$name}</div>
      <div class="muted">{$email}</div>
      <div class="muted">{$phone}</div>
    </div>
    <div class="avg">{$avg}</div>
  </div>
  <div class="card-badges">{$statusBadge}{$categoryBadge}</div>
  <div class="card-grid">
    <span>{$gender} · {$age} {$yrs}</span>
    <span>{$education}</span>
    <span style="grid-column: span 2">{$diploma}</span>
    <span style="grid-column: span 2">{$recruited} {$dateValue}</span>
  </div>
</article>
HTML;
    }

    private function statusBreakdown(Collection $rows): array
    {
        return [
            'Active' => $rows->where('status', 'Active')->count(),
            'Graduated' => $rows->where('status', 'Graduated')->count(),
            'Dismissed' => $rows->where('status', 'Dismissed')->count(),
            'Terminated' => $rows->where('status', 'Terminated')->count(),
        ];
    }

    private function statCardsHtml(array $breakdown, int $total, ExportLocale $locale): string
    {
        $cards = [
            ['label' => $locale->t('total'), 'value' => $total, 'class' => ''],
            ['label' => $locale->statusLabel('Active'), 'value' => $breakdown['Active'], 'class' => 'active'],
            ['label' => $locale->statusLabel('Graduated'), 'value' => $breakdown['Graduated'], 'class' => 'graduated'],
            ['label' => $locale->statusLabel('Dismissed'), 'value' => $breakdown['Dismissed'], 'class' => 'dismissed'],
            ['label' => $locale->statusLabel('Terminated'), 'value' => $breakdown['Terminated'], 'class' => 'terminated'],
        ];

        $html = '<div class="stats">';
        foreach ($cards as $card) {
            $label = htmlspecialchars($card['label'], ENT_QUOTES, 'UTF-8');
            $class = htmlspecialchars($card['class'], ENT_QUOTES, 'UTF-8');
            $html .= "<div class=\"stat-card\"><div class=\"stat-label\">{$label}</div><div class=\"stat-value {$class}\">{$card['value']}</div></div>";
        }
        $html .= '</div>';

        return $html;
    }

    private function statusBadgeHtml(string $status, ExportLocale $locale): string
    {
        $styles = [
            'Active' => 'background:#dbeafe;color:#1d4ed8;',
            'Graduated' => 'background:#d1fae5;color:#047857;',
            'Dismissed' => 'background:#fef3c7;color:#b45309;',
            'Terminated' => 'background:#fee2e2;color:#b91c1c;',
            'Archived' => 'background:#f1f5f9;color:#64748b;',
        ];
        $style = $styles[$status] ?? 'background:#f1f5f9;color:#64748b;';
        $label = htmlspecialchars($locale->statusLabel($status), ENT_QUOTES, 'UTF-8');

        return "<span class=\"badge\" style=\"{$style}\">{$label}</span>";
    }

    private function categoryBadgeHtml(string $category, ExportLocale $locale): string
    {
        $styles = [
            'Excellent' => 'background:#059669;color:#fff;',
            'Good' => 'background:#6ee7b7;color:#065f46;',
            'Passable' => 'background:#d97706;color:#fff;',
            'Critical' => 'background:#dc2626;color:#fff;',
        ];
        $style = $styles[$category] ?? 'background:#64748b;color:#fff;';
        $label = htmlspecialchars($locale->categoryLabel($category), ENT_QUOTES, 'UTF-8');

        return "<span class=\"badge\" style=\"{$style}\">{$label}</span>";
    }

    private function filterSummaryHtml(array $filters, ExportLocale $locale): string
    {
        $active = array_filter($filters, fn ($value) => $value !== null && $value !== '' && $value !== 'All');

        if ($active === []) {
            return '';
        }

        $labels = [
            'q' => $locale->t('search'),
            'status' => $locale->t('statusHeader'),
            'gender' => $locale->t('gender'),
            'education_level' => $locale->t('education'),
            'category' => $locale->t('categoryHeader'),
            'promotion_id' => $locale->t('promotion'),
            'sort' => $locale->t('sortLabel'),
        ];

        $parts = [];
        foreach ($active as $key => $value) {
            $label = $labels[$key] ?? $key;
            $displayValue = $key === 'sort'
                ? $locale->sortLabel((string) $value)
                : ($key === 'status'
                    ? $locale->statusLabel((string) $value)
                    : ($key === 'category'
                        ? $locale->categoryLabel((string) $value)
                        : ($key === 'gender'
                            ? $locale->genderLabel((string) $value)
                            : $value)));
            $parts[] = htmlspecialchars("{$label}: {$displayValue}", ENT_QUOTES, 'UTF-8');
        }

        $filtersApplied = htmlspecialchars($locale->t('filtersApplied'), ENT_QUOTES, 'UTF-8');

        return ' · <strong>' . $filtersApplied . '</strong> ' . implode(' · ', $parts);
    }

    /** @return array<string, mixed> */
    private function localizedFilters(array $filters, ExportLocale $locale): array
    {
        $active = array_filter($filters, fn ($value) => $value !== null && $value !== '' && $value !== 'All');
        $result = [];

        foreach ($active as $key => $value) {
            $result[$key] = $key === 'sort'
                ? $locale->sortLabel((string) $value)
                : ($key === 'status'
                    ? $locale->statusLabel((string) $value)
                    : ($key === 'category'
                        ? $locale->categoryLabel((string) $value)
                        : ($key === 'gender'
                            ? $locale->genderLabel((string) $value)
                            : $value)));
        }

        return $result;
    }
}
