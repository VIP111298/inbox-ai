import os
import base64

from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build


SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly"
]

REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:8000/auth/callback"
)

credentials_file = "/etc/secrets/credentials.json"


# Hackathon MVP: keep OAuth flow in memory
oauth_flow = None


def create_flow():
    flow = Flow.from_client_secrets_file(
        credentials_file,
        scopes=SCOPES
    )

    flow.redirect_uri = REDIRECT_URI

    return flow


def get_authorization_url():

    global oauth_flow

    oauth_flow = create_flow()

    authorization_url, state = oauth_flow.authorization_url(
        access_type="offline"
    )

    return authorization_url, state


def get_credentials(code):

    global oauth_flow

    if oauth_flow is None:
        raise Exception("OAuth flow expired. Please login again.")

    oauth_flow.fetch_token(
        code=code
    )

    return oauth_flow.credentials


def get_gmail_service(credentials):

    return build(
        "gmail",
        "v1",
        credentials=credentials
    )


def decode_body(data):

    return base64.urlsafe_b64decode(
        data.encode("UTF-8")
    ).decode(
        "UTF-8",
        errors="ignore"
    )


def extract_body(payload):

    if "body" in payload and payload["body"].get("data"):
        return decode_body(
            payload["body"]["data"]
        )

    for part in payload.get("parts", []):

        if part["mimeType"] == "text/plain":

            if part["body"].get("data"):
                return decode_body(
                    part["body"]["data"]
                )

        if "parts" in part:

            result = extract_body(part)

            if result:
                return result

    return ""


def get_recent_emails(credentials, max_results=10):

    service = get_gmail_service(credentials)

    response = service.users().messages().list(
        userId="me",
        maxResults=max_results,
        labelIds=["INBOX"]
    ).execute()

    messages = response.get("messages", [])

    emails = []

    for message in messages:

        data = service.users().messages().get(
            userId="me",
            id=message["id"],
            format="full"
        ).execute()

        payload = data.get("payload", {})
        headers = payload.get("headers", [])

        sender = ""
        subject = ""

        for header in headers:

            if header["name"].lower() == "from":
                sender = header["value"]

            if header["name"].lower() == "subject":
                subject = header["value"]

        body = extract_body(payload)

        emails.append({
            "id": message["id"],
            "sender": sender,
            "subject": subject,
            "body": body
        })

    return emails