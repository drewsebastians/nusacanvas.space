# Batch 2 Import Privacy Threat Model

Status: planning contract, no runtime import code yet.

## Assets To Protect

- spreadsheet contents;
- local filenames;
- project JSON contents;
- row-level region, value, source, and period text;
- raw parser errors that may include cell content.

## Threats

| Threat | Mitigation |
|---|---|
| Imported rows sent to a server | Import, matching, visualization, and export network requests are forbidden by budget and tests. |
| Local filename exposed | Imported source labels must be generic or user-edited; telemetry is absent. |
| Formula-like text executed | Spreadsheet formulas remain strings; downloaded CSV reports must escape formula prefixes. |
| Oversized file freezes browser | Hard byte, row, column, cell, and cell-length limits reject early. |
| XLSX zip bomb | Prompt 3 must enforce compressed/uncompressed/entry-count limits before parsing cells. |
| Raw content leaked in console/error logs | Errors use codes and counts; raw rows stay in local preview/error report only. |
| Malformed project pollutes objects | Runtime validators reject prototype-pollution structures and unsupported schema versions. |

## Non-Goals

Browser-side limits are not a perfect malware sandbox. The app remains a static local-processing tool, not a secure document forensics environment.
