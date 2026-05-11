# Interactive EDA Platform

A web application for interactive Exploratory Data Analysis (EDA), offering tools for data cleaning, transformation, and visualization directly in the browser.

## Architecture

*   **Backend:** Python 3.10, Django, Django REST Framework. Uses SQLite for local development and JWT for authentication.
*   **Frontend:** Vue 3, Pinia, Vite. Employs ECharts for visualization and PapaParse/HyParquet for client-side parsing.
*   **Storage:** LocalForage for client-side data persistence, reducing server load for large datasets.

## Key Features

*   **Client-Side Processing:** Datasets are processed and analyzed on the frontend (Vue + Pinia) to ensure fast interactions and reduce server overhead.
*   **Data Cleaning:** UI tools to drop nulls, fill missing values (mean, median, mode), and remove duplicates.
*   **Transformations:** Normalization (MinMax, Z-Score), clipping, column encoding (Label, One-Hot), and target variable extraction.
*   **Outlier Detection:** Automated detection using IQR and Z-Score methods.
*   **Visualizations:** Auto-generated correlation matrices, scatter plots, distributions, and boxplots using ECharts.
*   **Offline Mode / Local Uploads:** Unauthenticated users can use local browser storage for sessions. Registration syncs the data to the server.
*   **Version Control:** Save and restore points of dataset transformations.

## Setup & Installation

### Option 1: Docker

The project includes a `docker-compose.yml` file to quickly spin up both the frontend and backend.

```bash
docker-compose up --build
```
*   Frontend will be available at: http://localhost:80
*   Backend API will be available at: http://localhost:8000

### Option 2: Local Development

#### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Supported Formats

*   **CSV:** Full support.
*   **JSON:** Supports array of objects and DataFrame-like structures (where keys are columns and values are arrays).
*   **Parquet:** Supported via `hyparquet` on the client side.

*Note: Excel (.xlsx) support is deliberately excluded to maintain parsing consistency, as data science tasks typically rely on tabular flat files rather than multi-sheet formats.*
