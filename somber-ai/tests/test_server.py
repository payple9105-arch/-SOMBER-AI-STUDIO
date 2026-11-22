"""Pruebas de la API sin red: Supabase, fal.ai y Claude están simulados."""

import json
import unittest
from types import SimpleNamespace
from unittest import mock

from fastapi import HTTPException
from fastapi.testclient import TestClient

import server

JOB = "11111111-2222-3333-4444-555555555555"
USER = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
AUTH = {"Authorization": "Bearer token-de-prueba"}


class FakeDB:
    """Imita las funciones server_* de Supabase."""

    def __init__(self, charged: bool = True) -> None:
        self.charged = charged
        self.claimed = False
        self.request_id: str | None = None
        self.refunds = 0
        self.calls: list[str] = []

    async def rpc(self, name, args):
        self.calls.append(name)
        if name == "server_claim_job":
            if self.charged and not self.claimed:
                self.claimed = True
                return True
            return False
        if name == "server_set_request":
            self.request_id = args["p_request_id"]
            return None
        if name == "server_refund_job":
            if self.request_id is not None and args["p_request_id"] != self.request_id:
                return False
            if self.refunds:
                return False
            self.refunds += 1
            return True
        raise AssertionError(name)


async def fake_user(_request):
    return USER


async def no_user(_request):
    raise HTTPException(status_code=401, detail="Inicia sesión")


def body(**extra):
    data = {"text": "un gato samurái bajo la lluvia", "aspect": "9:16", "duration_sec": 5, "job_id": JOB}
    data.update(extra)
    return data


class GenerateTests(unittest.TestCase):
    def setUp(self) -> None:
        server._hits.clear()
        server._enhance_hits.clear()
        self.db = FakeDB()
        self.patches = [
            mock.patch.object(server, "FAL_KEY", "fal-test"),
            mock.patch.object(server, "SUPABASE_SERVICE_KEY", "service-test"),
            mock.patch.object(server, "_current_user", fake_user),
            mock.patch.object(server, "_rpc", self.db.rpc),
        ]
        for p in self.patches:
            p.start()
        self.client = TestClient(server.app)

    def tearDown(self) -> None:
        for p in self.patches:
            p.stop()

    def test_requires_login(self) -> None:
        with mock.patch.object(server, "_current_user", no_user):
            r = self.client.post("/generate", json=body())
        self.assertEqual(r.status_code, 401)
        self.assertNotIn("server_claim_job", self.db.calls)

    def test_requires_job_id(self) -> None:
        data = body()
        del data["job_id"]
        self.assertEqual(self.client.post("/generate", json=data, headers=AUTH).status_code, 422)

    def test_unpaid_job_is_rejected(self) -> None:
        self.db.charged = False
        with mock.patch.object(server, "_start_fal") as fal:
            r = self.client.post("/generate", json=body(), headers=AUTH)
        self.assertEqual(r.status_code, 402)
        fal.assert_not_called()

    def test_job_cannot_be_reused(self) -> None:
        async def ok(_req):
            return "req-1"

        with mock.patch.object(server, "_start_fal", ok):
            first = self.client.post("/generate", json=body(), headers=AUTH)
            second = self.client.post("/generate", json=body(), headers=AUTH)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()["request_id"], "req-1")
        self.assertNotIn("status_url", first.json())
        self.assertEqual(self.db.request_id, "req-1")
        self.assertEqual(second.status_code, 402)

    def test_fal_failure_refunds(self) -> None:
        async def fail(_req):
            raise HTTPException(status_code=502, detail="rechazado")

        with mock.patch.object(server, "_start_fal", fail):
            r = self.client.post("/generate", json=body(), headers=AUTH)
        self.assertEqual(r.status_code, 502)
        self.assertEqual(self.db.refunds, 1)

    def test_missing_service_key(self) -> None:
        with mock.patch.object(server, "SUPABASE_SERVICE_KEY", None):
            r = self.client.post("/generate", json=body(), headers=AUTH)
        self.assertEqual(r.status_code, 503)


class FakeFal:
    def __init__(self, status: str) -> None:
        self.status = status

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, url, headers=None):
        if url.endswith("/status"):
            return SimpleNamespace(status_code=200, json=lambda: {"status": self.status})
        return SimpleNamespace(status_code=200, json=lambda: {"video": {"url": "https://v/x.mp4"}})


class StatusTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = FakeDB()
        self.db.claimed = True
        self.db.request_id = "req-1"
        self.patches = [
            mock.patch.object(server, "FAL_KEY", "fal-test"),
            mock.patch.object(server, "SUPABASE_SERVICE_KEY", "service-test"),
            mock.patch.object(server, "_current_user", fake_user),
            mock.patch.object(server, "_rpc", self.db.rpc),
        ]
        for p in self.patches:
            p.start()
        self.client = TestClient(server.app)

    def tearDown(self) -> None:
        for p in self.patches:
            p.stop()

    def poll(self, status: str, rid: str = "req-1"):
        with mock.patch.object(server.httpx, "AsyncClient", lambda **_: FakeFal(status)):
            return self.client.get(f"/generate/{rid}", params={"job_id": JOB}, headers=AUTH)

    def test_failed_generation_refunds_once(self) -> None:
        self.assertTrue(self.poll("FAILED").json()["reembolsado"])
        self.assertFalse(self.poll("FAILED").json()["reembolsado"])
        self.assertEqual(self.db.refunds, 1)

    def test_other_request_id_cannot_refund(self) -> None:
        self.assertFalse(self.poll("FAILED", rid="req-ajeno").json()["reembolsado"])
        self.assertEqual(self.db.refunds, 0)

    def test_completed_returns_video(self) -> None:
        r = self.poll("COMPLETED").json()
        self.assertEqual(r["video_url"], "https://v/x.mp4")
        self.assertEqual(self.db.refunds, 0)


def claude_reply(payload: dict, stop_reason: str = "end_turn"):
    return SimpleNamespace(
        stop_reason=stop_reason,
        content=[SimpleNamespace(type="text", text=json.dumps(payload))],
    )


class EnhanceTests(unittest.TestCase):
    def setUp(self) -> None:
        server._enhance_hits.clear()
        self.create = mock.AsyncMock(
            return_value=claude_reply(
                {"prompt": "A samurai cat in the rain, slow dolly-in...", "titulo": "Gato samurái", "explicacion": "Añadí cámara y luz."}
            )
        )
        fake_claude = SimpleNamespace(beta=SimpleNamespace(messages=SimpleNamespace(create=self.create)))
        self.patches = [
            mock.patch.object(server, "_claude", fake_claude),
            mock.patch.object(server, "_current_user", fake_user),
        ]
        for p in self.patches:
            p.start()
        self.client = TestClient(server.app)

    def tearDown(self) -> None:
        for p in self.patches:
            p.stop()

    def test_enhance_ok(self) -> None:
        r = self.client.post("/enhance", json={"idea": "gato samurái lluvia", "style": "Anime", "mode": "anime"}, headers=AUTH)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["titulo"], "Gato samurái")
        kwargs = self.create.call_args.kwargs
        self.assertEqual(kwargs["model"], "claude-opus-5-5")
        self.assertEqual(kwargs["fallbacks"], "default")
        self.assertEqual(kwargs["output_config"]["format"]["type"], "json_schema")
        self.assertIn("<idea>\ngato samurái lluvia\n</idea>", kwargs["messages"][0]["content"])

    def test_enhance_requires_login(self) -> None:
        with mock.patch.object(server, "_current_user", no_user):
            r = self.client.post("/enhance", json={"idea": "gato samurái"})
        self.assertEqual(r.status_code, 401)
        self.create.assert_not_called()

    def test_refusal(self) -> None:
        self.create.return_value = claude_reply({}, stop_reason="refusal")
        r = self.client.post("/enhance", json={"idea": "algo"}, headers=AUTH)
        self.assertEqual(r.status_code, 422)

    def test_rate_limit(self) -> None:
        with mock.patch.object(server, "ENHANCE_LIMIT", 2):
            codes = [self.client.post("/enhance", json={"idea": "gato samurái"}, headers=AUTH).status_code for _ in range(3)]
        self.assertEqual(codes, [200, 200, 429])

    def test_not_configured(self) -> None:
        with mock.patch.object(server, "_claude", None):
            r = self.client.post("/enhance", json={"idea": "gato samurái"}, headers=AUTH)
        self.assertEqual(r.status_code, 503)


if __name__ == "__main__":
    unittest.main()
