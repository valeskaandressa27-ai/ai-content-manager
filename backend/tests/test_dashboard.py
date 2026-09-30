from tests.helpers import campaign_payload, content_payload, generate_payload


def test_dashboard_empty_state(client, user_a):
    body = client.get("/api/dashboard", headers=user_a).json()
    assert body["totals"] == {"contents": 0, "saved_contents": 0, "campaigns": 0, "generations": 0}
    assert body["contents_by_type"] == []
    assert body["recent_generations"] == []
    assert body["recent_activity"] == []
    assert len(body["usage_last_days"]) == 14
    assert all(day["count"] == 0 for day in body["usage_last_days"])
    assert body["usage"]["used_today"] == 0


def test_dashboard_reflects_real_data(client, user_a, fake_ai):
    client.post("/api/contents", headers=user_a, json=content_payload(type="email", status="saved"))
    client.post("/api/contents", headers=user_a, json=content_payload(type="email", status="draft"))
    client.post("/api/contents", headers=user_a, json=content_payload(type="ad", status="saved"))
    client.post("/api/campaigns", headers=user_a, json=campaign_payload())
    client.post("/api/ai/generate", headers=user_a, json=generate_payload())
    client.post("/api/ai/generate", headers=user_a, json=generate_payload(content_type="email"))

    body = client.get("/api/dashboard", headers=user_a).json()
    assert body["totals"] == {"contents": 3, "saved_contents": 2, "campaigns": 1, "generations": 2}
    assert body["contents_by_type"][0] == {"type": "email", "count": 2}
    assert {"type": "ad", "count": 1} in body["contents_by_type"]
    assert body["usage"]["used_today"] == 2
    assert body["usage_last_days"][-1]["count"] == 2  # hoje é o último dia
    assert len(body["recent_generations"]) == 2
    assert {item["kind"] for item in body["recent_activity"]} == {"content", "campaign"}


def test_failed_generations_do_not_appear_in_dashboard(client, user_a, fake_ai):
    from app.core.errors import AITimeoutError

    fake_ai.error = AITimeoutError()
    client.post("/api/ai/generate", headers=user_a, json=generate_payload())
    body = client.get("/api/dashboard", headers=user_a).json()
    assert body["totals"]["generations"] == 0
    assert body["recent_generations"] == []
