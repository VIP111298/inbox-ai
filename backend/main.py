from fastapi.responses import RedirectResponse
from gmail import (
    get_authorization_url,
    get_credentials,
    get_recent_emails
)

import os
import json

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq

load_dotenv()

app = FastAPI(title="InboxAI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        FRONTEND_URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

user_credentials = None


class Email(BaseModel):
    sender: str
    subject: str
    body: str


class ChatRequest(BaseModel):
    question: str
    emails: list


SYSTEM_PROMPT = """
You are InboxAI, an intelligent email classification and analysis engine.

Analyze multiple emails and return ONLY valid JSON.

Return this exact structure:

{
  "emails": [
    {
      "id": "original email id",
      "category": "Career | College | Finance | Work | Security | OTP | Social | Newsletter | Promotion | Other",
      "subcategory": "specific type",
      "importance": 0.0,
      "requires_action": true,
      "action": "REPLY | PAY | REVIEW | KEEP | ARCHIVE | NONE",
      "deadline": "YYYY-MM-DD or null",
      "amount": null,
      "summary": "one short sentence",
      "reason": "short explanation"
    }
  ]
}

CATEGORY RULES:

Career:
Jobs, internships, placements, interviews, recruiters, hiring and career opportunities.

College:
University, college, exams, assignments, classes, faculty, results, attendance and academic notices.

Finance:
Banking, payments, bills, invoices, refunds, credit cards, loans, investments and financial transactions.

Work:
Workplace communication, meetings, clients, tasks and professional work.

Security:
Account security alerts, suspicious sign-ins, new device sign-ins, password changes, account recovery, login alerts and account protection.

OTP:
One-time passwords, verification codes, login codes and authentication codes.

Social:
Personal communication and social platform notifications.

Newsletter:
Newsletters, digests, informational updates and regular content subscriptions.

Promotion:
Marketing, discounts, sales, advertisements and shopping offers.

Other:
Use only when no other category clearly matches.

IMPORTANT:
- Google security alerts and new sign-in alerts must be Security.
- Login verification codes must be OTP.
- Job and internship emails must be Career.
- Bank and payment emails must be Finance.
- Promotional emails must be Promotion.
- Do not use Other when another category clearly matches.
- importance must be between 0 and 1.
- requires_action must be true or false.
- amount must be a number or null.
- deadline must be YYYY-MM-DD or null.
- Never invent information.
- Keep summaries short.
- Keep reasons short.
- Preserve every original email id exactly.
"""


@app.get("/")
def home():
    return {
        "message": "InboxAI Backend is running 🚀"
    }


@app.get("/test-groq")
def test_groq():

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": "You are GroqBot, an intelligent email assistant."
            },
            {
                "role": "user",
                "content": "Explain in one sentence what you can do for an email inbox."
            }
        ],
        temperature=0.2
    )

    return {
        "bot": response.choices[0].message.content
    }


@app.get("/auth/login")
def auth_login():

    authorization_url, state = get_authorization_url()

    return {
        "authorization_url": authorization_url,
        "state": state
    }


@app.get("/auth/callback")
def auth_callback(code: str):

    global user_credentials

    user_credentials = get_credentials(code)

    return RedirectResponse(
      url=f"{FRONTEND_URL}/?gmail=connected" 
    )


@app.get("/gmail/status")
def gmail_status():

    return {
        "connected": user_credentials is not None
    }


@app.get("/emails")
def get_emails():

    if user_credentials is None:
        return {
            "connected": False,
            "emails": []
        }

    emails = get_recent_emails(
        user_credentials,
        max_results=10
    )

    return {
        "connected": True,
        "count": len(emails),
        "emails": emails
    }


def analyze_inbox_with_groq(emails):

    email_context = ""

    for index, email in enumerate(emails, start=1):

        body = email.get("body", "")

        compact_body = body[:500]

        email_context += f"""
EMAIL {index}
ID: {email["id"]}
FROM: {email["sender"]}
SUBJECT: {email["subject"]}
BODY: {compact_body}
"""


    prompt = f"""
Analyze all emails below.

Return one analysis object for every email.

Do not skip any email.

{email_context}
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.1,
        response_format={
            "type": "json_object"
        }
    )

    result = json.loads(
        response.choices[0].message.content
    )

    return result.get("emails", [])


@app.get("/analyze-inbox")
def analyze_inbox():

    if user_credentials is None:
        return {
            "connected": False,
            "message": "Gmail not connected"
        }

    emails = get_recent_emails(
        user_credentials,
        max_results=10
    )

    if not emails:
        return {
            "connected": True,
            "count": 0,
            "emails": []
        }

    analyses = analyze_inbox_with_groq(emails)

    analysis_map = {
        item.get("id"): item
        for item in analyses
    }

    analyzed_emails = []

    for email in emails:

        analysis = analysis_map.get(
            email["id"],
            {
                "category": "Other",
                "subcategory": "Unknown",
                "importance": 0,
                "requires_action": False,
                "action": "NONE",
                "deadline": None,
                "amount": None,
                "summary": "Unable to analyze this email.",
                "reason": "AI analysis was unavailable."
            }
        )

        analyzed_emails.append({
            "id": email["id"],
            "sender": email["sender"],
            "subject": email["subject"],
            "body": email["body"],
            "analysis": analysis
        })

    return {
        "connected": True,
        "count": len(analyzed_emails),
        "emails": analyzed_emails
    }


@app.post("/analyze")
def analyze_email(email: Email):

    prompt = f"""
Analyze this email:

ID: manual-email

FROM:
{email.sender}

SUBJECT:
{email.subject}

BODY:
{email.body[:700]}
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.1,
        response_format={
            "type": "json_object"
        }
    )

    result = json.loads(
        response.choices[0].message.content
    )

    if "emails" in result and result["emails"]:
        return result["emails"][0]

    return result


@app.post("/chat")
def chat(request: ChatRequest):

    if not request.emails:
        return {
            "answer": "Please connect Gmail and analyze your inbox first."
        }

    inbox_context = ""

    for email in request.emails:

        analysis = email.get("analysis", {})

        inbox_context += f"""
EMAIL:
Sender: {email.get("sender", "")}
Subject: {email.get("subject", "")}
Summary: {analysis.get("summary", "")}
Category: {analysis.get("category", "")}
Importance: {analysis.get("importance", "")}
Requires Action: {analysis.get("requires_action", "")}
Action: {analysis.get("action", "")}
Deadline: {analysis.get("deadline", "")}
Amount: {analysis.get("amount", "")}
Reason: {analysis.get("reason", "")}
"""

    prompt = f"""
You are GroqBot, an AI email assistant.

Answer the user's question using ONLY the provided inbox data.

Be concise, clear and useful.

Do not invent emails or information.

USER QUESTION:
{request.question}

INBOX DATA:
{inbox_context}
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": "You are GroqBot, an intelligent inbox assistant."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2
    )

    return {
        "answer": response.choices[0].message.content
    }