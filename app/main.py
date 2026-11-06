
import os
import json
import logging
import sqlite3

from pathlib import Path
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from google import genai
from google.genai import types

# --------------------------------------------------
# Configuration
# --------------------------------------------------

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "bills.db"

app = FastAPI(title="Bill Snap")

API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=API_KEY) if API_KEY else None

# Use the model name available to your Gemini API account.
MODEL_NAME = "gemini-3.1-flash-lite"

app.mount(
    "/static",
    StaticFiles(directory=str(BASE_DIR / "static")),
    name="static"
)

# --------------------------------------------------
# Database
# --------------------------------------------------

def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():

    with get_connection() as connection:

        connection.execute("""
            CREATE TABLE IF NOT EXISTS bills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                merchant_name TEXT,
                bill_date TEXT,
                total_amount REAL,
                currency TEXT,
                bill_data TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)


initialize_database()

# --------------------------------------------------
# Data validation
# --------------------------------------------------

class BillData(BaseModel):

    merchant_name: Optional[str] = None
    bill_date: Optional[str] = None

    items: list[dict] = Field(default_factory=list)

    subtotal: Optional[float] = None
    tax: Optional[float] = None
    total_amount: Optional[float] = None

    currency: Optional[str] = None


# --------------------------------------------------
# Home page
# --------------------------------------------------

@app.get("/", response_class=HTMLResponse)
async def home():

    html_path = BASE_DIR / "templates" / "index.html"

    if not html_path.exists():
        raise HTTPException(
            status_code=500,
            detail="index.html not found"
        )

    return html_path.read_text(encoding="utf-8")


# --------------------------------------------------
# Extract bill using Gemini
# --------------------------------------------------

@app.post("/upload")
async def upload_bill(file: UploadFile = File(...)):

    if client is None:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key missing. Check your .env file."
        )

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload an image of a bill."
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty."
        )

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image must be smaller than 10 MB."
        )

    prompt = """
    Extract information from the uploaded bill or receipt.

    Return valid JSON with this structure:

    {
      "merchant_name": null,
      "bill_date": null,
      "items": [
        {
          "item_name": "",
          "quantity": null,
          "price": null
        }
      ],
      "subtotal": null,
      "tax": null,
      "total_amount": null,
      "currency": null
    }

    Rules:
    - Do not invent missing information.
    - Use null for information you cannot read.
    - Preserve the actual values shown on the receipt.
    - Return JSON only.
    """

    try:

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                prompt,
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=file.content_type
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response.")

        extracted = json.loads(response.text)

        return {
            "success": True,
            "filename": file.filename,
            "extracted": extracted
        }

    except Exception as error:

        logger.exception("Gemini extraction failed")

        raise HTTPException(
            status_code=502,
            detail=f"Bill extraction failed: {str(error)}"
        )


# --------------------------------------------------
# Save corrected bill
# --------------------------------------------------

@app.post("/bills")
async def save_bill(bill: BillData):

    bill_data = bill.model_dump()

    with get_connection() as connection:

        cursor = connection.execute(
            """
            INSERT INTO bills (
                merchant_name,
                bill_date,
                total_amount,
                currency,
                bill_data,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                bill.merchant_name,
                bill.bill_date,
                bill.total_amount,
                bill.currency,
                json.dumps(bill_data),
                datetime.now().isoformat()
            )
        )

        bill_id = cursor.lastrowid

    return {
        "success": True,
        "message": "Bill saved successfully.",
        "id": bill_id
    }


# --------------------------------------------------
# Retrieve saved bills
# --------------------------------------------------

@app.get("/bills")
async def get_bills():

    with get_connection() as connection:

        rows = connection.execute(
            "SELECT * FROM bills ORDER BY id DESC"
        ).fetchall()

    bills = []

    for row in rows:

        bills.append({
            "id": row["id"],
            "merchant_name": row["merchant_name"],
            "bill_date": row["bill_date"],
            "total_amount": row["total_amount"],
            "currency": row["currency"],
            "created_at": row["created_at"],
            "data": json.loads(row["bill_data"])
        })

    return bills


# --------------------------------------------------
# Delete saved bill
# --------------------------------------------------

@app.delete("/bills/{bill_id}")
async def delete_bill(bill_id: int):

    with get_connection() as connection:

        cursor = connection.execute(
            "DELETE FROM bills WHERE id = ?",
            (bill_id,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Bill not found."
            )

    return {
        "success": True,
        "message": "Bill deleted successfully."
    }
