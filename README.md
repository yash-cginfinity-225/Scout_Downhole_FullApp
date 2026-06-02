# Scout Data Platform

A web application for managing BHA drilling data with file uploads, data visualization, and admin tools.

## Architecture

```
Scout/
├── Backend/          # FastAPI backend
│   ├── main.py       # Entry point
│   ├── config.py     # Environment configuration
│   ├── database.py   # Databricks connection
│   └── routes/
│       ├── auth.py   # Login endpoint
│       ├── tables.py # Table data CRUD + search + export
│       ├── files.py  # File upload/download/delete
│       └── admin.py  # Lookup table management
├── Frontend/         # Vite + React
│   └── src/
│       ├── atoms/        # Smallest UI elements (Button, Input, Spinner, Badge, EmptyState)
│       ├── molecules/    # Composed elements (SearchBar, DataTable, Pagination, DropZone, FileCard)
│       ├── components/   # Layout, Navbar
│       ├── pages/        # Login, FileUploader, TableView, SubTableView, AdminLookup
│       ├── context/      # AuthContext
│       └── services/     # API service layer
```

## Setup

### Backend

```bash
cd Backend
pip install -r requirements.txt
# Edit .env with your Databricks credentials
python main.py
```

Server runs at http://localhost:8000

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

App runs at http://localhost:5173

## Features

- **Login**: Username/password authentication from Databricks table
- **File Upload**: Drag & drop file upload with file list and download
- **4 Data Tables**: BHA Tally, BHA Report, Extracted Reports, Motor Performance
- **Search**: Full-text search across all table columns
- **Export to Excel**: Download any table/sub-table as .xlsx
- **Sub-Tables**: Nested JSON/array data shown in dedicated view with View button
- **Admin Panel**: Lookup table creation and management (admin only)
- **Responsive**: Works on desktop and tablet screens

## Credentials

- User: `user` / `user`
- Admin: `admin` / `admin` (has access to Admin panel)

## Environment Variables

Edit `Backend/.env`:

```
DATABRICKS_HOST=your-databricks-host
DATABRICKS_HTTP_PATH=your-http-path
DATABRICKS_TOKEN=your-token
```
