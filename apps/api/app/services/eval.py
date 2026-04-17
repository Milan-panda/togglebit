import hashlib


def evaluate(
    config: dict,
    flag_key: str,
    user_id: str,
    user_context: dict,
) -> tuple[bool, str]:
    """Evaluate a flag config. Returns (enabled, reason)."""
    if not config["enabled"]:
        return False, "flag_disabled"

    match config["type"]:
        case "boolean":
            return True, "boolean"

        case "percentage":
            seed = f"{flag_key}:{user_id}"
            bucket = int(hashlib.md5(seed.encode()).hexdigest()[:8], 16) % 100
            hit = bucket < config["rollout_pct"]
            return hit, "percentage_rollout"

        case "segment":
            rules = config.get("rules") or []
            if not rules:
                return True, "segment_match"
            for rule in rules:
                if not _match_rule(rule, user_context):
                    return False, "segment_no_match"
            return True, "segment_match"

        case "combined":
            rules = config.get("rules") or []
            for rule in rules:
                if not _match_rule(rule, user_context):
                    return False, "segment_no_match"

            seed = f"{flag_key}:{user_id}"
            bucket = int(hashlib.md5(seed.encode()).hexdigest()[:8], 16) % 100
            hit = bucket < config["rollout_pct"]
            return hit, "segment_and_percentage"

        case _:
            return False, "unknown_type"


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
