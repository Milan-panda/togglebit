import hashlib

PERCENTAGE_FLAG_TYPES = frozenset({"percentage", "combined"})


def requires_user_id(flag_type: str) -> bool:
    return flag_type in PERCENTAGE_FLAG_TYPES


def normalize_user_id(user_id: str | None) -> str | None:
    if user_id is None:
        return None
    stripped = user_id.strip()
    return stripped or None


def evaluate(
    config: dict,
    flag_key: str,
    user_id: str | None,
    user_context: dict,
) -> tuple[bool, str]:
    """Evaluate a flag config. Returns (enabled, reason)."""
    enabled, reason, _ = _evaluate(config, flag_key, user_id, user_context)
    return enabled, reason


def evaluate_debug(
    config: dict,
    flag_key: str,
    user_id: str | None,
    user_context: dict,
) -> tuple[bool, str, dict]:
    """Evaluate a flag config with debug details for the dashboard test tool."""
    return _evaluate(config, flag_key, user_id, user_context)


def _rollout_bucket(flag_key: str, user_id: str) -> int:
    seed = f"{flag_key}:{user_id}"
    return int(hashlib.md5(seed.encode()).hexdigest()[:8], 16) % 100


def _evaluate(
    config: dict,
    flag_key: str,
    user_id: str | None,
    user_context: dict,
) -> tuple[bool, str, dict]:
    if not config["enabled"]:
        return False, "flag_disabled", {
            "summary": "Flag is off for this environment.",
        }

    flag_type = config["type"]
    resolved_user_id = normalize_user_id(user_id)
    if requires_user_id(flag_type) and not resolved_user_id:
        return False, "user_id_required", {
            "summary": (
                "This flag uses percentage rollout. "
                "Provide a userId for consistent bucketing."
            ),
        }

    match flag_type:
        case "boolean":
            return True, "boolean", {
                "summary": "Boolean flag is on for everyone in this environment.",
            }

        case "percentage":
            bucket = _rollout_bucket(flag_key, resolved_user_id)
            rollout_pct = config["rollout_pct"]
            hit = bucket < rollout_pct
            return hit, "percentage_rollout", {
                "summary": (
                    f"User bucket {bucket}/100 is "
                    f"{'below' if hit else 'at or above'} the {rollout_pct}% rollout, "
                    f"so the flag is {'on' if hit else 'off'}."
                ),
                "bucket": bucket,
                "rollout_pct": rollout_pct,
            }

        case "segment":
            rules = config.get("rules") or []
            if not rules:
                return True, "segment_match", {
                    "summary": "No targeting rules configured, so everyone matches.",
                }
            rule_results = [_rule_result(rule, user_context) for rule in rules]
            for result in rule_results:
                if not result["matched"]:
                    return False, "segment_no_match", {
                        "summary": f"Rule failed: {result['label']}.",
                        "rules": rule_results,
                    }
            return True, "segment_match", {
                "summary": "All targeting rules matched.",
                "rules": rule_results,
            }

        case "combined":
            rules = config.get("rules") or []
            rule_results = [_rule_result(rule, user_context) for rule in rules]
            for result in rule_results:
                if not result["matched"]:
                    return False, "segment_no_match", {
                        "summary": f"Rule failed: {result['label']}.",
                        "rules": rule_results,
                    }

            bucket = _rollout_bucket(flag_key, resolved_user_id)
            rollout_pct = config["rollout_pct"]
            hit = bucket < rollout_pct
            reason = "segment_and_percentage"
            return hit, reason, {
                "summary": (
                    "All targeting rules matched. "
                    f"User bucket {bucket}/100 is "
                    f"{'below' if hit else 'at or above'} the {rollout_pct}% rollout, "
                    f"so the flag is {'on' if hit else 'off'}."
                ),
                "rules": rule_results,
                "bucket": bucket,
                "rollout_pct": rollout_pct,
            }

        case _:
            return False, "unknown_type", {
                "summary": f"Unknown flag type: {config['type']}.",
            }


def _rule_result(rule: dict, ctx: dict) -> dict:
    val = ctx.get(rule["attribute"])
    expected = rule["value"]
    matched = _match_rule(rule, ctx)
    return {
        "attribute": rule["attribute"],
        "operator": rule["operator"],
        "expected": expected,
        "actual": val,
        "matched": matched,
        "label": (
            f"{rule['attribute']} {rule['operator']} {expected!r} "
            f"(actual: {val!r}) → {'pass' if matched else 'fail'}"
        ),
    }


def _match_rule(rule: dict, ctx: dict) -> bool:
    val = ctx.get(rule["attribute"])
    expected = rule["value"]

    match rule["operator"]:
        case "eq":
            return val == expected
        case "neq":
            return val != expected
        case "in":
            return val in expected
        case "not_in":
            return val not in expected
        case "contains":
            return expected in str(val or "")
        case "gt":
            return float(val or 0) > float(expected)
        case "lt":
            return float(val or 0) < float(expected)
        case _:
            return False
