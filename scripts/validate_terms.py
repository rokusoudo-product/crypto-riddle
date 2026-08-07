#!/usr/bin/env python3
"""crypto-riddle 用語カードマスタ / 誤用検出クイズデータの検証スクリプト。

位置づけ:
    Issue #4 の受け入れ基準(用語カードマスタが定義され、初期セットがコミットされている)
    を満たすための検証ツール。plan.md §4 が定める本番パイプライン(YAML -> zod 検証 -> JSON、
    T010 で Node/TypeScript 実装)が用意されるまでの代替であり、それが揃った時点で
    CI 上の正はそちらに一本化する(scripts/validate_scenarios.py, Issue #3 と同じ位置づけ)。

チェック内容:
    1. schemas/term_card.schema.json / schemas/quiz_misuse.schema.json による
       構造検証(型・必須項目・条件付き必須項目)
    2. スキーマだけでは表現できない参照整合性(セマンティックチェック):
       - 用語カード id の重複禁止(全 terms/*.yaml 横断)
       - 用語カード id とファイル内の重複、および用語カードマスタ内での related_terms の実在確認
         (自己参照は id が実在する必要がある。has term references itself は禁止)
       - 誤用検出クイズ id の重複禁止
       - 誤用検出クイズ term_id / confused_with_term_id が用語カードマスタに実在するか
       - 誤用検出クイズ term_id と confused_with_term_id が同一でないか(自分自身と混同はしない)

使い方:
    python3 -m venv .venv-validate
    .venv-validate/bin/pip install -r scripts/requirements.txt
    .venv-validate/bin/python scripts/validate_terms.py

終了コード:
    0 = 全ファイルが検証を通過
    1 = 1件以上のエラー(構造 or 参照整合性)がある
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover
    print("pyyaml が見つかりません。scripts/requirements.txt を参照してインストールしてください。", file=sys.stderr)
    sys.exit(2)

try:
    from jsonschema import Draft202012Validator
except ImportError:  # pragma: no cover
    print("jsonschema が見つかりません。scripts/requirements.txt を参照してインストールしてください。", file=sys.stderr)
    sys.exit(2)

REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMAS_DIR = REPO_ROOT / "schemas"
TERMS_DIR = REPO_ROOT / "terms"


class ValidationReport:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, msg: str) -> None:
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    @property
    def ok(self) -> bool:
        return not self.errors


def load_schema(name: str) -> dict[str, Any]:
    path = SCHEMAS_DIR / name
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_yaml_files(directory: Path) -> list[tuple[Path, Any]]:
    if not directory.exists():
        return []
    files = sorted(directory.glob("*.yaml")) + sorted(directory.glob("*.yml"))
    loaded = []
    for path in files:
        with path.open("r", encoding="utf-8") as f:
            loaded.append((path, yaml.safe_load(f)))
    return loaded


def validate_structure(validator: Draft202012Validator, path: Path, data: Any, report: ValidationReport, item_label: str = "") -> None:
    prefix = f"{item_label} " if item_label else ""
    for err in sorted(validator.iter_errors(data), key=lambda e: list(e.path)):
        location = "/".join(str(p) for p in err.path) or "(root)"
        report.error(f"{path.relative_to(REPO_ROOT)}: {prefix}[{location}] {err.message}")


def collect_terms(term_validator: Draft202012Validator, report: ValidationReport) -> dict[str, dict[str, Any]]:
    """terms/*.yaml (schema_version + terms: [...]) を読み込み、用語カードごとに構造検証する。"""
    known_terms: dict[str, dict[str, Any]] = {}
    term_files = [p for p in TERMS_DIR.glob("*.yaml") if "quiz" not in p.stem] + [
        p for p in TERMS_DIR.glob("*.yml") if "quiz" not in p.stem
    ]
    if not term_files:
        report.warn(f"{TERMS_DIR.relative_to(REPO_ROOT)} に用語カードファイルが見つかりません。")
        return known_terms

    for path in sorted(term_files):
        with path.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        if not isinstance(data, dict) or "terms" not in data:
            report.error(f"{path.relative_to(REPO_ROOT)}: 'terms' キーを持つオブジェクトではありません。")
            continue

        for i, term in enumerate(data.get("terms") or []):
            validate_structure(term_validator, path, term, report, item_label=f"terms[{i}]")
            if not isinstance(term, dict):
                continue
            tid = term.get("id")
            if not tid:
                continue
            if tid in known_terms:
                report.error(f"{path.relative_to(REPO_ROOT)}: 用語カード id 重複: {tid}")
            else:
                known_terms[tid] = term

    return known_terms


def validate_term_references(known_terms: dict[str, dict[str, Any]], report: ValidationReport) -> None:
    for tid, term in known_terms.items():
        for ref in term.get("related_terms", []) or []:
            if ref == tid:
                report.error(f"terms: 用語カード '{tid}' の related_terms が自分自身を参照しています。")
            elif ref not in known_terms:
                report.error(f"terms: 用語カード '{tid}' の related_terms '{ref}' がマスタ内に見つかりません。")


def collect_quiz_items(
    quiz_validator: Draft202012Validator, known_terms: dict[str, dict[str, Any]], report: ValidationReport
) -> list[str]:
    quiz_ids: list[str] = []
    quiz_files = list(TERMS_DIR.glob("*quiz*.yaml")) + list(TERMS_DIR.glob("*quiz*.yml"))

    for path in sorted(quiz_files):
        with path.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        if not isinstance(data, dict) or "quiz_items" not in data:
            report.error(f"{path.relative_to(REPO_ROOT)}: 'quiz_items' キーを持つオブジェクトではありません。")
            continue

        seen_ids: set[str] = set()
        for i, item in enumerate(data.get("quiz_items") or []):
            validate_structure(quiz_validator, path, item, report, item_label=f"quiz_items[{i}]")
            if not isinstance(item, dict):
                continue

            qid = item.get("id")
            if qid:
                if qid in seen_ids:
                    report.error(f"{path.relative_to(REPO_ROOT)}: クイズ id 重複: {qid}")
                seen_ids.add(qid)
                quiz_ids.append(qid)

            term_id = item.get("term_id")
            if term_id and term_id not in known_terms:
                report.error(f"{path.relative_to(REPO_ROOT)}: quiz '{qid}' の term_id '{term_id}' が用語カードマスタに見つかりません。")

            confused_id = item.get("confused_with_term_id")
            if confused_id:
                if confused_id not in known_terms:
                    report.error(
                        f"{path.relative_to(REPO_ROOT)}: quiz '{qid}' の confused_with_term_id '{confused_id}'"
                        " が用語カードマスタに見つかりません。"
                    )
                if confused_id == term_id:
                    report.error(f"{path.relative_to(REPO_ROOT)}: quiz '{qid}' の confused_with_term_id が term_id と同一です。")

    return quiz_ids


def main() -> int:
    term_schema = load_schema("term_card.schema.json")
    quiz_schema = load_schema("quiz_misuse.schema.json")

    term_validator = Draft202012Validator(term_schema)
    quiz_validator = Draft202012Validator(quiz_schema)

    report = ValidationReport()

    known_terms = collect_terms(term_validator, report)
    validate_term_references(known_terms, report)
    quiz_ids = collect_quiz_items(quiz_validator, known_terms, report)

    if report.warnings:
        print("警告:")
        for w in report.warnings:
            print(f"  - {w}")

    if report.errors:
        print("エラー:")
        for e in report.errors:
            print(f"  - {e}")
        print(f"\n{len(report.errors)} 件のエラーがあります。")
        return 1

    print(f"OK: {len(known_terms)} 件の用語カード、{len(quiz_ids)} 件の誤用検出クイズが検証を通過しました。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
