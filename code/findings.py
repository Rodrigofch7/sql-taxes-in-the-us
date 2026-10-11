#!/usr/bin/env python
"""Turn the written findings into text whose numbers come from the database.

Usage:
    python code/findings.py        # print every finding as it would be published

Each entry in data/metadata/findings.json is a claim plus the query behind it:

    {
      "id":       "short-slug",
      "headline": "Text with {placeholders}",
      "body":     "More text with {placeholders:pct1}",
      "sql":      "SELECT ... AS some_value, <condition> AS holds"
    }

The query must return exactly one row. Its `holds` column says whether the
claim is still true; every other column can be used as a placeholder. Nothing
in the text is typed in by hand, so a data refresh updates the numbers, and a
finding that has stopped being true fails the build instead of going stale.

A finding may also carry a "chart": a chart type, its labels, and a second
query whose rows are the data drawn (see web/report-charts.js for the row shape
each type expects). The chart's own text can use the same placeholders.

Placeholder formats: pct0, pct1, pct2 (0.123 -> 12%), usd, int, num1, x1 (3.4x),
signed0 (+12%). With no format the value is inserted as is.
"""
import json
import math
import re
import sys

import duckdb

DB_PATH = "data/processed/acs.duckdb"
FINDINGS_PATH = "data/metadata/findings.json"

FORMATS = {
    "pct0": lambda v: f"{100 * v:.0f}%",
    "pct1": lambda v: f"{100 * v:.1f}%",
    "pct2": lambda v: f"{100 * v:.2f}%",
    "signed0": lambda v: f"{100 * v:+.0f}%",
    "usd": lambda v: f"${v:,.0f}",
    "int": lambda v: f"{v:,.0f}",
    "num1": lambda v: f"{v:,.1f}",
    "x1": lambda v: f"{v:.1f}×",
}
PLACEHOLDER = re.compile(r"\{(\w+)(?::(\w+))?\}")


def fill(template, values, finding_id):
    def replace(match):
        name, fmt = match.groups()
        if name not in values:
            raise ValueError(f"{finding_id}: text uses {{{name}}} but the query has no such column")
        value = values[name]
        if value is None:
            raise ValueError(f"{finding_id}: {name} is NULL")
        if fmt is None:
            return str(value)
        if fmt not in FORMATS:
            raise ValueError(f"{finding_id}: unknown format {fmt!r}")
        return FORMATS[fmt](value)

    return PLACEHOLDER.sub(replace, template)


def compact(value):
    """Six significant digits: plenty for a chart, and a much smaller file."""
    if isinstance(value, float):
        return None if math.isnan(value) or math.isinf(value) else float(f"{value:.6g}")
    return value


def render_chart(con, chart, values, finding_id):
    cursor = con.execute(chart["sql"])
    columns = [d[0] for d in cursor.description]
    rows = [dict(zip(columns, map(compact, row))) for row in cursor.fetchall()]
    if not rows:
        raise ValueError(f"{finding_id}: chart query returned no rows")

    def text(value):
        if isinstance(value, str):
            return fill(value, values, finding_id)
        if isinstance(value, dict):
            return {k: text(v) for k, v in value.items()}
        return value

    spec = {k: text(v) for k, v in chart.items() if k != "sql"}
    return {**spec, "rows": rows}


def render_findings(con, path=FINDINGS_PATH):
    """Return the findings ready to publish; raise if any no longer holds."""
    with open(path) as f:
        findings = json.load(f)

    rendered = []
    for finding in findings:
        cursor = con.execute(finding["sql"])
        rows = cursor.fetchall()
        if len(rows) != 1:
            raise ValueError(f"{finding['id']}: query returned {len(rows)} rows, expected 1")
        values = dict(zip([d[0] for d in cursor.description], rows[0]))
        if values.get("holds") is not True:
            raise ValueError(f"{finding['id']}: no longer holds ({values}); rewrite or remove it")
        item = {
            "id": finding["id"],
            "kicker": finding.get("kicker", ""),
            "headline": fill(finding["headline"], values, finding["id"]),
            "body": fill(finding["body"], values, finding["id"]),
            "sql": finding["sql"],
        }
        if "chart" in finding:
            item["chart"] = render_chart(con, finding["chart"], values, finding["id"])
        rendered.append(item)
    return rendered


def main():
    con = duckdb.connect(DB_PATH, read_only=True)
    try:
        findings = render_findings(con)
    except ValueError as e:
        sys.exit(f"FAILED  {e}")
    for finding in findings:
        print(f"\n## {finding['headline']}\n{finding['body']}")
        if "chart" in finding:
            chart = finding["chart"]
            print(f"   [chart: {chart['type']}, {len(chart['rows'])} rows] {chart['title']}")
    print(f"\n{len(findings)} findings hold.")


if __name__ == "__main__":
    main()
