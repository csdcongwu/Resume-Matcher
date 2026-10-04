"""Integration tests for tracker interview-question records."""

from httpx import ASGITransport, AsyncClient

from app.main import app


def _client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def _seed_card(isolated_db, **kwargs):
    defaults = dict(job_id="job-1", resume_id="res-1", status="applied")
    defaults.update(kwargs)
    return await isolated_db.create_application(**defaults)


class TestInterviewQuestionsAPI:
    async def test_create_question_returns_application_company_and_role(self, isolated_db):
        card = await _seed_card(
            isolated_db,
            job_id="job-question",
            resume_id="resume-question",
            company="Acme Corp",
            role="Staff Engineer",
        )

        async with _client() as client:
            resp = await client.post(
                f"/api/v1/applications/{card['application_id']}/interview-questions",
                json={"question": "How would you improve our API reliability?"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["application_id"] == card["application_id"]
        assert body["company"] == "Acme Corp"
        assert body["role"] == "Staff Engineer"
        assert body["question"] == "How would you improve our API reliability?"
        assert body["question_id"]

    async def test_list_questions_returns_records_across_applications(self, isolated_db):
        first = await _seed_card(
            isolated_db,
            job_id="job-first",
            resume_id="resume-first",
            company="First Co",
            role="Backend Engineer",
        )
        second = await _seed_card(
            isolated_db,
            job_id="job-second",
            resume_id="resume-second",
            company="Second Co",
            role="Platform Engineer",
        )

        async with _client() as client:
            await client.post(
                f"/api/v1/applications/{first['application_id']}/interview-questions",
                json={"question": "First question"},
            )
            await client.post(
                f"/api/v1/applications/{second['application_id']}/interview-questions",
                json={"question": "Second question"},
            )
            resp = await client.get("/api/v1/applications/interview-questions")

        assert resp.status_code == 200
        body = resp.json()
        assert len(body) == 2
        assert {(item["company"], item["question"]) for item in body} == {
            ("First Co", "First question"),
            ("Second Co", "Second question"),
        }

    async def test_unknown_application_returns_404(self, isolated_db):
        async with _client() as client:
            resp = await client.post(
                "/api/v1/applications/missing/interview-questions",
                json={"question": "Question with no application"},
            )

        assert resp.status_code == 404

    async def test_blank_question_is_rejected(self, isolated_db):
        card = await _seed_card(isolated_db)

        async with _client() as client:
            resp = await client.post(
                f"/api/v1/applications/{card['application_id']}/interview-questions",
                json={"question": "   "},
            )

        assert resp.status_code == 422

    async def test_deleting_application_cascades_questions(self, isolated_db):
        card = await _seed_card(isolated_db)

        async with _client() as client:
            await client.post(
                f"/api/v1/applications/{card['application_id']}/interview-questions",
                json={"question": "Will be removed with the card"},
            )
            delete_resp = await client.delete(f"/api/v1/applications/{card['application_id']}")
            list_resp = await client.get("/api/v1/applications/interview-questions")

        assert delete_resp.status_code == 200
        assert list_resp.status_code == 200
        assert list_resp.json() == []
