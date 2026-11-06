# Bill Snap – AI-Powered Bill Scanner

Bill Snap is an AI-powered bill and receipt scanning application that extracts important information from uploaded bills using Gemini AI. Users can review the extracted information, correct inaccurate values, and save bills for future reference.

The project combines AI-based information extraction with a simple web interface and database storage.

## Features

- Upload bill and receipt images.
- Extract merchant name, bill date, items, subtotal, tax, total amount, and currency using Gemini AI.
- Display extracted information in an editable form.
- Correct inaccurate or missing information before saving.
- Save corrected bills in a SQLite database.
- View previously saved bills.
- Delete saved bills.
- Responsive interface for desktop and mobile browsers.

## Technologies Used

| Technology | Purpose |
|---|---|
| Python | Backend development |
| FastAPI | REST API and application backend |
| HTML | Webpage structure |
| CSS | Styling and responsive design |
| JavaScript | Frontend interaction and API communication |
| Gemini API | AI-based bill information extraction |
| SQLite | Local database storage |
| Uvicorn | Development server |

## Project Structure

```text
Bill-Snap/
│
├── app/
│   ├── main.py
│   │
│   ├── templates/
│   │   └── index.html
│   │
│   ├── static/
│   │   ├── style.css
│   │   └── script.js
│   │
│   └── bills.db
│
├── .env
├── requirements.txt
└── README.md
```

## How It Works

1. The user uploads a bill or receipt image.
2. The frontend sends the image to the FastAPI backend.
3. The backend sends the image to Gemini AI for information extraction.
4. Gemini returns the extracted bill information in JSON format.
5. The application displays the extracted information in editable fields.
6. The user reviews and corrects any inaccurate information.
7. The corrected bill is saved in the SQLite database.
8. Users can view or delete previously saved bills.

## Installation and Setup

### Prerequisites

- Python 3.10 or later
- Visual Studio Code or another code editor
- Google account
- Gemini API key
- Internet connection for AI extraction

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/Bill-Snap.git
```

Navigate to the project directory:

```bash
cd Bill-Snap
```

### 2. Create a Virtual Environment

```bash
python -m venv venv
```

Activate the environment on Windows:

```bash
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure the Gemini API Key

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Replace the placeholder with your actual API key.

Get your API key from:

https://aistudio.google.com/apikey

**Security:** Never upload your `.env` file or API key to GitHub.

### 5. Run the Application

Start the FastAPI development server:

```bash
uvicorn app.main:app --reload
```

Open the application in your browser:

http://127.0.0.1:8000

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Open the Bill Snap application |
| POST | `/upload` | Upload and scan a bill |
| POST | `/bills` | Save corrected bill information |
| GET | `/bills` | Retrieve saved bills |
| DELETE | `/bills/{bill_id}` | Delete a saved bill |

Interactive API documentation is available at:

http://127.0.0.1:8000/docs

## Database

Bill Snap uses SQLite to store corrected bill information.

The database stores:
- Merchant name
- Bill date
- Total amount
- Currency
- Extracted bill data
- Creation timestamp

The database is created automatically when the application starts.

## Future Improvements

- User authentication and account management.
- Add support for PDF bills.
- Export bills to CSV and Excel.
- Add monthly expense summaries.
- Add expense category classification.
- Display spending charts and analytics.
- Deploy the application to a cloud platform.
- Improve validation of extracted bill information.

## Learning Outcomes

Through this project, I explored:

- Building REST APIs using FastAPI.
- Integrating a generative AI API into a Python application.
- Uploading and processing image files.
- Handling JSON responses from AI models.
- Connecting a frontend with a backend using JavaScript Fetch API.
- Implementing database operations using SQLite.
- Building editable forms and responsive web interfaces.
- Handling errors and validating user input.

## Author

**Sreeja Atte**

GitHub: https://github.com/Sreejaatte

## Disclaimer

Bill Snap is a learning and portfolio project. AI-extracted information may contain errors and should be reviewed before saving or using it for financial purposes.
