#!/usr/bin/env python3
"""crypto-riddle シナリオ / 法制度データの検証スクリプト。

位置づけ:
    Issue #3 の受け入れ基準「サンプルデータが実際にスキーマに準拠しているかを検証できる」
    を満たすための暫定ツール。plan.md §4 が定める本番パイプライン(YAML -> zod 検証 -> JSON、
    T010 で Node/TypeScript 実装)が用意されるまでの代替であり、それが揃った時点で
    CI 上の正はそちらに一本化する(このスクリプトは開発時の手元検証・CI 移行までのつなぎとして残す)。

チェック内容:
    1. schemas/scenario.schema.json / schemas/legal.schema.json による構造検証(型・必須項目)
    2. スキーマだけでは表現できない参照整合性(セマンティックチェック):
       - シナリオ id とファイル名の一致
       - card / investigation_point の id 重複禁止
       - card.investigation_point_id が実在する investigation_point を指しているか
       - 各 investigation_point に紐づく card が最低1件あるか
       - attack_identification.required_card_ids が実在し、ダミーカードを含まないか
       - countermeasure.required_card_ids が実在し、type='対策' かつダミーでないか
       - resolution.legal_refs が legal/*.yaml 内の id として解決できるか
    3. (警告のみ) type='対策' のダミーカードが1件も無い場合に注意喚起する
       (spec §8.3「本質的でない対策を誤答肢に」を満たしているかの目安)

使い方:
    python3 -m venv .venv-validate
    .venv-validate/bin/pip install -r scripts/requirements.txt
    .venv-validate/bin/python scripts/validate_scenarios.py

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
SCENARIOS_DIR = REPO_ROOT / "scenarios"
LEGAL_DIR = REPO_ROOT / "legal"


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


def validate_structure(validator: Draft202012Validator, path: Path, data: Any, report: ValidationReport) -> None:
    for err in sorted(validator.iter_errors(data), key=lambda e: list(e.path)):
        location = "/".join(str(p) for p in err.path) or "(root)"
        report.error(f"{path.relative_to(REPO_ROOT)}: [{location}] {err.message}")


def validate_legal_files(legal_validator: Draft202012Validator, report: ValidationReport) -> set[str]:
    known_law_ids: set[str] = set()
    legal_files = load_yaml_files(LEGAL_DIR)
    if not legal_files:
        report.warn(f"{LEGAL_DIR.relative_to(REPO_ROOT)} に法制度データが見つかりません。")
        return known_law_ids

    for path, data in legal_files:
        validate_structure(legal_validator, path, data, report)
        if isinstance(data, dict):
            for law in data.get("laws", []) or []:
                if isinstance(law, dict) and "id" in law:
                    if law["id"] in known_law_ids:
                        report.error(f"{path.relative_to(REPO_ROOT)}: 法制度データ id 重複: {law['id']}")
                    known_law_ids.add(law["id"])
    return known_law_ids


def validate_scenario_semantics(path: Path, data: dict[str, Any], known_law_ids: set[str], report: ValidationReport) -> None:
    rel = path.relative_to(REPO_ROOT)

    scenario_id = data.get("id")
    if scenario_id and path.stem != scenario_id:
        report.error(f"{rel}: ファイル名 '{path.stem}' とシナリオ id '{scenario_id}' が一致しません。")

    cards = data.get("cards", []) or []
    investigation_points = data.get("investigation_points", []) or []

    card_ids: dict[str, dict[str, Any]] = {}
    for card in cards:
        cid = card.get("id")
        if cid in card_ids:
            report.error(f"{rel}: card id 重複: {cid}")
        else:
            card_ids[cid] = card

    point_ids: set[str] = set()
    for point in investigation_points:
        pid = point.get("id")
        if pid in point_ids:
            report.error(f"{rel}: investigation_point id 重複: {pid}")
        point_ids.add(pid)

    cards_per_point: dict[str, int] = {pid: 0 for pid in point_ids}
    for card in cards:
        ip_id = card.get("investigation_point_id")
        if ip_id not in point_ids:
            report.error(
                f"{rel}: card '{card.get('id')}' の investigation_point_id '{ip_id}' が"
                " investigation_points に存在しません。"
            )
        else:
            cards_per_point[ip_id] += 1

    for pid, count in cards_per_point.items():
        if count == 0:
            report.error(f"{rel}: investigation_point '{pid}' に紐づく card がありません。")

    resolution = data.get("resolution", {}) or {}

    attack = resolution.get("attack_identification", {}) or {}
    for cid in attack.get("required_card_ids", []) or []:
        card = card_ids.get(cid)
        if card is None:
            report.error(f"{rel}: attack_identification.required_card_ids の '{cid}' が cards に存在しません。")
        elif card.get("is_dummy"):
            report.error(f"{rel}: attack_identification.required_card_ids の '{cid}' はダミーカードです(is_dummy=true)。")

    countermeasure = resolution.get("countermeasure", {}) or {}
    for cid in countermeasure.get("required_card_ids", []) or []:
        card = card_ids.get(cid)
        if card is None:
            report.error(f"{rel}: countermeasure.required_card_ids の '{cid}' が cards に存在しません。")
        else:
            if card.get("is_dummy"):
                report.error(f"{rel}: countermeasure.required_card_ids の '{cid}' はダミーカードです(is_dummy=true)。")
            if card.get("type") != "対策":
                report.error(
                    f"{rel}: countermeasure.required_card_ids の '{cid}' は type='対策' ではありません"
                    f"(実際: {card.get('type')!r})。"
                )

    countermeasure_dummy_exists = any(
        c.get("type") == "対策" and c.get("is_dummy") for c in cards
    )
    if not countermeasure_dummy_exists:
        report.warn(
            f"{rel}: type='対策' のダミーカードが見つかりません。"
            " spec §8.3(本質的でない対策を誤答肢に)を満たしているか確認してください。"
        )

    for legal_id in resolution.get("legal_refs", []) or []:
        if legal_id not in known_law_ids:
            report.error(f"{rel}: legal_refs の '{legal_id}' が legal/*.yaml 内に見つかりません。")


def main() -> int:
    scenario_schema = load_schema("scenario.schema.json")
    legal_schema = load_schema("legal.schema.json")

    scenario_validator = Draft202012Validator(scenario_schema)
    legal_validator = Draft202012Validator(legal_schema)

    report = ValidationReport()

    known_law_ids = validate_legal_files(legal_validator, report)

    scenario_files = load_yaml_files(SCENARIOS_DIR)
    if not scenario_files:
        report.warn(f"{SCENARIOS_DIR.relative_to(REPO_ROOT)} にシナリオが見つかりません。")

    for path, data in scenario_files:
        validate_structure(scenario_validator, path, data, report)
        if isinstance(data, dict):
            validate_scenario_semantics(path, data, known_law_ids, report)

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

    print(f"OK: {len(scenario_files)} 件のシナリオ、{len(known_law_ids)} 件の法制度データが検証を通過しました。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
